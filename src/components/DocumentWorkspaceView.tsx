"use client";

import React, { useMemo, useState } from "react";
import { parseApiResponse } from "@/lib/api-response";
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
import { cn, formatDuration, mergePageImagesFromClient, stripPageImagesForApi } from "@/lib/utils";
import { UploadDropzone } from "./UploadDropzone";
import { TemplatePanels } from "./TemplatePanels";
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
  const [rightTab, setRightTab] = useState<"template" | "fields" | "tables" | "logs">("template");
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
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold text-black">
            Document Proofing Workspace
          </h2>
          <p className="text-sm text-[#6E6E73]">
            Upload a document below to inspect extracted fields, tables, and visual proof of evidence.
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
        body: JSON.stringify({ document: stripPageImagesForApi(doc) }),
      });
      const json = await parseApiResponse(res);
      if (!res.ok) throw new Error(json.error || "Processing failed.");
      onDocumentUpdated(mergePageImagesFromClient(json.document, doc));
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
        body: JSON.stringify({ document: stripPageImagesForApi(doc) }),
      });
      const json = await parseApiResponse(res);
      if (!res.ok) throw new Error(json.error || "Digitalisation failed.");
      onDocumentUpdated(mergePageImagesFromClient(json.document, doc));
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
          document: stripPageImagesForApi(doc),
          field_id: field.field_id,
          verification_status: "VERIFIED",
          visually_verified: true,
        }),
      });
      const json = await parseApiResponse(res);
      if (res.ok && json.document) {
        onDocumentUpdated(mergePageImagesFromClient(json.document, doc));
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
    <div className="lg:h-[calc(100vh-6.5rem)] flex flex-col gap-3">
      {/* Workspace Action Bar */}
      <div className="apple-card rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="text-sm font-semibold text-black truncate max-w-[220px] sm:max-w-xs">
            {doc.filename}
          </div>
          {doc.classification && (
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-black text-white">
              {doc.classification.document_type} · {doc.classification.language}
            </span>
          )}
          <span className="text-[11px] font-mono text-[#6E6E73]">
            {doc.page_count}p · {formatDuration(doc.total_processing_ms)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={runDigitalize}
            disabled={busyAction !== null}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all",
              doc.classification?.is_form
                ? "bg-black hover:bg-[#1D1D1F] text-white shadow-sm"
                : "bg-[#F5F5F7] hover:bg-black hover:text-white text-black border border-black/10"
            )}
          >
            {busyAction === "digitalize" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : doc.classification?.is_form ? (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {doc.classification?.is_form ? "DIGITALIZE THIS FORM" : "Digitalize Form"}
          </button>

          <button
            onClick={runReprocess}
            disabled={busyAction !== null}
            className="px-3.5 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-black hover:text-white border border-black/10 text-xs font-medium text-black flex items-center gap-1.5 transition-colors"
          >
            {busyAction === "process" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {doc.status === "uploaded" || doc.status === "failed"
              ? "Run Extraction"
              : "Re-run"}
          </button>
        </div>
      </div>

      {(actionError || doc.error_message) && (
        <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 break-words">
          {actionError || doc.error_message}
        </div>
      )}

      {/* 3-Pane Workstation */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        {/* Left: Pages & Signals */}
        <div className="lg:col-span-2 apple-card rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto max-h-[260px] lg:max-h-none">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#6E6E73]">
            Pages ({doc.pages.length})
          </div>
          <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible">
            {doc.pages.map((p) => (
              <button
                key={p.page_number}
                onClick={() => setActivePageNum(p.page_number)}
                className={cn(
                  "shrink-0 w-28 lg:w-full p-2 rounded-xl border text-left transition-all",
                  currentPage?.page_number === p.page_number
                    ? "bg-black border-black text-white"
                    : "bg-[#F5F5F7] border-black/5 text-[#6E6E73] hover:text-black"
                )}
              >
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={`Page ${p.page_number}`}
                    className="w-full h-20 object-contain rounded-lg bg-white mb-1.5"
                  />
                ) : (
                  <div className="w-full h-12 rounded-lg bg-white flex items-center justify-center text-[10px] font-mono text-black mb-1">
                    TEXT
                  </div>
                )}
                <div className="text-[11px] font-mono flex justify-between">
                  <span>P.{p.page_number}</span>
                  <span>
                    {doc.fields.filter((f) => f.page_number === p.page_number).length}f
                  </span>
                </div>
              </button>
            ))}
          </div>

          {doc.classification && (
            <div className="hidden lg:block mt-auto pt-3 border-t border-black/8 space-y-1.5 text-[11px]">
              <div className="font-mono uppercase text-[#6E6E73]">Signals</div>
              <div className="flex flex-wrap gap-1">
                {doc.classification.is_form && (
                  <span className="px-2 py-0.5 rounded-full bg-black text-white">Form</span>
                )}
                {doc.classification.has_tables && (
                  <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-black border border-black/10">Tables</span>
                )}
                {doc.classification.has_signatures && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Signatures
                  </span>
                )}
                {doc.classification.has_stamps && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Stamps</span>
                )}
                {doc.classification.has_handwriting && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Handwriting
                  </span>
                )}
              </div>
              <p className="text-[#6E6E73] leading-relaxed">{doc.classification.summary}</p>
            </div>
          )}
        </div>

        {/* Centre: Original Document Viewer with Bounding Box Overlays */}
        <div className="lg:col-span-5 apple-card rounded-2xl flex flex-col min-h-[380px] lg:min-h-0 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-black/8 flex items-center justify-between bg-white">
            <span className="text-xs font-mono text-[#6E6E73]">
              ORIGINAL VIEWER · PAGE {currentPage?.page_number ?? 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-black"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-black w-11 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-black"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-black"
                title="Reset Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-[#F5F5F7] flex items-start justify-center">
            {currentPage?.image_url ? (
              <div
                className="relative inline-block shadow-lg border border-black/10 rounded-xl overflow-hidden bg-white"
                style={{ width: `${Math.round(zoom * 100)}%`, maxWidth: "none" }}
              >
                <img
                  src={currentPage.image_url}
                  alt={`Document page ${currentPage.page_number}`}
                  className="w-full h-auto block select-none"
                />
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
                      ? "#000000"
                      : f.verification_status === "VERIFIED"
                        ? "#059669"
                        : "#D97706";
                    return (
                      <g key={f.field_id}>
                        <rect
                          x={x}
                          y={y}
                          width={w}
                          height={h}
                          fill={isSelected ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.03)"}
                          stroke={strokeColor}
                          strokeWidth={isSelected ? 4 : 2}
                          rx={4}
                        />
                        {isSelected && (
                          <>
                            <circle cx={x + w} cy={y + h / 2} r={7} fill="#000000" />
                            <line
                              x1={x + w}
                              y1={y + h / 2}
                              x2={1000}
                              y2={y + h / 2}
                              stroke="#000000"
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
                <div className="text-black font-semibold mb-2">
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
                        "p-2.5 rounded-xl border transition-all",
                        isHighlighted
                          ? "bg-black text-white border-black"
                          : "bg-white border-black/10 text-[#6E6E73]"
                      )}
                    >
                      <span className="text-[10px] opacity-60 mr-2">[{b.ref}]</span>
                      <span>{b.text}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Data Extraction & Proofing */}
        <div className="lg:col-span-5 apple-card rounded-2xl flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-black/8 bg-white flex items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setRightTab("template")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-colors shrink-0",
                  rightTab === "template"
                    ? "bg-black text-white"
                    : "text-[#6E6E73] hover:text-black hover:bg-[#F5F5F7]"
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Template
              </button>
              <button
                onClick={() => setRightTab("fields")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-colors shrink-0",
                  rightTab === "fields"
                    ? "bg-black text-white"
                    : "text-[#6E6E73] hover:text-black hover:bg-[#F5F5F7]"
                )}
              >
                <ListChecks className="w-3.5 h-3.5" />
                Fields ({doc.fields.length})
              </button>
              <button
                onClick={() => setRightTab("tables")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-colors shrink-0",
                  rightTab === "tables"
                    ? "bg-black text-white"
                    : "text-[#6E6E73] hover:text-black hover:bg-[#F5F5F7]"
                )}
              >
                <Table2 className="w-3.5 h-3.5" />
                Tables ({doc.tables.length})
              </button>
              <button
                onClick={() => setRightTab("logs")}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0",
                  rightTab === "logs"
                    ? "bg-black text-white"
                    : "text-[#6E6E73] hover:text-black hover:bg-[#F5F5F7]"
                )}
              >
                Logs
              </button>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono">
              <span className="text-emerald-700">{verifiedCount}V</span>
              <span className="text-amber-700">{reviewCount}R</span>
            </div>
          </div>

          {rightTab === "template" && (
            <div className="flex-1 overflow-y-auto p-3 bg-[#F5F5F7]/50">
              <TemplatePanels doc={doc} onDocumentUpdated={onDocumentUpdated} />
            </div>
          )}

          {rightTab === "fields" && (
            <>
              <div className="p-2.5 border-b border-black/8 bg-white">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#6E6E73] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter extracted labels, values, or evidence..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F5F5F7] border border-black/10 text-xs text-black placeholder:text-[#6E6E73] focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#F5F5F7]/50">
                {filteredFields.length === 0 ? (
                  <div className="text-xs text-[#6E6E73] text-center py-8">
                    {doc.fields.length === 0
                      ? 'No fields extracted yet. Click "Run Extraction" above.'
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
                          "p-3.5 rounded-2xl border cursor-pointer transition-all space-y-2",
                          isSelected
                            ? "bg-white border-black shadow-md"
                            : "bg-white border-black/8 hover:border-black/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div dir="auto" className="text-xs font-medium text-[#6E6E73]">
                              {field.label}
                            </div>
                            <div
                              dir="auto"
                              className="text-sm font-semibold text-black mt-0.5 break-words"
                            >
                              {field.value === null || field.value === "" ? (
                                <span className="italic text-[#6E6E73]">&lt;empty&gt;</span>
                              ) : (
                                String(field.value)
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                "text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1",
                                field.verification_status === "VERIFIED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : field.verification_status === "NEEDS_REVIEW"
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-red-50 text-red-700 border border-red-200"
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
                            <span className="text-[10px] font-mono text-[#6E6E73]">
                              p.{field.page_number} · {field.coordinate_source}
                            </span>
                          </div>
                        </div>

                        {field.source_text && (
                          <div
                            dir="auto"
                            className="text-[11px] font-mono text-[#6E6E73] bg-[#F5F5F7] px-2.5 py-1.5 rounded-xl truncate"
                            title={field.source_text}
                          >
                            Evidence: “{field.source_text}”
                          </div>
                        )}

                        {field.verification_status !== "VERIFIED" && (
                          <div className="flex justify-end pt-0.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void markVisuallyVerified(field);
                              }}
                              disabled={busyAction === field.field_id}
                              className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-black text-white hover:bg-[#1D1D1F] flex items-center gap-1"
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
            <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-[#F5F5F7]/50">
              {doc.tables.length === 0 ? (
                <div className="text-xs text-[#6E6E73] text-center py-8">
                  No tables detected in this document.
                </div>
              ) : (
                doc.tables.map((t) => (
                  <div
                    key={t.table_id}
                    className="rounded-2xl border border-black/10 bg-white overflow-hidden"
                  >
                    <div className="px-3.5 py-2.5 bg-[#F5F5F7] text-xs font-semibold text-black flex justify-between">
                      <span>{t.title || t.table_id}</span>
                      <span className="font-mono text-[#6E6E73]">Page {t.page_number}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        {t.headers.length > 0 && (
                          <thead className="bg-white text-[#6E6E73] font-mono border-b border-black/8">
                            <tr>
                              {t.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {t.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-black/5">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} dir="auto" className="px-3 py-2 text-black">
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
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#F5F5F7]/50">
              {doc.pipeline && doc.pipeline.length > 0 && (
                <div className="space-y-2 mb-3">
                  <div className="text-[10px] font-mono uppercase text-[#6E6E73] px-1">
                    Pipeline Execution Steps
                  </div>
                  {doc.pipeline.map((step) => (
                    <div
                      key={step.id}
                      className="p-3 rounded-2xl bg-white border border-black/8 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-black">
                        <span>{step.label}</span>
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${
                            step.status === "done"
                              ? "bg-emerald-50 text-emerald-700"
                              : step.status === "failed"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {step.status} · {step.duration_ms ? `${step.duration_ms}ms` : "running"}
                        </span>
                      </div>
                      {step.detail && (
                        <div className="text-[11px] font-mono text-[#6E6E73]">{step.detail}</div>
                      )}
                      {step.error && (
                        <div className="text-[11px] text-red-700 break-words">{step.error}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {doc.processing_logs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-white border border-black/8 text-xs space-y-1"
                >
                  <div className="flex justify-between font-semibold text-black">
                    <span>{log.step}</span>
                    <span className="font-mono text-[#6E6E73]">
                      {formatDuration(log.duration_ms)}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#6E6E73]">
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
