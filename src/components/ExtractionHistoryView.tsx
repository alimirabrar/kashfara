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
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="apple-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-black">Session History</h2>
          <p className="text-xs text-[#6E6E73]">
            {documents.length} document(s) processed in your current browser session.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#6E6E73] absolute left-3 top-2.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search filename or type..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/10 text-xs text-black focus:outline-none focus:border-black"
          />
        </div>
      </div>

      <div className="apple-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F5F5F7] text-[#6E6E73] font-mono uppercase border-b border-black/8">
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
                  <td colSpan={7} className="px-4 py-10 text-center text-[#6E6E73]">
                    No documents in session yet.
                  </td>
                </tr>
              ) : (
                filtered.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-black/5 hover:bg-[#F5F5F7]/60 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-black shrink-0" />
                        <div>
                          <div className="font-medium text-black">{doc.filename}</div>
                          <div className="text-[10px] font-mono text-[#6E6E73]">
                            {new Date(doc.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {doc.classification ? (
                        <div>
                          <div className="text-black">{doc.classification.document_type}</div>
                          <div className="text-[10px] font-mono text-[#6E6E73]">
                            {doc.classification.language}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#6E6E73]">Unclassified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#6E6E73]">
                      {doc.page_count}p · {formatBytes(doc.size_bytes)}
                    </td>
                    <td className="px-4 py-3 font-mono text-black">
                      {doc.fields_count} fields · {doc.tables_count} tables
                    </td>
                    <td className="px-4 py-3 font-mono text-[#6E6E73]">
                      {formatDuration(doc.total_processing_ms)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase ${
                          doc.status === "completed"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : doc.status === "failed"
                              ? "bg-red-500/15 text-red-700"
                              : "bg-amber-500/15 text-amber-700"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onOpenDocument(doc.id)}
                          className="px-3 py-1 rounded-full bg-black text-white text-[11px] font-medium inline-flex items-center gap-1 hover:bg-[#1D1D1F]"
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
                          className="p-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                          title="Remove from session"
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
