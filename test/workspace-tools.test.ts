import { beforeEach, describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("convex/nextjs", () => ({ fetchQuery: vi.fn(), fetchMutation: vi.fn() }));
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { buildHugoTools } from "@/agent/hugo/tools";
import { USER_TOOLS } from "@/agent/hugo/tools/registry";

const token = "test-token";
async function execute(name: string, input: unknown) {
  const tool = buildHugoTools({ token })[name];
  if (!tool?.execute) throw new Error("Tool not found");
  return await tool.execute(input as never, { toolCallId: "call-test", messages: [], context: undefined });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(fetchMutation).mockResolvedValue("ledger-id");
});

describe("workspace agent tools", () => {
  test("registry and executable tool names match", () => {
    expect(Object.keys(buildHugoTools({ token })).sort()).toEqual(USER_TOOLS.map((tool) => tool.name).sort());
  });
  test("passes the user token and paginates metadata without document text", async () => {
    vi.mocked(fetchQuery).mockResolvedValue({ page: [{ _id: "doc-id", title: "Tender", kind: "source", format: "pdf", characterCount: 12 }], isDone: false, continueCursor: "next" });
    expect(await execute("listWorkspaceDocuments", { cursor: null })).toMatchObject({ nextCursor: "next" });
    expect(fetchQuery).toHaveBeenCalledWith(api.documents.list, { paginationOpts: { numItems: 20, cursor: null } }, { token });
  });
  test("returns source text to the agent but redacts all workspace input and output from the ledger", async () => {
    vi.mocked(fetchQuery).mockResolvedValue({ document: { title: "Private tender", kind: "source" }, content: "CONFIDENTIAL PRICE", offset: 0, nextOffset: null, totalCharacters: 18 });
    expect(await execute("readWorkspaceDocument", { documentId: "doc-id", offset: 0 })).toMatchObject({ content: "CONFIDENTIAL PRICE" });
    expect(JSON.stringify(vi.mocked(fetchMutation).mock.calls)).not.toContain("CONFIDENTIAL PRICE");
    expect(JSON.stringify(vi.mocked(fetchMutation).mock.calls)).not.toContain("Private tender");
  });
  test("saves only a new draft with source references", async () => {
    const input = { title: "Bid checklist", content: "Review the deadline.", sourceDocumentIds: ["source-id"] };
    await execute("createWorkspaceDraft", input);
    expect(fetchMutation).toHaveBeenCalledWith(api.documents.create, { ...input, kind: "draft", format: "md" }, { token });
  });
  test("does not log source-bearing backend errors", async () => {
    vi.mocked(fetchQuery).mockRejectedValue(new Error("Invalid document: PRIVATE TEXT"));
    await execute("readWorkspaceDocument", { documentId: "doc-id", offset: 0 });
    expect(JSON.stringify(vi.mocked(fetchMutation).mock.calls)).not.toContain("PRIVATE TEXT");
  });
});
