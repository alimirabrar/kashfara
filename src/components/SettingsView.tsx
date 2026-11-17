"use client";

import React from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, Cpu, Lock } from "lucide-react";
import type { ProviderEligibility } from "@/types/kashfara";

interface SettingsViewProps {
  providers: ProviderEligibility[];
  onRefreshProviders: () => void;
}

export function SettingsView({ providers, onRefreshProviders }: SettingsViewProps) {
  const visionCount = providers.filter(
    (p) => p.eligible_for_routing && p.supports_vision
  ).length;
  const reasoningCount = providers.filter(
    (p) => p.eligible_for_routing && p.supports_structured_output
  ).length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="apple-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-black shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-black">
              Kashfara Vision Platform Architecture
            </h2>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              Low-compute OCR + Vision pipeline with strict data isolation and proof-of-evidence verification.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshProviders}
          className="px-4 py-2 rounded-full bg-black text-white text-xs font-medium flex items-center gap-1.5 hover:bg-[#1D1D1F]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="apple-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-black">
            <Cpu className="w-4 h-4" />
            <span>VISION PIPELINE</span>
          </div>
          <div className="text-2xl font-semibold font-mono text-black">
            {visionCount || 1} <span className="text-xs text-[#6E6E73]">Active Cores</span>
          </div>
          <div className="text-xs text-[#6E6E73]">
            Multimodal OCR, layout analysis, handwriting &amp; stamp detection.
          </div>
        </div>

        <div className="apple-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-black">
            <CheckCircle2 className="w-4 h-4" />
            <span>REASONING &amp; Q&amp;A</span>
          </div>
          <div className="text-2xl font-semibold font-mono text-black">
            {reasoningCount || 1} <span className="text-xs text-[#6E6E73]">Active Cores</span>
          </div>
          <div className="text-xs text-[#6E6E73]">
            Structured schema extraction, Arabic-English understanding &amp; grounded Q&amp;A.
          </div>
        </div>

        <div className="apple-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-black">
            <Lock className="w-4 h-4" />
            <span>DATA PROTECTION</span>
          </div>
          <div className="text-2xl font-semibold font-mono text-emerald-700">STATELESS</div>
          <div className="text-xs text-[#6E6E73]">
            Zero persistent server file storage, magic-byte validation &amp; prompt-injection isolation.
          </div>
        </div>
      </div>

      <div className="apple-card rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-black">Operational Limits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#F5F5F7]">
            <div className="text-[#6E6E73]">Max Upload Size</div>
            <div className="font-mono text-sm text-black mt-1">20 MB / file</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F5F5F7]">
            <div className="text-[#6E6E73]">Max Pages / Document</div>
            <div className="font-mono text-sm text-black mt-1">10 pages</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#F5F5F7]">
            <div className="text-[#6E6E73]">Supported Formats</div>
            <div className="font-mono text-sm text-black mt-1">
              PDF, PNG, JPG, WEBP, TIFF, DOCX, PPTX, XLSX
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
