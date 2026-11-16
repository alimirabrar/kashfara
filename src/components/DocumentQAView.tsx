"use client";

import React, { useState } from "react";
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
        body: JSON.stringify({ question: qText }),
      });
      const json = await res.json();
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
    <div className="h-[calc(100vh-7.5rem)] grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto">
      {/* Left: Chat & Document Selector */}
      <div className="lg:col-span-7 kv-panel rounded-xl flex flex-col min-h-0 overflow-hidden">
        <div className="p-3 border-b border-[#91A3B6]/15 bg-[#0B121D] flex items-center justify-between gap-3">
          <span className="text-xs font-mono uppercase text-[#40E9E1]">Document Q&A</span>
          <select
            value={activeDoc?.id || ""}
            onChange={(e) => e.target.value && onSelectDocument(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-[#152231] border border-[#91A3B6]/25 text-xs text-[#E8F0F7] max-w-xs"
          >
            <option value="">Select a document...</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.filename} ({d.classification?.document_type || "Document"})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeDoc ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#91A3B6] text-sm">
              <FileSearch className="w-8 h-8 text-[#40E9E1]/60 mb-2" />
              Select a document above to ask grounded questions.
            </div>
          ) : (
            <>
              {activeDoc.qa_history.length === 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono text-[#91A3B6]">Suggested Questions</div>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((sq, i) => (
                      <button
                        key={i}
                        onClick={() => void askQuestion(sq)}
                        disabled={busy}
                        className="text-left text-xs px-3 py-2 rounded-lg bg-[#152231] hover:border-[#40E9E1]/50 border border-[#91A3B6]/20 text-[#E8F0F7]"
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
                  className={`p-3.5 rounded-xl text-sm space-y-2 ${
                    msg.role === "user"
                      ? "bg-[#152231] border border-[#40E9E1]/30 ml-10"
                      : "bg-[#0B121D] border border-[#91A3B6]/20 mr-6"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#91A3B6]">
                    <span>{msg.role === "user" ? "OPERATOR" : "KASHFARA GROUNDED AI"}</span>
                    {msg.role === "assistant" && <span>Kashfara Vision Core</span>}
                  </div>
                  <div dir="auto" className="text-[#E8F0F7] whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                  {msg.uncertainty_note && (
                    <div className="text-xs text-[#F6B94A] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{msg.uncertainty_note}</span>
                    </div>
                  )}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-[#91A3B6]/15 flex flex-wrap gap-1.5">
                      {msg.citations.map((c, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCitation(c)}
                          className="text-[11px] font-mono px-2 py-1 rounded bg-[#40E9E1]/10 hover:bg-[#40E9E1]/20 text-[#40E9E1] border border-[#40E9E1]/30 flex items-center gap-1"
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
          <div className="mx-4 mb-2 p-2.5 rounded bg-[#F87171]/10 border border-[#F87171]/35 text-xs text-[#F87171]">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void askQuestion(question);
          }}
          className="p-3 border-t border-[#91A3B6]/15 bg-[#0B121D] flex gap-2"
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
            className="flex-1 px-3 py-2 rounded-lg bg-[#080D15] border border-[#91A3B6]/20 text-xs text-[#E8F0F7] focus:outline-none focus:border-[#40E9E1]"
          />
          <button
            type="submit"
            disabled={!activeDoc || busy || !question.trim()}
            className="px-4 py-2 rounded-lg bg-[#40E9E1] hover:bg-[#1FBFCA] disabled:opacity-40 text-[#080D15] text-xs font-semibold flex items-center gap-1.5"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Ask
          </button>
        </form>
      </div>

      {/* Right: Source Evidence Panel */}
      <div className="lg:col-span-5 kv-panel rounded-xl flex flex-col min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#91A3B6]/15 bg-[#0B121D] text-xs font-mono uppercase text-[#91A3B6]">
          Source Evidence Panel
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedCitation ? (
            <div className="text-xs text-[#91A3B6] text-center py-10">
              Click any citation badge in an answer to inspect the supporting passage and page image.
            </div>
          ) : (
            <>
              <div className="p-3 rounded-lg bg-[#152231] border border-[#40E9E1]/35 space-y-1.5">
                <div className="text-xs font-mono text-[#40E9E1]">
                  Cited Page {selectedCitation.page_number}
                </div>
                <div dir="auto" className="text-xs text-[#E8F0F7] leading-relaxed">
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
                  className="w-full rounded-lg border border-[#91A3B6]/20"
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
