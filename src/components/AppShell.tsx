"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ScanSearch,
  History,
  MessageSquareQuote,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  ArrowLeft,
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
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "overview", label: "Live Upload", shortLabel: "Upload", icon: LayoutDashboard },
  { id: "workspace", label: "Document Proofing", shortLabel: "Proofing", icon: ScanSearch },
  { id: "qa", label: "Document Q&A", shortLabel: "Q&A", icon: MessageSquareQuote },
  { id: "forms", label: "Digital Forms", shortLabel: "Forms", icon: FileSpreadsheet },
  { id: "history", label: "Session History", shortLabel: "History", icon: History },
  { id: "settings", label: "Platform Info", shortLabel: "Info", icon: Settings },
];

export function AppShell({
  activeNav,
  onSelectNav,
  eligibleVisionCount,
  children,
}: AppShellProps) {
  useEffect(() => {
    console.info(
      "%c🔒 KASHFARA VISION — SECURED SESSION",
      "background:#000;color:#fff;padding:4px 10px;border-radius:6px;font-weight:600;",
      "Kashfara runtime logs and document intelligence pipelines are encrypted in transit and isolated from persistent client storage."
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F5F5F7] text-[#1D1D1F]">
      {/* Desktop Left Sidebar */}
      <aside className="no-print hidden md:flex w-64 shrink-0 bg-white/80 backdrop-blur-xl border-r border-black/8 flex-col">
        <div className="h-16 px-5 flex items-center justify-between border-b border-black/8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
              <ScanSearch className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-black">
                KASHFARA
              </div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[#6E6E73]">
                Live Demo
              </div>
            </div>
          </Link>
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
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-black text-white shadow-sm"
                    : "text-[#6E6E73] hover:text-black hover:bg-black/5"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-white" : "text-[#6E6E73]"
                  )}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-black/8 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#6E6E73] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-black" />
              Engine Status
            </span>
            <span className="font-mono px-2 py-0.5 rounded-full text-[10px] bg-black text-white">
              {eligibleVisionCount > 0 ? "ONLINE" : "READY"}
            </span>
          </div>
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-black/10 text-xs font-medium text-black hover:bg-black/5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <header className="no-print sticky top-0 z-30 h-14 px-4 sm:px-6 apple-glass flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="md:hidden inline-flex items-center gap-1.5 text-xs font-medium text-black"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </Link>
            <span className="hidden md:inline text-xs font-mono uppercase tracking-widest text-black font-semibold">
              {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
            </span>
            <span className="hidden sm:inline text-black/20">|</span>
            <span className="hidden sm:inline text-xs text-[#6E6E73]">
              OCR + Vision Proof-of-Evidence Workstation
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="px-2.5 py-1 rounded-full bg-black text-white flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              KASHFARA LIVE
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>

      {/* Mobile iOS-style Bottom Tab Bar */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 apple-glass border-t border-black/10 flex items-center justify-around px-1 py-1.5">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectNav(item.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-colors",
                isActive ? "text-black font-semibold" : "text-[#6E6E73]"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
