"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { ArrowUpRight, FileText, FolderOpen, Loader2, Search, Upload } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuthTransition } from "@/components/providers/ConvexClientProvider";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES, validateDocumentSearch } from "@/lib/documents";
import { DocumentReader } from "./DocumentReader";

export function DocumentWorkspace() {
  const { canRunProtectedQueries } = useAuthTransition();
  const { results, status, loadMore } = usePaginatedQuery(api.documents.list,
    canRunProtectedQueries ? {} : "skip", { initialNumItems: 20 });
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const matches = useQuery(api.documents.search, canRunProtectedQueries && search ? { query: search } : "skip");
  const [selected, setSelected] = useState<Id<"documents"> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadLock = useRef(false);
  const documents = search ? matches?.map((match) => match.document) : results;
  const loading = search ? matches === undefined : status === "LoadingFirstPage";

  async function upload(file?: File) {
    if (!file || uploadLock.current) return;
    setError("");
    setNotice("");
    if (!file.size || file.size > MAX_DOCUMENT_BYTES) {
      setError("Choose a non-empty file smaller than 4 MB.");
      return;
    }
    uploadLock.current = true;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/workspace/documents", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed. Please try again.");
      setSearch("");
      setSearchInput("");
      setSelected(result.documentId as Id<"documents">);
      setNotice(`${file.name} is ready for the agent.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      uploadLock.current = false;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    try {
      const next = searchInput.trim() ? validateDocumentSearch(searchInput) : "";
      setSearch(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid search.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-sm uppercase tracking-widest text-hugo-cyan">ALIAS BDO / workspace</p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-text-primary">From brief to bid.</h1>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-text-secondary">Your source documents and working drafts, connected to your agent.</p>
        </div>
        <Link href="/chat" className={`${buttonVariants({ variant: "outline" })} min-h-11 shrink-0`}>
          Open agent <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      </header>

      <section className="rounded-xl border border-dashed border-border-strong bg-surface p-5 text-text-primary" aria-label="Upload a document">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Upload aria-hidden className="size-5 shrink-0 text-hugo-cyan" />
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-medium">Add a source document</h2>
              <p className="text-sm leading-relaxed text-text-secondary">PDF, TXT, Markdown, CSV, or JSON. Up to 4 MB, 150 pages, and 100,000 characters.</p>
              <p className="text-sm leading-relaxed text-text-muted">Extracted text is saved privately. Original files, images, and formatting are not retained. Scanned pages need OCR.</p>
            </div>
          </div>
          <input ref={inputRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" aria-label="Choose source document" onChange={(event) => void upload(event.target.files?.[0])} />
          <Button className="min-h-11 shrink-0" disabled={uploading || !canRunProtectedQueries} onPress={() => inputRef.current?.click()}>
            {uploading ? <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" /> : <Upload aria-hidden className="size-4" />}
            {uploading ? "Processing document…" : "Upload document"}
          </Button>
        </div>
      </section>
      {error ? <p role="alert" className="text-sm leading-relaxed text-error">{error}</p> : null}
      <p role="status" className={notice ? "text-sm text-hugo-cyan" : "sr-only"}>{notice}</p>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="flex min-w-0 flex-col gap-4" aria-label="Workspace documents">
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <label htmlFor="document-search" className="sr-only">Search document contents</label>
            <input id="document-search" type="search" value={searchInput} maxLength={120} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.nativeEvent.isComposing || event.keyCode === 229)) event.preventDefault(); }} placeholder="Search document contents…" className="min-h-11 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-base text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-hugo-cyan" />
            <Button type="submit" variant="outline" className="min-h-11 min-w-11" aria-label="Search documents"><Search aria-hidden className="size-4" /></Button>
          </form>
          {search ? <div className="flex items-center justify-between gap-2"><p className="text-sm text-text-secondary">Up to 20 matches</p><Button variant="ghost" className="min-h-11" onPress={() => { setSearch(""); setSearchInput(""); }}>Clear search</Button></div> : null}
          {loading ? <p role="status" className="text-sm text-text-muted">Loading documents…</p> : documents?.length ? (
            <ul className="flex flex-col gap-2">
              {documents.map((document) => (
                <li key={document._id}>
                  <button type="button" aria-pressed={selected === document._id} onClick={() => setSelected(document._id)} className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-hugo-cyan ${selected === document._id ? "border-hugo-cyan/50 bg-hugo-cyan/5 text-text-primary" : "border-border bg-surface text-text-primary hover:border-border-strong"}`}>
                    <FileText aria-hidden className="size-5 shrink-0 text-hugo-cyan" />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="break-words text-base font-medium">{document.title}</span>
                      <span className="text-sm text-text-secondary">{document.kind === "draft" ? "Working draft" : "Source"} · {document.format.toUpperCase()} · {document.characterCount.toLocaleString()} characters</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-8 text-center text-text-primary">
              <div className="flex flex-col items-center gap-3">
                <FolderOpen aria-hidden className="size-8 text-text-muted" />
                <h2 className="text-lg font-medium">{search ? "No matching documents" : "A workspace for your next bid"}</h2>
                <p className="text-sm leading-relaxed text-text-secondary">{search ? "Try a shorter keyword from the document text." : "Upload a brief or tender, then ask the agent to identify requirements, compare sources, or save a bid draft here."}</p>
              </div>
            </div>
          )}
          {!search && status === "CanLoadMore" ? <Button variant="outline" className="min-h-11" onPress={() => loadMore(20)}>Load more documents</Button> : null}
          {!search && status === "LoadingMore" ? <p role="status" className="text-sm text-text-muted">Loading more…</p> : null}
        </section>
        {selected ? <DocumentReader key={selected} documentId={selected} onClose={() => setSelected(null)} /> : (
          <aside className="rounded-xl border border-border bg-surface p-6 text-text-primary">
            <div className="flex flex-col gap-4">
              <h2 className="text-lg font-medium">Work with your documents</h2>
              <p className="text-base leading-relaxed text-text-secondary">Select a document to inspect its extracted text. Your agent can search and read sources without loading every file into the conversation.</p>
              <ul className="flex flex-col gap-3 text-sm leading-relaxed text-text-secondary">
                <li>“Find the submission deadline and cite the source.”</li>
                <li>“Compare the tender requirements with our response.”</li>
                <li>“Save a compliance checklist as a working draft.”</li>
              </ul>
              <p className="text-sm leading-relaxed text-text-muted">Drafts need human review. Nothing is submitted or sent externally.</p>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
