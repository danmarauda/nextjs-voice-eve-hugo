/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => Promise.all([
    ctx.db.insert("users", { role: "user", status: "active", createdAt: 1, updatedAt: 1, lastSeenAt: 1 }),
    ctx.db.insert("users", { role: "admin", status: "active", createdAt: 1, updatedAt: 1, lastSeenAt: 1 }),
    ctx.db.insert("users", { role: "user", status: "disabled", createdAt: 1, updatedAt: 1, lastSeenAt: 1 }),
  ]));
  return { t, owner: t.withIdentity({ subject: ids[0] }), other: t.withIdentity({ subject: ids[1] }), disabled: t.withIdentity({ subject: ids[2] }) };
}

const source = { title: "Tender.md", content: "Submission deadline is 30 November. Insurance is mandatory.", kind: "source" as const, format: "md" as const };
const paginationOpts = { numItems: 20, cursor: null };

describe("private document workspace", () => {
  test("persists extracted text separately from metadata and supports bounded reads", async () => {
    const { owner } = await setup();
    const id = await owner.mutation(api.documents.create, source);
    const list = await owner.query(api.documents.list, { paginationOpts });
    expect(list.page).toHaveLength(1);
    expect(list.page[0]).not.toHaveProperty("content");
    const first = await owner.query(api.documents.read, { documentId: id, limit: 12 });
    expect(first.content).toBe(source.content.slice(0, 12));
    expect(first.nextOffset).toBe(12);
    const rest = await owner.query(api.documents.read, { documentId: id, offset: first.nextOffset! });
    expect(first.content + rest.content).toBe(source.content);
    expect(rest.nextOffset).toBeNull();
  });

  test("denies guests, disabled users, and cross-user reads, deletes, and source references", async () => {
    const { t, owner, other, disabled } = await setup();
    const id = await owner.mutation(api.documents.create, source);
    for (const client of [t, disabled]) {
      await expect(client.query(api.documents.list, { paginationOpts })).rejects.toThrow();
      await expect(client.query(api.documents.search, { query: "deadline" })).rejects.toThrow();
      await expect(client.query(api.documents.read, { documentId: id })).rejects.toThrow();
      await expect(client.mutation(api.documents.create, source)).rejects.toThrow();
      await expect(client.mutation(api.documents.remove, { documentId: id })).rejects.toThrow();
    }
    expect((await other.query(api.documents.list, { paginationOpts })).page).toEqual([]);
    expect(await other.query(api.documents.search, { query: "deadline" })).toEqual([]);
    await expect(other.query(api.documents.read, { documentId: id })).rejects.toThrow("Document not found");
    await expect(other.mutation(api.documents.remove, { documentId: id })).rejects.toThrow("Document not found");
    await expect(other.mutation(api.documents.create, { ...source, kind: "draft", sourceDocumentIds: [id] })).rejects.toThrow("Document not found");
  });

  test("searches source content, creates a referenced draft, and deletes text from search", async () => {
    const { owner } = await setup();
    const id = await owner.mutation(api.documents.create, source);
    const matches = await owner.query(api.documents.search, { query: "insurance" });
    expect(matches[0]?.document._id).toBe(id);
    expect(matches[0]?.excerpt).toContain("Insurance");
    const draftId = await owner.mutation(api.documents.create, { title: "Checklist", content: "Review the insurance requirement.", kind: "draft", format: "md", sourceDocumentIds: [id] });
    expect((await owner.query(api.documents.read, { documentId: draftId })).document.sourceDocumentIds).toEqual([id]);
    await owner.mutation(api.documents.remove, { documentId: id });
    await expect(owner.query(api.documents.read, { documentId: id })).rejects.toThrow("Document not found");
    expect(await owner.query(api.documents.search, { query: "November" })).toEqual([]);
  });

  test("enforces text, pagination, and range limits at the backend boundary", async () => {
    const { owner } = await setup();
    await expect(owner.mutation(api.documents.create, { ...source, content: " " })).rejects.toThrow("No readable text");
    await expect(owner.mutation(api.documents.create, { ...source, content: "a".repeat(100_001) })).rejects.toThrow("100,000");
    await expect(owner.mutation(api.documents.create, { ...source, title: " " })).rejects.toThrow("title");
    const id = await owner.mutation(api.documents.create, source);
    await expect(owner.query(api.documents.read, { documentId: id, offset: -1 })).rejects.toThrow("Invalid document range");
    await expect(owner.query(api.documents.read, { documentId: id, limit: 12_001 })).rejects.toThrow("Invalid document range");
    await expect(owner.query(api.documents.list, { paginationOpts: { numItems: 999, cursor: null } })).rejects.toThrow("1–30");
    await expect(owner.query(api.documents.search, { query: "word ".repeat(13) })).rejects.toThrow("1–12");
  });
});
