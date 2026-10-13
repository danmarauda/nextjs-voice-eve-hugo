export const MAX_DOCUMENT_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENT_CHARACTERS = 100_000;
export const DOCUMENT_CHUNK_SIZE = 12_000;
export const MAX_WORKSPACE_DOCUMENTS = 150;
export const DOCUMENT_ACCEPT = ".pdf,.txt,.md,.csv,.json";

export function documentExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function normalizeDocumentText(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").replace(/\u0000/g, "").trim();
  if (!normalized) throw new Error("No readable text found. Scanned PDFs need OCR before uploading.");
  if (normalized.length > MAX_DOCUMENT_CHARACTERS) {
    throw new Error("Document exceeds 100,000 characters. Split it into smaller documents.");
  }
  return normalized;
}

export function validateDocumentTitle(title: string): string {
  const normalized = title.trim();
  if (!normalized || normalized.length > 180) {
    throw new Error("Document title must contain 1–180 characters.");
  }
  return normalized;
}

export function validateDocumentSearch(query: string): string {
  const normalized = query.trim();
  if (!normalized || normalized.length > 120 || normalized.split(/\s+/).length > 12) {
    throw new Error("Search with 1–12 words and no more than 120 characters.");
  }
  return normalized;
}

export function readDocumentChunk(text: string, offset = 0, limit = DOCUMENT_CHUNK_SIZE) {
  if (!Number.isInteger(offset) || offset < 0 || offset > text.length ||
      !Number.isInteger(limit) || limit < 1 || limit > DOCUMENT_CHUNK_SIZE) {
    throw new Error("Invalid document range.");
  }
  const end = Math.min(offset + limit, text.length);
  return {
    content: text.slice(offset, end),
    offset,
    nextOffset: end < text.length ? end : null,
    totalCharacters: text.length,
  };
}
