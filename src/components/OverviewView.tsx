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
  const eligibleReasoning = providers.filter(
    (p) => p.eligible_for_routing && p.supports_structured_output
  );

  const uniquePools = new Map<string, ProviderEligibility>();
  for (const p of providers.filter((x) => x.eligible_for_routing)) {
    if (!uniquePools.has(p.shared_quota_pool)) {
      uniquePools.set(p.shared_quota_pool, p);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="kv-panel rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#91A3B6]">
            <span>Documents Processed Today</span>
            <FileText className="w-4 h-4 text-[#40E9E1]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-[#E8F0F7]">
              {ledger?.documents_processed_today ?? 0}
            </span>
            <span className="text-xs font-mono text-[#91A3B6]">
              / {capacity?.daily_document_target ?? 30} target
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A3B6]">
            {ledger?.pages_processed_today ?? 0} pages analyzed today
          </div>
        </div>

        <div className="kv-panel rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#91A3B6]">
            <span>Active Vision Cores</span>
            <Layers className="w-4 h-4 text-[#32D6A0]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-[#32D6A0]">
              {eligibleVision.length}
            </span>
            <span className="text-xs font-mono text-[#91A3B6]">
              ({eligibleReasoning.length} reasoning)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A3B6]">
            {uniquePools.size} independent routing cluster(s)
          </div>
        </div>

        <div className="kv-panel rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#91A3B6]">
            <span>Extraction Throughput</span>
            <Activity className="w-4 h-4 text-[#1FBFCA]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-[#E8F0F7]">
              {ledger?.successful_extractions_today ?? 0}
            </span>
            <span className="text-xs font-mono text-[#91A3B6]">verified jobs</span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A3B6]">
            {ledger?.requests_today ?? 0} intelligence operations today
          </div>
        </div>

        <div className="kv-panel rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#91A3B6]">
            <span>Avg Processing Time</span>
            <Clock className="w-4 h-4 text-[#F6B94A]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-[#E8F0F7]">
              {formatDuration(ledger?.avg_processing_time_ms)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A3B6]">
            End-to-end multimodal pipeline
          </div>
        </div>
      </div>

      {/* Upload + Engine Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <UploadDropzone
            maxPages={capacity?.max_document_pages ?? 10}
            onUploadedAndProcessed={onUploadedAndProcessed}
          />

          {/* Recent Documents */}
          <div className="kv-panel rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#E8F0F7]">Recent Documents</h2>
              <button
                onClick={onRefresh}
                className="text-xs text-[#40E9E1] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            {documents.length === 0 ? (
              <div className="text-xs text-[#91A3B6] py-6 text-center">
                No documents processed yet. Upload a PDF, image, or Office document above.
              </div>
            ) : (
              <div className="space-y-2">
                {documents.slice(0, 6).map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => onOpenDocument(doc.id)}
                    className="w-full text-left p-3 rounded-lg bg-[#152231]/60 hover:bg-[#152231] border border-[#91A3B6]/15 hover:border-[#40E9E1]/40 transition-all flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#E8F0F7] truncate">
                        {doc.filename}
                      </div>
                      <div className="text-[11px] font-mono text-[#91A3B6] mt-0.5">
                        {doc.classification?.document_type || doc.format.toUpperCase()} ·{" "}
                        {doc.page_count}p · {doc.fields_count} fields
                      </div>
                    </div>
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
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kashfara Engine Telemetry */}
        <div className="lg:col-span-5 space-y-4">
          <div className="kv-panel rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#40E9E1]" />
                <h2 className="text-sm font-semibold text-[#E8F0F7]">
                  Kashfara Engine Telemetry
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#152231] text-[#91A3B6]">
                {capacity?.default_workload_pages ?? 5}p std / {capacity?.max_document_pages ?? 10}p max
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B121D] border border-[#91A3B6]/15 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#91A3B6]">Multimodal Classification</span>
                <span className="font-mono text-[#32D6A0]">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A3B6]">Evidence-Backed Proofing</span>
                <span className="font-mono text-[#32D6A0]">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A3B6]">Arabic &amp; English RTL Support</span>
                <span className="font-mono text-[#32D6A0]">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A3B6]">Automatic Form Digitalisation</span>
                <span className="font-mono text-[#32D6A0]">ACTIVE</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#91A3B6]/15 space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[#91A3B6]">
                Routing Clusters
              </div>
              {uniquePools.size === 0 ? (
                <div className="text-xs text-[#F6B94A]">
                  Engine standby — configure API credentials to activate processing.
                </div>
              ) : (
                Array.from(uniquePools.entries()).map(([, rep], idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-[#152231]/60 border border-[#91A3B6]/15 text-xs flex items-center justify-between"
                  >
                    <span className="font-mono text-[#E8F0F7]">
                      Kashfara Neural Cluster {idx + 1}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[#32D6A0]">
                      <CheckCircle2 className="w-3 h-3" />
                      {rep.health_status === "healthy" ? "OPTIMAL" : "READY"}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#91A3B6]/15 flex items-center gap-2 text-[11px] text-[#91A3B6]">
              <ShieldCheck className="w-4 h-4 text-[#32D6A0] shrink-0" />
              <span>
                All uploaded documents are processed privately with zero public exposure.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
