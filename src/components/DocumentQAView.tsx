"use client";

import React, { useState } from "react";
import { parseApiResponse } from "@/lib/api-response";
import { Send, Loader2, Quote, AlertTriangle, FileSearch } from "lucide-react";
import type { DocumentRecord, QACitation } from "@/types/kashfara";

interface DocumentQAViewProps {
  documents: Array<{ id: string; filename: string; classification?: { document_type: string } }>;
  activeDoc: DocumentRecord | null;
  onSelectDocument: (docId: string) => void;
  onDocumentUpdated: (doc: DocumentRecord) => void;
}

const SUGGESTED_QUESTIONS = [
  "What are the key dates, reference numbers, and parties in this document?",
  "Summarize all monetary amounts and totals with their exact page citations.",
  "Are there any stamps, signatures, or empty/unfilled sections?",
];

export function DocumentQAView({
  documents,
  activeDoc,
  onSelectDocument,
  onDocumentUpdated,
}: DocumentQAViewProps) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<QACitation | null>(null);

  async function askQuestion(qText: string) {
    if (!activeDoc || !qText.trim()) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: qText, document: activeDoc }),
      });
      const json = await parseApiResponse(res);
      if (!res.ok) throw new Error(json.error || "Q&A request failed.");
      onDocumentUpdated({
        ...activeDoc,
        qa_history: json.qa_history,
      });
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Q&A failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lg:h-[calc(100vh-6.5rem)] grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-6xl mx-auto">
      {/* Left: Chat & Document Selector */}
      <div className="lg:col-span-7 apple-card rounded-2xl flex flex-col min-h-[420px] lg:min-h-0 overflow-hidden">
        <div className="p-3.5 border-b border-black/8 bg-white flex items-center justify-between gap-3">
          <span className="text-xs font-mono uppercase text-black font-semibold">
            Document Q&amp;A
          </span>
          <select
            value={activeDoc?.id || ""}
            onChange={(e) => e.target.value && onSelectDocument(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-xs text-black max-w-xs"
          >
            <option value="">Select a document...</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename} ({d.classification?.document_type || "Document"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F5F7]/50">
          {!activeDoc ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#6E6E73] text-sm py-12">
              <FileSearch className="w-8 h-8 text-black/40 mb-2" />
              Select a document above to ask grounded questions.
            </div>
          ) : (
            <>
              {activeDoc.qa_history.length === 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-[#6E6E73]">Suggested Questions</div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((sq, i) => (
                      <button
                        key={i}
                        onClick={() => void askQuestion(sq)}
                        disabled={busy}
                        className="text-left text-xs px-3.5 py-2 rounded-2xl bg-white hover:bg-black hover:text-white border border-black/10 text-black transition-colors"
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeDoc.qa_history.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-2xl text-sm space-y-2 ${
                    msg.role === "user"
                      ? "bg-black text-white ml-8"
                      : "bg-white border border-black/10 text-black mr-4"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between text-[10px] font-mono ${
                      msg.role === "user" ? "text-white/60" : "text-[#6E6E73]"
                    }`}
                  >
                    <span>{msg.role === "user" ? "USER" : "KASHFARA GROUNDED AI"}</span>
                    {msg.role === "assistant" && <span>Kashfara Vision Core</span>}
                  </div>
                  <div dir="auto" className="whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                  {msg.uncertainty_note && (
                    <div className="text-xs text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{msg.uncertainty_note}</span>
                    </div>
                  )}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-black/8 flex flex-wrap gap-1.5">
                      {msg.citations.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCitation(c)}
                          className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#F5F5F7] hover:bg-black hover:text-white text-black border border-black/10 flex items-center gap-1 transition-colors"
                        >
                          <Quote className="w-3 h-3" />
                          Page {c.page_number}
                          {c.field_id ? ` · ${c.field_id}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {error && (
          <div className="mx-4 mb-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void askQuestion(question);
          }}
          className="p-3 border-t border-black/8 bg-white flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={!activeDoc || busy}
            placeholder={
              activeDoc
                ? "Ask a question grounded in this document..."
                : "Select a document first..."
            }
            className="flex-1 px-3.5 py-2 rounded-full bg-[#F5F5F7] border border-black/10 text-xs text-black focus:outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={!activeDoc || busy || !question.trim()}
            className="px-4 py-2 rounded-full bg-black hover:bg-[#1D1D1F] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Ask
          </button>
        </form>
      </div>

      {/* Right: Source Evidence Panel */}
      <div className="lg:col-span-5 apple-card rounded-2xl flex flex-col min-h-[280px] lg:min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-black/8 bg-white text-xs font-mono uppercase text-[#6E6E73]">
          Source Evidence Panel
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F5F7]/50">
          {!selectedCitation ? (
            <div className="text-xs text-[#6E6E73] text-center py-10">
              Click any citation pill in an answer to inspect the supporting passage and page image.
            </div>
          ) : (
            <>
              <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-1.5">
                <div className="text-xs font-mono font-semibold text-black">
                  Cited Page {selectedCitation.page_number}
                </div>
                <div dir="auto" className="text-xs text-[#1D1D1F] leading-relaxed">
                  “{selectedCitation.supporting_passage}”
                </div>
              </div>
              {activeDoc?.pages.find((p) => p.page_number === selectedCitation.page_number)
                ?.image_url && (
                <img
                  src={
                    activeDoc.pages.find((p) => p.page_number === selectedCitation.page_number)!
                      .image_url
                  }
                  alt={`Cited page ${selectedCitation.page_number}`}
                  className="w-full rounded-2xl border border-black/10 bg-white"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
