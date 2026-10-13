import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireUser } from "./model/authz";
import {
  MAX_WORKSPACE_DOCUMENTS,
  normalizeDocumentText,
  readDocumentChunk,
  validateDocumentSearch,
  validateDocumentTitle,
} from "../lib/documents";

const documentValidator = v.object({
  _id: v.id("documents"),
  _creationTime: v.number(),
  userId: v.id("users"),
  title: v.string(),
  kind: v.union(v.literal("source"), v.literal("draft")),
  format: v.union(v.literal("pdf"), v.literal("txt"), v.literal("md"), v.literal("csv"), v.literal("json")),
  characterCount: v.number(),
  sourceDocumentIds: v.array(v.id("documents")),
  createdAt: v.number(),
});

async function ownDocument(ctx: QueryCtx, documentId: Id<"documents">, userId: Id<"users">) {
  const document = await ctx.db.get(documentId);
  // Do not reveal whether another user's document exists, even to an admin agent.
  if (!document || document.userId !== userId) throw new Error("Document not found.");
  return document;
}

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(documentValidator), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, { paginationOpts }) => {
    const user = await requireUser(ctx);
    if (!Number.isInteger(paginationOpts.numItems) || paginationOpts.numItems < 1 || paginationOpts.numItems > 30) {
      throw new Error("Request 1–30 documents at a time.");
    }
    const result = await ctx.db.query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc").paginate(paginationOpts);
    return { page: result.page, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const read = query({
  args: { documentId: v.id("documents"), offset: v.optional(v.number()), limit: v.optional(v.number()) },
  returns: v.object({
    document: documentValidator, content: v.string(), offset: v.number(),
    nextOffset: v.union(v.number(), v.null()), totalCharacters: v.number(),
  }),
  handler: async (ctx, { documentId, offset, limit }) => {
    const user = await requireUser(ctx);
    const document = await ownDocument(ctx, documentId, user._id);
    const contents = await ctx.db.query("documentContents")
      .withIndex("by_document", (q) => q.eq("documentId", documentId)).unique();
    if (!contents || contents.userId !== user._id) throw new Error("Document text unavailable.");
    return { document, ...readDocumentChunk(contents.content, offset, limit) };
  },
});

export const search = query({
  args: { query: v.string() },
  returns: v.array(v.object({ document: documentValidator, excerpt: v.string(), offset: v.number() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const queryText = validateDocumentSearch(args.query);
    const matches = await ctx.db.query("documentContents")
      .withSearchIndex("search_content", (q) => q.search("content", queryText).eq("userId", user._id))
      .take(20);
    return await Promise.all(matches.map(async (match) => {
      const document = await ownDocument(ctx, match.documentId, user._id);
      const firstTerm = queryText.split(/\s+/)[0].toLowerCase();
      const offset = Math.max(0, match.content.toLowerCase().indexOf(firstTerm) - 100);
      return { document, excerpt: match.content.slice(offset, offset + 600), offset };
    }));
  },
});

export const create = mutation({
  args: {
    title: v.string(), content: v.string(),
    kind: v.union(v.literal("source"), v.literal("draft")),
    format: v.union(v.literal("pdf"), v.literal("txt"), v.literal("md"), v.literal("csv"), v.literal("json")),
    sourceDocumentIds: v.optional(v.array(v.id("documents"))),
  },
  returns: v.id("documents"),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const title = validateDocumentTitle(args.title);
    const content = normalizeDocumentText(args.content);
    const sourceDocumentIds = [...new Set(args.sourceDocumentIds ?? [])];
    if (sourceDocumentIds.length > 10) throw new Error("Use no more than 10 source documents per draft.");
    for (const id of sourceDocumentIds) await ownDocument(ctx, id, user._id);
    const existing = await ctx.db.query("documents")
      .withIndex("by_user", (q) => q.eq("userId", user._id)).take(MAX_WORKSPACE_DOCUMENTS);
    if (existing.length >= MAX_WORKSPACE_DOCUMENTS) throw new Error("Workspace is full. Remove a document before adding another.");
    const documentId = await ctx.db.insert("documents", {
      userId: user._id, title, kind: args.kind, format: args.format,
      characterCount: content.length, sourceDocumentIds, createdAt: Date.now(),
    });
    await ctx.db.insert("documentContents", { userId: user._id, documentId, content });
    return documentId;
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  returns: v.null(),
  handler: async (ctx, { documentId }) => {
    const user = await requireUser(ctx);
    await ownDocument(ctx, documentId, user._id);
    const contents = await ctx.db.query("documentContents")
      .withIndex("by_document", (q) => q.eq("documentId", documentId)).unique();
    if (contents) await ctx.db.delete(contents._id);
    await ctx.db.delete(documentId);
    return null;
  },
});
