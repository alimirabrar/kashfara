"use client";

import React from "react";
import {
  Activity,
  FileText,
  Gauge,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
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
  providerErrors: Array<{ source: string; message: string }>;
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
  providerErrors,
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

  // Deduplicate shared quota pools for display
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
            <span>Documents Today</span>
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
            {ledger?.pages_processed_today ?? 0} pages processed today
          </div>
        </div>

        <div className="kv-panel rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#91A3B6]">
            <span>Eligible Free Vision</span>
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
            {uniquePools.size} independent quota pool(s)
          </div>
        </div>

        <div className="kv-panel rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-[#91A3B6]">
            <span>Tokens & Requests</span>
            <Activity className="w-4 h-4 text-[#1FBFCA]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-semibold font-mono text-[#E8F0F7]">
              {((ledger?.input_tokens_today ?? 0) + (ledger?.output_tokens_today ?? 0)).toLocaleString()}
            </span>
            <span className="text-xs font-mono text-[#91A3B6]">tokens</span>
          </div>
          <div className="mt-1 text-[11px] text-[#91A3B6]">
            {ledger?.requests_today ?? 0} requests · {ledger?.rate_limit_events_today ?? 0} rate-limits
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
            {ledger?.provider_failures_today ?? 0} provider failures today
          </div>
        </div>
      </div>

      {/* Upload + Capacity Estimator */}
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

        {/* Capacity & Quota Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="kv-panel rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#40E9E1]" />
                <h2 className="text-sm font-semibold text-[#E8F0F7]">
                  Free-Tier Capacity & Quotas
                </h2>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#152231] text-[#91A3B6]">
                {capacity?.default_workload_pages ?? 5}p default / {capacity?.max_document_pages ?? 10}p max
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#0B121D] border border-[#91A3B6]/15 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#91A3B6]">Verified Remaining Capacity</span>
                <span className="font-mono text-[#E8F0F7]">
                  {capacity?.verified_remaining_documents !== null &&
                  capacity?.verified_remaining_documents !== undefined
                    ? `~${capacity.verified_remaining_documents} docs`
                    : "Unknown (awaiting header)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#91A3B6]">Estimated Shortfall vs Target</span>
                <span className="font-mono text-[#F6B94A]">
                  {capacity?.shortfall_documents !== null &&
                  capacity?.shortfall_documents !== undefined
                    ? `${capacity.shortfall_documents} docs`
                    : "Unknown"}
                </span>
              </div>
            </div>

            {capacity?.notes && capacity.notes.length > 0 && (
              <ul className="space-y-1.5 text-xs text-[#91A3B6]">
                {capacity.notes.map((n, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#40E9E1] mt-0.5">•</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Shared Quota Pools */}
            <div className="pt-2 border-t border-[#91A3B6]/15 space-y-2">
              <div className="text-xs font-mono uppercase tracking-wider text-[#91A3B6]">
                Active Quota Pools
              </div>
              {uniquePools.size === 0 ? (
                <div className="text-xs text-[#F6B94A] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>No active free-tier pools connected.</span>
                </div>
              ) : (
                Array.from(uniquePools.entries()).map(([poolId, rep]) => (
                  <div
                    key={poolId}
                    className="p-2.5 rounded-lg bg-[#152231]/60 border border-[#91A3B6]/15 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[#E8F0F7]">{poolId}</span>
                      <span className="flex items-center gap-1 text-[10px] font-mono text-[#32D6A0]">
                        <CheckCircle2 className="w-3 h-3" />
                        {rep.quota_source.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#91A3B6] font-mono">
                      <span>
                        Rem Req:{" "}
                        {rep.remaining_daily_requests !== null
                          ? rep.remaining_daily_requests
                          : "unknown"}
                      </span>
                      <span>
                        TPM Limit:{" "}
                        {rep.tokens_per_minute !== null ? rep.tokens_per_minute : "unknown"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {providerErrors.length > 0 && (
              <div className="pt-2 border-t border-[#91A3B6]/15 space-y-1">
                {providerErrors.map((e, i) => (
                  <div key={i} className="text-[11px] text-[#F6B94A] flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      <strong>{e.source}:</strong> {e.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
