"use client";

import React from "react";
import {
  LayoutDashboard,
  ScanSearch,
  History,
  MessageSquareQuote,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type NavSection =
  | "overview"
  | "workspace"
  | "history"
  | "qa"
  | "forms"
  | "settings";

interface AppShellProps {
  activeNav: NavSection;
  onSelectNav: (nav: NavSection) => void;
  eligibleVisionCount: number;
  dailyDocsProcessed: number;
  dailyTarget: number;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "workspace", label: "Document Workspace", icon: ScanSearch },
  { id: "history", label: "Extraction History", icon: History },
  { id: "qa", label: "Document Q&A", icon: MessageSquareQuote },
  { id: "forms", label: "Digital Forms", icon: FileSpreadsheet },
  { id: "settings", label: "Platform Settings", icon: Settings },
];

export function AppShell({
  activeNav,
  onSelectNav,
  eligibleVisionCount,
  dailyDocsProcessed,
  dailyTarget,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-screen flex bg-[#080D15] text-[#E8F0F7]">
      {/* Left Navigation Rail */}
      <aside className="no-print w-64 shrink-0 bg-[#0B121D] border-r border-[#91A3B6]/15 flex flex-col">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#91A3B6]/15">
          <div className="w-8 h-8 rounded-lg bg-[#40E9E1]/15 border border-[#40E9E1]/50 flex items-center justify-center shadow-[0_0_16px_rgba(64,233,225,0.2)]">
            <ScanSearch className="w-4 h-4 text-[#40E9E1]" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wider text-[#E8F0F7]">
              KASHFARA <span className="text-[#40E9E1]">VISION</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#91A3B6]">
              Enterprise Doc AI
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectNav(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-[#152231] text-[#40E9E1] border border-[#40E9E1]/35 shadow-[0_0_14px_rgba(64,233,225,0.08)]"
                    : "text-[#91A3B6] hover:text-[#E8F0F7] hover:bg-[#101A27] border border-transparent"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-[#40E9E1]" : "text-[#91A3B6]"
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#91A3B6]/15 space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#91A3B6] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#32D6A0]" />
              Kashfara Security
            </span>
            <span className="font-mono px-1.5 py-0.5 rounded text-[10px] bg-[#32D6A0]/15 text-[#32D6A0] border border-[#32D6A0]/30">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[#91A3B6] flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#40E9E1]" />
              Vision Cores
            </span>
            <span className="font-mono text-[#E8F0F7]">{eligibleVisionCount}</span>
          </div>

          <div className="pt-1">
            <div className="flex justify-between text-[11px] text-[#91A3B6] mb-1">
              <span>Daily Volume</span>
              <span className="font-mono text-[#E8F0F7]">
                {dailyDocsProcessed}/{dailyTarget}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#152231] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#1FBFCA] to-[#40E9E1] transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((dailyDocsProcessed / Math.max(1, dailyTarget)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print h-14 px-6 bg-[#0B121D]/80 backdrop-blur border-b border-[#91A3B6]/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-[#40E9E1]">
              {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
            </span>
            <span className="text-[#91A3B6]/40">|</span>
            <span className="text-xs text-[#91A3B6]">
              Multimodal Document Intelligence &amp; Proofing Workstation
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span
              className={cn(
                "px-2.5 py-1 rounded-full border flex items-center gap-1.5",
                eligibleVisionCount > 0
                  ? "bg-[#32D6A0]/10 border-[#32D6A0]/30 text-[#32D6A0]"
                  : "bg-[#F6B94A]/10 border-[#F6B94A]/30 text-[#F6B94A]"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  eligibleVisionCount > 0 ? "bg-[#32D6A0]" : "bg-[#F6B94A]"
                )}
              />
              {eligibleVisionCount > 0
                ? "KASHFARA ENGINE ONLINE"
                : "ENGINE STANDBY"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto kv-grid-bg p-6">{children}</main>
      </div>
    </div>
  );
}
