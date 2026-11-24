import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Calculator,
  CheckCircle2,
  FileSpreadsheet,
  Globe2,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
  Table2,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "KASHFARA SPREADSHEET — Air-Gapped Agentic AI Spreadsheet for Banking",
  description:
    "Air-gapped agentic spreadsheet for Middle East banking & finance. Replace Excel formulas with k= prompts, color cells, generate pie/bar charts, and audit Arabic-English ledgers.",
  keywords: [
    "agentic spreadsheet",
    "AI spreadsheet",
    "Arabic Excel AI",
    "air-gapped spreadsheet AI",
    "banking ledger reconciliation",
    "Kashfara Spreadsheet",
  ],
  alternates: { canonical: "/spreadsheet" },
  openGraph: {
    title: "KASHFARA SPREADSHEET — Agentic AI Spreadsheet",
    description:
      "Type k= in any cell or command the AI copilot to reconcile ledgers, calculate VAT, translate Arabic-English rows, and generate executive reports.",
    url: "https://kashfara.com/spreadsheet",
  },
};

const BANKING_ADVANTAGES = [
  {
    icon: Building2,
    tag: "Treasury & Banking",
    title: "Automated Ledger & IBAN Reconciliation",
    desc: "Select thousands of settlement rows and instruct the agent to flag mismatched IBANs, duplicate wire references, and multi-currency AED/SAR/USD variances in seconds.",
  },
  {
    icon: Calculator,
    tag: "No Complex Formulas",
    title: "Type k= in Any Cell Instead of VLOOKUP",
    desc: "Skip nested IFs and XLOOKUPs. Type k= calculate 5% VAT on C2 or k= classify vendor B2 as OpEx/CapEx directly in any cell—every cell is AI-wired.",
  },
  {
    icon: BarChart3,
    tag: "Charts, Colors & Reports",
    title: "Instant Pie/Bar Charts, Cell Coloring & Audits",
    desc: "Ask the AI copilot to color-code anomalies, generate pie or bar charts, and produce board-ready financial summaries from any Excel or CSV workbook.",
  },
  {
    icon: ShieldCheck,
    tag: "Air-Gapped On-Premise",
    title: "Zero Token Tension. Zero Data Leakage.",
    desc: "Unlike cloud spreadsheets, Kashfara Spreadsheet deploys directly inside your air-gapped banking or enterprise infrastructure—no external tokens, no per-seat API limits, 100% data sovereignty.",
  },
];

