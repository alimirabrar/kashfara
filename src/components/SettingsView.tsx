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
      <div className="kv-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-[#32D6A0] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-[#E8F0F7]">
              Kashfara Vision Platform Configuration
            </h2>
            <p className="text-xs text-[#91A3B6] mt-0.5">
              Enterprise multimodal routing, strict data isolation, and evidence verification controls.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshProviders}
          className="px-3.5 py-2 rounded-lg bg-[#152231] hover:border-[#40E9E1]/50 border border-[#91A3B6]/25 text-xs text-[#E8F0F7] flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#40E9E1]" />
          Refresh Engine Status
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kv-panel rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#40E9E1]">
            <Cpu className="w-4 h-4" />
            <span>VISION PIPELINE</span>
          </div>
          <div className="text-2xl font-semibold font-mono text-[#E8F0F7]">
            {visionCount} <span className="text-xs text-[#91A3B6]">Active Cores</span>
          </div>
          <div className="text-xs text-[#91A3B6]">
            Multimodal OCR, layout analysis, handwriting &amp; stamp detection.
          </div>
        </div>

        <div className="kv-panel rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#32D6A0]">
            <CheckCircle2 className="w-4 h-4" />
            <span>REASONING &amp; Q&amp;A</span>
          </div>
          <div className="text-2xl font-semibold font-mono text-[#E8F0F7]">
            {reasoningCount} <span className="text-xs text-[#91A3B6]">Active Cores</span>
          </div>
          <div className="text-xs text-[#91A3B6]">
            Structured schema extraction, Arabic-English understanding &amp; grounded Q&amp;A.
          </div>
        </div>

        <div className="kv-panel rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono text-[#1FBFCA]">
            <Lock className="w-4 h-4" />
            <span>DATA PROTECTION</span>
          </div>
          <div className="text-2xl font-semibold font-mono text-[#32D6A0]">ENFORCED</div>
          <div className="text-xs text-[#91A3B6]">
            Private server-side processing, magic-byte validation &amp; prompt-injection isolation.
          </div>
        </div>
      </div>

      <div className="kv-panel rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#E8F0F7]">Operational Limits</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-[#0B121D] border border-[#91A3B6]/15">
            <div className="text-[#91A3B6]">Max Upload Size</div>
            <div className="font-mono text-sm text-[#E8F0F7] mt-1">20 MB / file</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B121D] border border-[#91A3B6]/15">
            <div className="text-[#91A3B6]">Max Pages / Document</div>
            <div className="font-mono text-sm text-[#E8F0F7] mt-1">10 pages</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0B121D] border border-[#91A3B6]/15">
            <div className="text-[#91A3B6]">Supported Formats</div>
            <div className="font-mono text-sm text-[#E8F0F7] mt-1">
              PDF, PNG, JPG, WEBP, TIFF, DOCX, PPTX, XLSX
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
