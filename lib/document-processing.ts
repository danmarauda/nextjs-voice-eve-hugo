import "server-only";
import { documentExtension, MAX_DOCUMENT_BYTES, MAX_DOCUMENT_CHARACTERS, normalizeDocumentText } from "./documents";

export async function extractDocument(file: File): Promise<{ format: "pdf" | "txt" | "md" | "csv" | "json"; content: string }> {
  if (!file.size || file.size > MAX_DOCUMENT_BYTES) throw new Error("Choose a non-empty file smaller than 4 MB.");
  const format = documentExtension(file.name);
  if (format !== "pdf" && format !== "txt" && format !== "md" && format !== "csv" && format !== "json") {
    throw new Error("Supported formats: PDF, TXT, Markdown, CSV, and JSON. Export Word documents to PDF first.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  let content: string;
  if (format === "pdf") {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("This file is not a valid PDF.");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes, isEvalSupported: false, verbosity: 0 });
    try {
      const info = await parser.getInfo();
      if (info.total > 150) throw new Error("PDF exceeds 150 pages. Split it into smaller documents.");
      const pages: string[] = [];
      let characters = 0;
      let hasText = false;
      for (let page = 1; page <= info.total; page++) {
        const result = await parser.getText({ partial: [page] });
        const text = result.pages.map((item) => item.text).join("\n").trim();
        hasText ||= text.length > 0;
        const section = `[Page ${page}]\n${text || "[No extractable text on this page; OCR may be required.]"}`;
        characters += section.length + 2;
        if (characters > MAX_DOCUMENT_CHARACTERS) throw new Error("Document exceeds 100,000 characters. Split it into smaller documents.");
        pages.push(section);
      }
      if (!hasText) throw new Error("No readable text found. Scanned PDFs need OCR before uploading.");
      content = pages.join("\n\n");
    } finally {
      await parser.destroy();
    }
  } else {
    try {
      content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw new Error("Text files must use UTF-8 encoding.");
    }
    if (content.includes("\u0000")) throw new Error("This appears to be a binary file, not a text document.");
    if (format === "json") {
      try { JSON.parse(content); } catch { throw new Error("This file contains invalid JSON."); }
    }
  }
  return { format, content: normalizeDocumentText(content) };
}
