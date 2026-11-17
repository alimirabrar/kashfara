"use client";

import React from "react";
import {
  Activity,
  FileText,
  Gauge,
  RefreshCw,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { UploadDropzone } from "./UploadDropzone";
import { formatDuration } from "@/lib/utils";
import type {
  CapacityEstimate,
  DailyUsageLedgerState,
  DocumentRecord,
  ProviderEligibility,
} from "@/types/kashfara";

interface OverviewViewProps {
  ledger: DailyUsageLedgerState | null;
  capacity: CapacityEstimate | null;
  providers: ProviderEligibility[];
  documents: Array<{
    id: string;
    filename: string;
    format: string;
    page_count: number;
    status: string;
    classification?: { document_type: string; language: string };
    fields_count: number;
    created_at: string;
  }>;
  onRefresh: () => void;
  onUploadedAndProcessed: (doc: DocumentRecord) => void;
  onOpenDocument: (docId: string) => void;
}

export function OverviewView({
  ledger,
  capacity,
  providers,
  documents,
  onRefresh,
  onUploadedAndProcessed,
  onOpenDocument,
}: OverviewViewProps) {
  const eligibleVision = providers.filter(
    (p) => p.eligible_for_routing && p.supports_vision && p.supports_document_images
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="apple-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#6E6E73]">
            <span>Session Docs</span>
            <FileText className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-black">
              {documents.length}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#6E6E73]">
            {ledger?.pages_processed_today ?? 0} pages analyzed today
          </div>
        </div>

        <div className="apple-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#6E6E73]">
            <span>Vision Cores</span>
            <Layers className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-black">
              {eligibleVision.length || 1}
            </span>
            <span className="text-xs font-mono text-emerald-600">ONLINE</span>
          </div>
          <div className="mt-1 text-[11px] text-[#6E6E73]">
            Arabic RTL + English LTR
          </div>
        </div>

        <div className="apple-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#6E6E73]">
            <span>Verified Jobs</span>
            <Activity className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-black">
              {ledger?.successful_extractions_today ?? 0}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#6E6E73]">
            {ledger?.requests_today ?? 0} engine operations
          </div>
        </div>

        <div className="apple-card rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-[#6E6E73]">
            <span>Avg Latency</span>
            <Clock className="w-4 h-4 text-black" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-black">
              {formatDuration(ledger?.avg_processing_time_ms)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#6E6E73]">
            OCR + Vision pipeline
          </div>
        </div>
      </div>

      {/* Upload + Engine Capabilities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <UploadDropzone
            maxPages={capacity?.max_document_pages ?? 10}
            onUploadedAndProcessed={onUploadedAndProcessed}
          />

          <div className="apple-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-black">Recent Session Documents</h2>
              <button
                onClick={onRefresh}
                className="text-xs text-[#6E6E73] hover:text-black flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            {documents.length === 0 ? (
              <div className="text-xs text-[#6E6E73] py-6 text-center">
                No documents uploaded in this session yet. Drop a PDF, image, or Office file above.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 6).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onOpenDocument(doc.id)}
                    className="w-full text-left p-3.5 rounded-2xl bg-[#F5F5F7] hover:bg-black hover:text-white border border-black/5 transition-all flex items-center justify-between group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{doc.filename}</div>
                      <div className="text-[11px] font-mono text-[#6E6E73] group-hover:text-white/70 mt-0.5">
                        {doc.classification?.document_type || doc.format.toUpperCase()} ·{" "}
                        {doc.page_count}p · {doc.fields_count} fields
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full uppercase ${
                        doc.status === "completed"
                          ? "bg-emerald-500/15 text-emerald-700 group-hover:bg-white group-hover:text-black"
                          : doc.status === "failed"
                            ? "bg-red-500/15 text-red-700"
                            : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {doc.status}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="apple-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-black" />
                <h2 className="text-sm font-semibold text-black">Kashfara Engine Capabilities</h2>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73]">
                Up to {capacity?.max_document_pages ?? 10} pages
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F5F5F7] space-y-2.5 text-xs">
              {[
                "Hybrid OCR + Vision Parsing",
                "Arabic RTL & English Extraction",
                "Bounding-Box Proof of Evidence",
                "Automatic Form Digitalisation",
                "Document-Grounded Q&A",
              ].map((cap) => (
                <div key={cap} className="flex items-center justify-between">
                  <span className="text-[#1D1D1F]">{cap}</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-black/8 flex items-center gap-2 text-[11px] text-[#6E6E73]">
              <ShieldCheck className="w-4 h-4 text-black shrink-0" />
              <span>Stateless processing — zero permanent server file retention.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
