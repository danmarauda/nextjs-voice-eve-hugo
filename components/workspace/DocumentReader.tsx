"use client";

import { useState } from "react";
import Link from "next/link";
import { useConvex, useMutation, useQuery } from "convex/react";
import { Download, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthTransition } from "@/components/providers/ConvexClientProvider";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { DOCUMENT_CHUNK_SIZE } from "@/lib/documents";

export function DocumentReader({ documentId, onClose }: { documentId: Id<"documents">; onClose: () => void }) {
  const { canRunProtectedQueries } = useAuthTransition();
  const [offset, setOffset] = useState(0);
  const data = useQuery(api.documents.read, canRunProtectedQueries ? { documentId, offset } : "skip");
  const convex = useConvex();
  const remove = useMutation(api.documents.remove);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const chunks: string[] = [];
      let nextOffset: number | null = 0;
      do {
        const chunk: { content: string; nextOffset: number | null } = await convex.query(api.documents.read, { documentId, offset: nextOffset });
        chunks.push(chunk.content);
        nextOffset = chunk.nextOffset;
      } while (nextOffset !== null);
      const url = URL.createObjectURL(new Blob(chunks, { type: "text/plain;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${data.document.title.replace(/[^\p{L}\p{N}._ -]/gu, "_")}.txt`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("Could not download document text. Please try again.");
    } finally { setBusy(false); }
  }

  async function deleteDocument() {
    setBusy(true);
    setError("");
    // Unmount the subscription before deleting its target.
    onClose();
    try {
      await remove({ documentId });
    } catch {
      const { toast } = await import("sonner");
      toast.error("Could not remove document. Please try again.");
    }
  }

  return (
    <section className="min-w-0 rounded-xl border border-border bg-surface p-5 text-text-primary" aria-label="Document reader">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 break-words text-lg font-medium">{data?.document.title ?? "Loading document…"}</h2>
          <Button variant="ghost" className="min-h-11 min-w-11 shrink-0" aria-label="Close document" onPress={onClose}><X aria-hidden className="size-4" /></Button>
        </div>
        {data ? <>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/chat?document=${documentId}`} className={`${buttonVariants({ variant: "primary" })} min-h-11`}>Ask agent about this</Link>
            <Button variant="outline" disabled={busy} className="min-h-11" onPress={() => void download()}><Download aria-hidden className="size-4" /> Export text</Button>
          </div>
          <p className="break-all font-mono text-sm text-text-muted">Reference: {documentId}</p>
          {data.document.kind === "draft" ? <p className="text-sm leading-relaxed text-text-secondary">Working draft — review before use. Source references: {data.document.sourceDocumentIds.length || "none"}.</p> : null}
          <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background p-4 font-sans text-sm leading-relaxed text-text-secondary" tabIndex={0} aria-label="Extracted document text">{data.content}</pre>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-text-muted">Characters {data.offset + 1}–{data.offset + data.content.length} of {data.totalCharacters}</p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="min-h-11" disabled={offset === 0} onPress={() => setOffset(Math.max(0, offset - DOCUMENT_CHUNK_SIZE))}>Previous</Button>
              <Button variant="ghost" className="min-h-11" disabled={data.nextOffset === null} onPress={() => { if (data.nextOffset !== null) setOffset(data.nextOffset); }}>Next</Button>
            </div>
          </div>
          {confirmRemove ? <div className="flex flex-col gap-3" role="group" aria-label="Confirm document removal">
            <p className="text-sm leading-relaxed text-text-secondary">Permanently remove this document and its text? Existing drafts and conversation responses are not deleted.</p>
            <div className="flex flex-wrap items-center gap-2"><Button variant="destructive" className="min-h-11" disabled={busy} onPress={() => void deleteDocument()}>Remove permanently</Button><Button variant="ghost" className="min-h-11" onPress={() => setConfirmRemove(false)}>Cancel</Button></div>
          </div> : <Button variant="ghost" className="min-h-11 self-start text-error" disabled={busy} onPress={() => setConfirmRemove(true)}>Remove document</Button>}
        </> : <p role="status" className="text-sm text-text-muted">Retrieving extracted text…</p>}
        {error ? <p role="alert" className="text-sm text-error">{error}</p> : null}
      </div>
    </section>
  );
}
