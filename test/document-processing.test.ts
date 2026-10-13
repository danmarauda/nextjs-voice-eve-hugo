// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { extractDocument } from "@/lib/document-processing";
import { MAX_DOCUMENT_BYTES } from "@/lib/documents";

function pdfFile(text?: string) {
  const stream = text ? `BT /F1 12 Tf 72 720 Td (${text}) Tj ET` : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new File([pdf], "Tender.pdf", { type: "application/pdf" });
}

describe("document text extraction", () => {
  test("extracts real PDF text with page references", async () => {
    const result = await extractDocument(pdfFile("Submission deadline November 30"));
    expect(result.format).toBe("pdf");
    expect(result.content).toContain("[Page 1]");
    expect(result.content).toContain("Submission deadline November 30");
  });
  test("rejects PDFs without readable text rather than saving page labels", async () => {
    await expect(extractDocument(pdfFile())).rejects.toThrow("OCR");
  });
  test("normalizes text, preserves structured text, and never renders HTML", async () => {
    expect(await extractDocument(new File(["# Bid\r\n<script>alert(1)</script>"], "bid.md"))).toEqual({ format: "md", content: "# Bid\n<script>alert(1)</script>" });
    expect((await extractDocument(new File(['{"deadline":"Nov 30"}'], "bid.json"))).content).toContain("Nov 30");
  });
  test("rejects unsupported, malformed, binary, empty, and oversized files", async () => {
    await expect(extractDocument(new File(["Word"], "bid.docx"))).rejects.toThrow("Supported formats");
    await expect(extractDocument(new File(["not pdf"], "bid.pdf"))).rejects.toThrow("valid PDF");
    await expect(extractDocument(new File(["no"], "bid.json"))).rejects.toThrow("invalid JSON");
    await expect(extractDocument(new File(["\u0000"], "bid.txt"))).rejects.toThrow("binary");
    await expect(extractDocument(new File([new Uint8Array([255])], "bid.txt"))).rejects.toThrow("UTF-8");
    await expect(extractDocument(new File([" "], "bid.txt"))).rejects.toThrow("No readable text");
    await expect(extractDocument(new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], "bid.txt"))).rejects.toThrow("4 MB");
  });
});
