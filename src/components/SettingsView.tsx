"use client";

import React from "react";
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import type { ProviderEligibility } from "@/types/kashfara";

interface SettingsViewProps {
  freeOnlyMode: boolean;
  providers: ProviderEligibility[];
  onRefreshProviders: () => void;
}

export function SettingsView({
  freeOnlyMode,
  providers,
  onRefreshProviders,
}: SettingsViewProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="kv-panel rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-[#32D6A0] shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-semibold text-[#E8F0F7]">
              Free-Tier Intelligence & Compliance Registry
            </h2>
            <p className="text-xs text-[#91A3B6] mt-0.5">
              FREE_ONLY_MODE is{" "}
              <span className="font-mono text-[#32D6A0]">
                {freeOnlyMode ? "ENABLED (strict zero-cost routing)" : "DISABLED"}
              </span>
              . Models without verified free-tier status, vision support, or approved terms are excluded below with explicit reasons.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshProviders}
          className="px-3.5 py-2 rounded-lg bg-[#152231] hover:border-[#40E9E1]/50 border border-[#91A3B6]/25 text-xs text-[#E8F0F7] flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#40E9E1]" />
          Re-discover Models
        </button>
      </div>

      <div className="kv-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#0B121D] text-[#91A3B6] font-mono uppercase border-b border-[#91A3B6]/15">
              <tr>
                <th className="px-4 py-3">Provider / Model</th>
                <th className="px-4 py-3">Vision</th>
                <th className="px-4 py-3">Free Tier</th>
                <th className="px-4 py-3">Terms</th>
                <th className="px-4 py-3">Quota Source</th>
                <th className="px-4 py-3">Routing Status</th>
              </tr>
            </thead>
            <tbody>
              {providers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#91A3B6]">
                    No models discovered yet. Configure GROQ_API_KEY or OMNIROUTE_BASE_URL in .env.local.
                  </td>
                </tr>
              ) : (
                providers.map((p) => (
                  <tr
                    key={`${p.provider}:${p.model}`}
                    className="border-b border-[#91A3B6]/10 hover:bg-[#152231]/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-mono text-[#E8F0F7]">{p.model}</div>
                      <div className="text-[10px] font-mono text-[#91A3B6]">
                        {p.provider} · pool: {p.shared_quota_pool}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.supports_vision ? (
                        <span className="text-[#32D6A0] font-mono">YES</span>
                      ) : (
                        <span className="text-[#91A3B6] font-mono">NO</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {p.is_free ? (
                        <span className="text-[#32D6A0]">{p.free_tier_type}</span>
                      ) : (
                        <span className="text-[#F87171]">{p.free_tier_type}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {p.terms_approved ? (
                        <span className="text-[#32D6A0]">Approved</span>
                      ) : (
                        <span className="text-[#F87171]">Unverified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#91A3B6]">{p.quota_source}</td>
                    <td className="px-4 py-3">
                      {p.eligible_for_routing && p.supports_vision ? (
                        <span className="inline-flex items-center gap-1 text-[#32D6A0] font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Eligible (Vision)
                        </span>
                      ) : (
                        <span className="inline-flex items-start gap-1 text-[#F6B94A]">
                          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>
                            {p.excluded_reason || "Text-only / not eligible for document vision"}
                          </span>
                        </span>
                      )}
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
