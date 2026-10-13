import { NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { authToken, fetchMutation, fetchQuery } from "@/lib/convex-server";
import { extractDocument } from "@/lib/document-processing";
import { MAX_DOCUMENT_BYTES, validateDocumentTitle } from "@/lib/documents";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const token = await authToken();
  if (!token) return NextResponse.json({ error: "Sign in to upload documents." }, { status: 401 });
  const user = await fetchQuery(api.users.currentUser, {}, { token });
  if (!user || user.status !== "active") return NextResponse.json({ error: "Access denied." }, { status: 403 });
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Cross-site uploads are not allowed." }, { status: 403 });
  }
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 415 });
  }
  const limit = rateLimit(`document-upload:${user._id}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many uploads. Try again shortly." }, {
    status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) },
  });
  const maximumBodyBytes = MAX_DOCUMENT_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > maximumBodyBytes) {
    return NextResponse.json({ error: "File exceeds the 4 MB limit." }, { status: 413 });
  }
  const reader = request.body?.getReader();
  if (!reader) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  try {
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBodyBytes) {
        await reader.cancel();
        return NextResponse.json({ error: "File exceeds the 4 MB limit." }, { status: 413 });
      }
      chunks.push(new Uint8Array(value));
    }
    const form = await new Response(new Blob(chunks), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a document to upload." }, { status: 400 });
    const title = validateDocumentTitle(file.name);
    let extracted: Awaited<ReturnType<typeof extractDocument>>;
    try {
      extracted = await extractDocument(file);
    } catch (error) {
      const known = error instanceof Error && /^(Choose|Supported|This file|Text files|This appears|Document exceeds|PDF exceeds|No readable)/.test(error.message);
      return NextResponse.json({ error: known ? (error as Error).message : "Could not extract text. Check that the PDF is readable and not password-protected." }, { status: 422 });
    }
    const documentId = await fetchMutation(api.documents.create, {
      title, ...extracted, kind: "source",
    }, { token });
    return NextResponse.json({ documentId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Document could not be saved. Check your workspace capacity and try again." }, { status: 400 });
  } finally {
    reader.releaseLock();
  }
}
