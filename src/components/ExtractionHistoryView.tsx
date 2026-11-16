"use client";

import React, { useState } from "react";
import { Search, Trash2, ExternalLink, FileText } from "lucide-react";
import { formatBytes, formatDuration } from "@/lib/utils";

interface HistoryDocSummary {
  id: string;
  filename: string;
  format: string;
  size_bytes: number;
  page_count: number;
  status: string;
  classification?: { document_type: string; language: string; is_form?: boolean };
  fields_count: number;
  tables_count: number;
  created_at: string;
  total_processing_ms?: number;
}

interface ExtractionHistoryViewProps {
  documents: HistoryDocSummary[];
  onOpenDocument: (docId: string) => void;
  onDeleteDocument: (docId: string) => Promise<void>;
}

export function ExtractionHistoryView({
  documents,
  onOpenDocument,
  onDeleteDocument,
}: ExtractionHistoryViewProps) {
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = documents.filter((d) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      d.filename.toLowerCase().includes(q) ||
      (d.classification?.document_type || "").toLowerCase().includes(q) ||
      (d.classification?.language || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="kv-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#E8F0F7]">Extraction History</h2>
          <p className="text-xs text-[#91A3B6]">
            {documents.length} document(s) in private store. Delete removes original file, page renders, and extracted JSON.
          </p>
        </div>
        <div className="relative w-72">
          <Search className="w-4 h-4 text-[#91A3B6] absolute left-3 top-2.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filename or type..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#080D15] border border-[#91A3B6]/20 text-xs text-[#E8F0F7] focus:outline-none focus:border-[#40E9E1]"
          />
        </div>
      </div>

      <div className="kv-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0B121D] text-[#91A3B6] font-mono uppercase border-b border-[#91A3B6]/15">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Pages / Size</th>
                <th className="px-4 py-3">Extracted</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[#91A3B6]">
                    No documents found.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-[#91A3B6]/10 hover:bg-[#152231]/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#40E9E1] shrink-0" />
                        <div>
                          <div className="font-medium text-[#E8F0F7]">{doc.filename}</div>
                          <div className="text-[10px] font-mono text-[#91A3B6]">
                            {new Date(doc.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {doc.classification ? (
                        <div>
                          <div className="text-[#E8F0F7]">{doc.classification.document_type}</div>
                          <div className="text-[10px] font-mono text-[#91A3B6]">
                            {doc.classification.language}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#91A3B6]">Unclassified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#91A3B6]">
                      {doc.page_count}p · {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#E8F0F7]">
                      {doc.fields_count} fields · {doc.tables_count} tables
                    </td>
                    <td className="px-4 py-3 font-mono text-[#91A3B6]">
                      {formatDuration(doc.total_processing_ms)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          doc.status === "completed"
                            ? "bg-[#32D6A0]/15 text-[#32D6A0]"
                            : doc.status === "failed"
                              ? "bg-[#F87171]/15 text-[#F87171]"
                              : "bg-[#F6B94A]/15 text-[#F6B94A]"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onOpenDocument(doc.id)}
                          className="px-2.5 py-1 rounded bg-[#152231] hover:border-[#40E9E1]/50 border border-[#91A3B6]/20 text-[#40E9E1] inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Open
                        </button>
                        <button
                          onClick={async () => {
                            setDeletingId(doc.id);
                            try {
                              await onDeleteDocument(doc.id);
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          disabled={deletingId === doc.id}
                          className="p-1.5 rounded bg-[#F87171]/10 hover:bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/25"
                          title="Secure Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