export default function SpreadsheetMarketingPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] selection:bg-black selection:text-white">
      {/* Sticky Glassmorphic Header */}
      <header className="sticky top-0 z-50 apple-glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6E73] hover:text-black"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kashfara</span>
            </Link>
            <span className="text-black/20">/</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
                <FileSpreadsheet className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-black">
                KASHFARA <span className="font-light text-[#6E6E73]">SPREADSHEET</span>
              </span>
            </div>
          </div>

          <Link
            href="/spreadsheet/demo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-[#1D1D1F] shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-16 pb-20 sm:pt-24 sm:pb-24 px-4 sm:px-6 text-center relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_70%)]"
          />
          <div className="relative max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-surface text-[11px] font-mono uppercase tracking-widest text-black">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>Preview Release · Agentic Financial Spreadsheet</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-black leading-[1.06]">
              Every Cell Is Alive.
              <br />
              <span className="text-[#6E6E73]">Just Type k= and Command.</span>
            </h1>

            <p className="text-base sm:text-xl text-[#6E6E73] max-w-2xl mx-auto leading-relaxed">
              Built for Middle East banking, treasury, and enterprise finance teams. Import any Excel or CSV workbook, edit with natural language, run <code className="px-2 py-0.5 rounded bg-[#F5F5F7] text-black font-mono text-sm">k=</code> AI prompts inside any cell, and export audit-ready reports.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/spreadsheet/demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-black hover:bg-[#1D1D1F] text-white text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Live Demo — Kashfara Spreadsheet</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:enquiry@kashfara.com?subject=Kashfara%20Spreadsheet%20Air-Gapped%20Enterprise%20Inquiry"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full apple-glass text-black text-sm font-semibold hover:bg-[#F5F5F7] transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>Contact Sales</span>
              </a>
            </div>
          </div>

          {/* Visual Preview Mockup */}
          <div className="max-w-5xl mx-auto mt-16 apple-card rounded-3xl p-4 sm:p-6 bg-[#F5F5F7]/80 text-left">
            <div className="rounded-2xl bg-white border border-black/10 overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-[#F5F5F7] border-b border-black/8 flex items-center justify-between text-xs font-mono text-[#6E6E73]">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-black" />
                  <span>Q4_GCC_Treasury_Ledger.xlsx</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-black text-white text-[10px]">
                  fx: k= calculate 5% UAE VAT on C2
                </span>
              </div>
              <div className="grid grid-cols-4 text-xs border-b border-black/8 bg-[#F5F5F7]/50 font-mono text-[#6E6E73]">
                <div className="p-2.5 border-r border-black/8">A · Entity</div>
                <div className="p-2.5 border-r border-black/8">B · Currency</div>
                <div className="p-2.5 border-r border-black/8">C · Net Amount</div>
                <div className="p-2.5">D · k= AI Formula</div>
              </div>
              {[
                ["Emirates Logistics LLC", "AED", "120,000.00", "AED 6,000.00 (5% VAT)"],
                ["شركة المدار للتجارة", "SAR", "85,500.00", "SAR 12,825.00 (15% ZATCA)"],
                ["Gulf Clearing House", "USD", "42,000.00", "Verified · Zero Anomalies"],
              ].map((row, idx) => (
                <div key={idx} className="grid grid-cols-4 text-xs border-b border-black/5">
                  <div className="p-3 border-r border-black/5 font-medium text-black" dir="auto">
                    {row[0]}
                  </div>
                  <div className="p-3 border-r border-black/5 font-mono text-[#6E6E73]">{row[1]}</div>
                  <div className="p-3 border-r border-black/5 font-mono text-black">{row[2]}</div>
                  <div className="p-3 font-mono text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{row[3]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Middle East Banking & Enterprise Advancements */}
        <section className="py-20 px-4 sm:px-6 bg-[#F5F5F7]">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <div className="text-xs font-mono uppercase tracking-widest text-[#6E6E73]">
                ENTERPRISE &amp; BANKING AUTOMATION
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
                Built for High-Stakes Financial Operations.
              </h2>
              <p className="text-base text-[#6E6E73]">
                From GCC commercial banks to regional holding groups, Kashfara Spreadsheet turns hours of manual Excel wrangling into one-line agentic execution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {BANKING_ADVANTAGES.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="apple-card rounded-3xl p-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[#6E6E73]">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-black pt-1">{item.title}</h3>
                    <p className="text-sm text-[#6E6E73] leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Capabilities Strip */}
        <section className="py-16 px-4 sm:px-6 bg-white border-t border-black/8">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="p-6 rounded-2xl apple-surface space-y-2">
              <Zap className="w-5 h-5 text-black" />
              <div className="font-semibold text-black">Instant XLSX &amp; CSV Import/Export</div>
              <p className="text-xs text-[#6E6E73]">
                Load multi-sheet workbooks directly in the browser, edit manually or via AI, and export clean .xlsx or .csv files.
              </p>
            </div>
            <div className="p-6 rounded-2xl apple-surface space-y-2">
              <Layers className="w-5 h-5 text-black" />
              <div className="font-semibold text-black">Range-Aware Agentic Copilot</div>
              <p className="text-xs text-[#6E6E73]">
                Highlight any range like B2:E12 and ask the collapsible AI sidebar to audit, summarize, translate, or add computed columns.
              </p>
            </div>
            <div className="p-6 rounded-2xl apple-surface space-y-2">
              <Globe2 className="w-5 h-5 text-black" />
              <div className="font-semibold text-black">Air-Gapped &amp; Bilingual Ready</div>
              <p className="text-xs text-[#6E6E73]">
                Deployed inside your private network for Arabic &amp; English workbooks with zero external data leakage.
              </p>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-4 sm:px-6 bg-[#F5F5F7]">
          <div className="max-w-4xl mx-auto rounded-3xl bg-black text-white p-8 sm:p-12 text-center space-y-5">
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
              Try Kashfara Spreadsheet Live
            </h2>
            <p className="text-sm text-white/70 max-w-xl mx-auto">
              Test our pre-loaded GCC Banking &amp; Treasury sample ledger, or contact our enterprise team for air-gapped on-premise deployment.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/spreadsheet/demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black hover:bg-white/90 text-sm font-semibold"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Spreadsheet Live Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:enquiry@kashfara.com?subject=Kashfara%20Spreadsheet%20Enterprise%20Sales"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/25 text-white hover:bg-white/10 text-sm font-semibold"
              >
                <Mail className="w-4 h-4" />
                <span>enquiry@kashfara.com</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
