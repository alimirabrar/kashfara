"use client";

import React, { useMemo, useState } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  Sparkles,
  Play,
  Loader2,
  Table2,
  ListChecks,
  Eye,
  FileSpreadsheet,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { UploadDropzone } from "./UploadDropzone";
import type { DocumentRecord, ExtractedField } from "@/types/kashfara";

interface DocumentWorkspaceViewProps {
  doc: DocumentRecord | null;
  onDocumentUpdated: (doc: DocumentRecord) => void;
  onOpenDigitalForms: () => void;
  maxPages?: number;
}

export function DocumentWorkspaceView({
  doc,
  onDocumentUpdated,
  onOpenDigitalForms,
  maxPages = 10,
}: DocumentWorkspaceViewProps) {
  const [activePageNum, setActivePageNum] = useState(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [rightTab, setRightTab] = useState<"fields" | "tables" | "logs">("fields");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentPage = useMemo(() => {
    if (!doc) return undefined;
    return doc.pages.find((p) => p.page_number === activePageNum) || doc.pages[0];
  }, [doc, activePageNum]);

  const filteredFields = useMemo(() => {
    if (!doc) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return doc.fields;
    return doc.fields.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        String(f.value ?? "").toLowerCase().includes(q) ||
        (f.source_text || "").toLowerCase().includes(q)
    );
  }, [doc, searchQuery]);

  const pageFields = useMemo(() => {
    if (!doc || !currentPage) return [];
    return doc.fields.filter((f) => f.page_number === currentPage.page_number);
  }, [doc, currentPage]);

  const selectedField = useMemo(() => {
    if (!doc || !selectedFieldId) return null;
    return doc.fields.find((f) => f.field_id === selectedFieldId) || null;
  }, [doc, selectedFieldId]);

  if (!doc) {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-[#E8F0F7]">
            No Document Selected in Workspace
          </h2>
          <p className="text-sm text-[#91A3B6]">
            Upload a document below or select one from Extraction History to inspect evidence-backed fields.
          </p>
        </div>
        <UploadDropzone maxPages={maxPages} onUploadedAndProcessed={onDocumentUpdated} />
      </div>
    );
  }

  async function runReprocess() {
    if (!doc) return;
    setActionError(null);
    setBusyAction("process");
    try {
      const res = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Processing failed.");
      onDocumentUpdated(json.document);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Processing failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runDigitalize() {
    if (!doc) return;
    setActionError(null);
    setBusyAction("digitalize");
    try {
      const res = await fetch(`/api/documents/${doc.id}/digitalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: doc }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Digitalisation failed.");
      onDocumentUpdated(json.document);
      onOpenDigitalForms();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Digitalisation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function markVisuallyVerified(field: ExtractedField) {
    if (!doc) return;
    setBusyAction(field.field_id);
    try {
      const res = await fetch(`/api/documents/${doc.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: doc,
          field_id: field.field_id,
          verification_status: "VERIFIED",
          visually_verified: true,
        }),
      });
      const json = await res.json();
      if (res.ok && json.document) {
        onDocumentUpdated(json.document);
      }
    } finally {
      setBusyAction(null);
    }
  }

  function handleSelectField(field: ExtractedField) {
    setSelectedFieldId(field.field_id);
    setActivePageNum(field.page_number);
  }

  const verifiedCount = doc.fields.filter((f) => f.verification_status === "VERIFIED").length;
  const reviewCount = doc.fields.filter((f) => f.verification_status === "NEEDS_REVIEW").length;

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col gap-3">
      {/* Workspace Action Bar */}
      <div className="kv-panel rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-sm font-semibold text-[#E8F0F7] truncate max-w-xs">
            {doc.filename}
          </div>
          {doc.classification && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#40E9E1]/15 text-[#40E9E1] border border-[#40E9E1]/30">
              {doc.classification.document_type} · {doc.classification.language}
            </span>
          )}
          <span className="text-[11px] font-mono text-[#91A3B6]">
            {doc.page_count} page{doc.page_count > 1 ? "s" : ""} ·{" "}
            {formatDuration(doc.total_processing_ms)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {doc.classification?.is_form && (
            <button
              onClick={runDigitalize}
              disabled={busyAction !== null}
              className="px-3 py-1.5 rounded-lg bg-[#40E9E1] hover:bg-[#1FBFCA] text-[#080D15] text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-[0_0_16px_rgba(64,233,225,0.3)]"
            >
              {busyAction === "digitalize" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              DIGITALIZE THIS FORM
            </button>
          )}
          {!doc.classification?.is_form && (
            <button
              onClick={runDigitalize}
              disabled={busyAction !== null}
              className="px-2.5 py-1.5 rounded-lg bg-[#152231] hover:bg-[#152231]/80 border border-[#91A3B6]/25 text-xs text-[#E8F0F7] flex items-center gap-1.5"
            >
              {busyAction === "digitalize" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-[#40E9E1]" />
              )}
              Digitalize Form
            </button>
          )}
          <button
            onClick={runReprocess}
            disabled={busyAction !== null}
            className="px-3 py-1.5 rounded-lg bg-[#152231] hover:border-[#40E9E1]/50 border border-[#91A3B6]/25 text-xs text-[#E8F0F7] flex items-center gap-1.5"
          >
            {busyAction === "process" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#40E9E1]" />
            ) : (
              <Play className="w-3.5 h-3.5 text-[#40E9E1]" />
            )}
            {doc.status === "uploaded" || doc.status === "failed"
              ? "Run AI Extraction"
              : "Re-run Pipeline"}
          </button>
        </div>
      </div>

      {(actionError || (doc.status === "failed" && doc.error_message)) && (
        <div className="p-2.5 rounded-lg bg-[#F87171]/10 border border-[#F87171]/35 text-xs text-[#F87171] break-words">
          {actionError || doc.error_message}
        </div>
      )}

      {/* 3-Pane Workstation */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left: Pages & Classification Metadata */}
        <div className="lg:col-span-2 kv-panel rounded-xl p-3 flex flex-col gap-3 overflow-y-auto">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#91A3B6]">
            Pages ({doc.pages.length})
          </div>
          <div className="space-y-2">
            {doc.pages.map((p) => (
              <button
                key={p.page_number}
                onClick={() => setActivePageNum(p.page_number)}
                className={cn(
                  "w-full p-2 rounded-lg border text-left transition-all",
                  currentPage?.page_number === p.page_number
                    ? "bg-[#152231] border-[#40E9E1] text-[#40E9E1]"
                    : "bg-[#0B121D] border-[#91A3B6]/15 text-[#91A3B6] hover:text-[#E8F0F7]"
                )}
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={`Page ${p.page_number}`}
                    className="w-full h-24 object-contain rounded bg-[#080D15] mb-1.5"
                  />
                ) : (
                  <div className="w-full h-12 rounded bg-[#080D15] flex items-center justify-center text-[10px] font-mono mb-1">
                    TEXT / STRUCT
                  </div>
                )}
                <div className="text-[11px] font-mono flex justify-between">
                  <span>Page {p.page_number}</span>
                  <span>
                    {doc.fields.filter((f) => f.page_number === p.page_number).length}f
                  </span>
                </div>
              </button>
            ))}
          </div>

          {doc.classification && (
            <div className="mt-auto pt-3 border-t border-[#91A3B6]/15 space-y-1.5 text-[11px]">
              <div className="font-mono uppercase text-[#91A3B6]">Signals</div>
              <div className="flex flex-wrap gap-1">
                {doc.classification.is_form && (
                  <span className="px-1.5 py-0.5 rounded bg-[#40E9E1]/15 text-[#40E9E1]">Form</span>
                )}
                {doc.classification.has_tables && (
                  <span className="px-1.5 py-0.5 rounded bg-[#1FBFCA]/15 text-[#1FBFCA]">Tables</span>
                )}
                {doc.classification.has_signatures && (
                  <span className="px-1.5 py-0.5 rounded bg-[#32D6A0]/15 text-[#32D6A0]">
                    Signatures
                  </span>
                )}
                {doc.classification.has_stamps && (
                  <span className="px-1.5 py-0.5 rounded bg-[#F6B94A]/15 text-[#F6B94A]">Stamps</span>
                )}
                {doc.classification.has_handwriting && (
                  <span className="px-1.5 py-0.5 rounded bg-[#F6B94A]/15 text-[#F6B94A]">
                    Handwriting
                  </span>
                )}
              </div>
              <p className="text-[#91A3B6] leading-relaxed">{doc.classification.summary}</p>
            </div>
          )}
        </div>

        {/* Centre: Original Document Viewer with Cyan Highlighted Regions & Connector */}
        <div className="lg:col-span-5 kv-panel rounded-xl flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#91A3B6]/15 flex items-center justify-between bg-[#0B121D]">
            <span className="text-xs font-mono text-[#91A3B6]">
              ORIGINAL VIEWER · PAGE {currentPage?.page_number ?? 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 rounded hover:bg-[#152231] text-[#91A3B6] hover:text-[#E8F0F7]"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-[#E8F0F7] w-11 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 rounded hover:bg-[#152231] text-[#91A3B6] hover:text-[#E8F0F7]"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 rounded hover:bg-[#152231] text-[#91A3B6] hover:text-[#E8F0F7]"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-[#080D15] flex items-start justify-center">
            {currentPage?.image_url ? (
              <div
                className="relative inline-block shadow-2xl border border-[#91A3B6]/20 rounded overflow-hidden"
                style={{ width: `${Math.round(zoom * 100)}%`, maxWidth: "none" }}
              >
                <img
                  src={currentPage.image_url}
                  alt={`Document page ${currentPage.page_number}`}
                  className="w-full h-auto block select-none"
                />
                {/* SVG Evidence Overlay */}
                <svg
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {pageFields.map((f) => {
                    if (!f.bounding_box) return null;
                    const isSelected = f.field_id === selectedFieldId;
                    const x = f.bounding_box.x * 1000;
                    const y = f.bounding_box.y * 1000;
                    const w = f.bounding_box.width * 1000;
                    const h = f.bounding_box.height * 1000;
                    const strokeColor = isSelected
                      ? "#40E9E1"
                      : f.verification_status === "VERIFIED"
                        ? "#32D6A0"
                        : "#F6B94A";
                    return (
                      <g key={f.field_id}>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill={isSelected ? "rgba(64,233,225,0.20)" : "rgba(64,233,225,0.06)"}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 4 : 2}
                          rx={4}
                        />
                        {isSelected && (
                          <>
                            <circle cx={x + w} cy={y + h / 2} r={7} fill="#40E9E1" />
                            <line
                              x1={x + w}
                              y1={y + h / 2}
                              x2={1000}
                              y2={y + h / 2}
                              stroke="#40E9E1"
                              strokeWidth={3}
                              strokeDasharray="8 5"
                            />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="w-full space-y-2 text-xs font-mono">
                <div className="text-[#40E9E1] mb-2">
                  Structured Document View ({doc.format.toUpperCase()})
                </div>
                {(currentPage?.structural_blocks || []).map((b) => {
                  const isHighlighted =
                    selectedField?.structural_ref === b.ref ||
                    (selectedField?.source_text && b.text.includes(selectedField.source_text));
                  return (
                    <div
                      key={b.ref}
                      className={cn(
                        "p-2.5 rounded border transition-all",
                        isHighlighted
                          ? "bg-[#40E9E1]/15 border-[#40E9E1] text-[#E8F0F7]"
                          : "bg-[#101A27] border-[#91A3B6]/15 text-[#91A3B6]"
                      )}
                    >
                      <span className="text-[10px] text-[#1FBFCA] mr-2">[{b.ref}]</span>
                      <span>{b.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Data Extraction & Proofing */}
        <div className="lg:col-span-5 kv-panel rounded-xl flex flex-col min-h-0 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#91A3B6]/15 bg-[#0B121D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRightTab("fields")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5",
                  rightTab === "fields"
                    ? "bg-[#152231] text-[#40E9E1] border border-[#40E9E1]/35"
                    : "text-[#91A3B6] hover:text-[#E8F0F7]"
                )}
              >
                <ListChecks className="w-3.5 h-3.5" />
                Fields ({doc.fields.length})
              </button>
              <button
                onClick={() => setRightTab("tables")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5",
                  rightTab === "tables"
                    ? "bg-[#152231] text-[#40E9E1] border border-[#40E9E1]/35"
                    : "text-[#91A3B6] hover:text-[#E8F0F7]"
                )}
              >
                <Table2 className="w-3.5 h-3.5" />
                Tables ({doc.tables.length})
              </button>
              <button
                onClick={() => setRightTab("logs")}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium",
                  rightTab === "logs"
                    ? "bg-[#152231] text-[#40E9E1] border border-[#40E9E1]/35"
                    : "text-[#91A3B6] hover:text-[#E8F0F7]"
                )}
              >
                Audit ({doc.processing_logs.length})
              </button>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-[#32D6A0]">{verifiedCount}V</span>
              <span className="text-[#F6B94A]">{reviewCount}R</span>
            </div>
          </div>

          {rightTab === "fields" && (
            <>
              <div className="p-2.5 border-b border-[#91A3B6]/15">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#91A3B6] absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter extracted labels, values, or evidence..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#080D15] border border-[#91A3B6]/20 text-xs text-[#E8F0F7] placeholder:text-[#91A3B6]/60 focus:outline-none focus:border-[#40E9E1]"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredFields.length === 0 ? (
                  <div className="text-xs text-[#91A3B6] text-center py-8">
                    {doc.fields.length === 0
                      ? 'No fields extracted yet. Click "Run AI Extraction" above.'
                      : "No matching fields."}
                  </div>
                ) : (
                  filteredFields.map((field) => {
                    const isSelected = field.field_id === selectedFieldId;
                    return (
                      <div
                        key={field.field_id}
                        onClick={() => handleSelectField(field)}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all space-y-1.5",
                          isSelected
                            ? "bg-[#152231] border-[#40E9E1] shadow-[0_0_16px_rgba(64,233,225,0.12)]"
                            : "bg-[#0B121D] border-[#91A3B6]/15 hover:border-[#40E9E1]/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-[#91A3B6]">
                              {field.label}
                            </div>
                            <div
                              dir="auto"
                              className="text-sm font-semibold text-[#E8F0F7] mt-0.5 break-words"
                            >
                              {field.value === null || field.value === "" ? (
                                <span className="italic text-[#91A3B6]/60">&lt;empty&gt;</span>
                              ) : (
                                String(field.value)
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1",
                                field.verification_status === "VERIFIED"
                                  ? "bg-[#32D6A0]/15 text-[#32D6A0]"
                                  : field.verification_status === "NEEDS_REVIEW"
                                    ? "bg-[#F6B94A]/15 text-[#F6B94A]"
                                    : "bg-[#F87171]/15 text-[#F87171]"
                              )}
                            >
                              {field.verification_status === "VERIFIED" && (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {field.verification_status === "NEEDS_REVIEW" && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              {field.verification_status === "NOT_FOUND" && (
                                <XCircle className="w-3 h-3" />
                              )}
                              {field.verification_status}
                            </span>
                            <span className="text-[10px] font-mono text-[#91A3B6]">
                              p.{field.page_number} · {field.coordinate_source}
                            </span>
                          </div>
                        </div>

                        {field.source_text && (
                          <div
                            dir="auto"
                            className="text-[11px] font-mono text-[#91A3B6] bg-[#080D15] px-2 py-1 rounded border border-[#91A3B6]/10 truncate"
                            title={field.source_text}
                          >
                            Evidence: “{field.source_text}”
                          </div>
                        )}

                        {field.verification_status !== "VERIFIED" && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void markVisuallyVerified(field);
                              }}
                              disabled={busyAction === field.field_id}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#32D6A0]/10 hover:bg-[#32D6A0]/20 text-[#32D6A0] border border-[#32D6A0]/30 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              Verify Visually
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {rightTab === "tables" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {doc.tables.length === 0 ? (
                <div className="text-xs text-[#91A3B6] text-center py-8">
                  No tables detected in this document.
                </div>
              ) : (
                doc.tables.map((t) => (
                  <div
                    key={t.table_id}
                    className="rounded-lg border border-[#91A3B6]/20 bg-[#0B121D] overflow-hidden"
                  >
                    <div className="px-3 py-2 bg-[#152231] text-xs font-medium text-[#E8F0F7] flex justify-between">
                      <span>{t.title || t.table_id}</span>
                      <span className="font-mono text-[#40E9E1]">Page {t.page_number}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        {t.headers.length > 0 && (
                          <thead className="bg-[#080D15] text-[#91A3B6] font-mono">
                            <tr>
                              {t.headers.map((h, i) => (
                                <th key={i} className="px-2.5 py-1.5 border-b border-[#91A3B6]/15">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {t.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-[#91A3B6]/10">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} dir="auto" className="px-2.5 py-1.5 text-[#E8F0F7]">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {rightTab === "logs" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {doc.processing_logs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#0B121D] border border-[#91A3B6]/15 text-xs space-y-1"
                >
                  <div className="flex justify-between font-medium text-[#E8F0F7]">
                    <span>{log.step}</span>
                    <span className="font-mono text-[#40E9E1]">
                      {formatDuration(log.duration_ms)}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#91A3B6]">
                    {log.provider ? "Kashfara Multimodal Core" : "Kashfara Evidence Engine"}
                    {log.input_tokens ? ` · ${log.input_tokens} in / ${log.output_tokens} out` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
