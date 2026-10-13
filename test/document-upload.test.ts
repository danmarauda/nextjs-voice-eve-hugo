// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/convex-server", () => ({ authToken: vi.fn(), fetchQuery: vi.fn(), fetchMutation: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: vi.fn() }));
import { POST } from "@/app/api/workspace/documents/route";
import { authToken, fetchQuery, fetchMutation } from "@/lib/convex-server";
import { rateLimit } from "@/lib/rate-limit";
import { api } from "@/convex/_generated/api";
import { MAX_DOCUMENT_BYTES } from "@/lib/documents";

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authToken).mockResolvedValue("user-token");
  vi.mocked(fetchQuery).mockResolvedValue({ _id: "user-id", status: "active" });
  vi.mocked(fetchMutation).mockResolvedValue("document-id");
  vi.mocked(rateLimit).mockReturnValue({ ok: true, retryAfterMs: 0 });
});

function upload(name = "Tender.md", content = "Submission due November 30", headers?: HeadersInit) {
  const body = new FormData();
  body.set("file", new File([content], name));
  return new Request("http://localhost/api/workspace/documents", { method: "POST", body, headers });
}

describe("document upload endpoint", () => {
  test("extracts and persists only text with the authenticated token", async () => {
    const response = await POST(upload());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ documentId: "document-id" });
    expect(fetchMutation).toHaveBeenCalledWith(api.documents.create, { title: "Tender.md", content: "Submission due November 30", format: "md", kind: "source" }, { token: "user-token" });
  });
  test("rejects guests before reading uploads", async () => {
    vi.mocked(authToken).mockResolvedValue(undefined);
    expect((await POST(upload())).status).toBe(401);
    expect(fetchMutation).not.toHaveBeenCalled();
  });
  test("rejects disabled accounts and cross-site requests", async () => {
    vi.mocked(fetchQuery).mockResolvedValue({ status: "disabled" });
    expect((await POST(upload())).status).toBe(403);
    vi.mocked(fetchQuery).mockResolvedValue({ _id: "user-id", status: "active" });
    expect((await POST(upload("bid.txt", "text", { "sec-fetch-site": "cross-site" }))).status).toBe(403);
    expect(fetchMutation).not.toHaveBeenCalled();
  });
  test("bounds streamed request bytes without relying on content-length", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_DOCUMENT_BYTES + 65 * 1024)); controller.close(); } });
    const request = new Request("http://localhost/api/workspace/documents", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" }, body, duplex: "half" } as RequestInit);
    expect((await POST(request)).status).toBe(413);
    expect(fetchMutation).not.toHaveBeenCalled();
  });
  test("returns processing failures without saving a document", async () => {
    const response = await POST(upload("scan.pdf", "not PDF"));
    expect(response.status).toBe(422);
    expect(fetchMutation).not.toHaveBeenCalled();
  });
  test("throttles repeated processing attempts", async () => {
    vi.mocked(rateLimit).mockReturnValue({ ok: false, retryAfterMs: 2000 });
    const response = await POST(upload());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("2");
    expect(fetchMutation).not.toHaveBeenCalled();
  });
});
