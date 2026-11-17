"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  FileCheck2,
  FileSpreadsheet,
  Globe2,
  Layers,
  Menu,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

interface DemoScenario {
  id: string;
  tab: string;
  badge: string;
  titleAr: string;
  titleEn: string;
  docLines: Array<{
    labelAr: string;
    labelEn: string;
    value: string;
    box: { top: string; left: string; width: string; height: string };
  }>;
  extracted: Array<{
    key: string;
    label: string;
    value: string;
    coords: string;
    status: "VERIFIED";
  }>;
}

const SCENARIOS: DemoScenario[] = [
  {
    id: "invoice",
    tab: "Arabic-English Invoice",
    badge: "FTA / ZATCA Ready",
    titleAr: "فاتورة ضريبية",
    titleEn: "TAX INVOICE",
    docLines: [
      {
        labelAr: "رقم الفاتورة",
        labelEn: "Invoice No",
        value: "INV-2026-8841",
        box: { top: "24%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "اسم المورد",
        labelEn: "Vendor",
        value: "شركة النخبة للتجارة ذ.م.م",
        box: { top: "42%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "ضريبة القيمة المضافة",
        labelEn: "VAT (5%)",
        value: "AED 1,425.00",
        box: { top: "60%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "الإجمالي المستحق",
        labelEn: "Total Due",
        value: "AED 29,925.00",
        box: { top: "78%", left: "8%", width: "84%", height: "14%" },
      },
    ],
    extracted: [
      { key: "invoice_number", label: "رقم الفاتورة / Invoice No", value: "INV-2026-8841", coords: "p.1 (0.08, 0.24)", status: "VERIFIED" },
      { key: "vendor_name", label: "المورد / Vendor", value: "شركة النخبة للتجارة ذ.م.م", coords: "p.1 (0.08, 0.42)", status: "VERIFIED" },
      { key: "vat_amount", label: "الضريبة / VAT (5%)", value: "AED 1,425.00", coords: "p.1 (0.08, 0.60)", status: "VERIFIED" },
      { key: "total_amount", label: "الإجمالي / Total Due", value: "AED 29,925.00", coords: "p.1 (0.08, 0.78)", status: "VERIFIED" },
    ],
  },
  {
    id: "license",
    tab: "UAE Trade License",
    badge: "DED / PRO Automation",
    titleAr: "رخصة تجارية",
    titleEn: "COMMERCIAL LICENSE",
    docLines: [
      {
        labelAr: "رقم الرخصة",
        labelEn: "License No",
        value: "CN-4091822",
        box: { top: "24%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "الاسم التجاري",
        labelEn: "Trade Name",
        value: "مجموعة المدار الذكية",
        box: { top: "42%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "الشكل القانوني",
        labelEn: "Legal Type",
        value: "ذات مسؤولية محدودة (LLC)",
        box: { top: "60%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "تاريخ الانتهاء",
        labelEn: "Expiry Date",
        value: "2027-10-31",
        box: { top: "78%", left: "8%", width: "84%", height: "14%" },
      },
    ],
    extracted: [
      { key: "license_number", label: "رقم الرخصة / License No", value: "CN-4091822", coords: "p.1 (0.08, 0.24)", status: "VERIFIED" },
      { key: "trade_name", label: "الاسم التجاري / Trade Name", value: "مجموعة المدار الذكية", coords: "p.1 (0.08, 0.42)", status: "VERIFIED" },
      { key: "legal_form", label: "الشكل القانوني / Legal Type", value: "LLC · ذات مسؤولية محدودة", coords: "p.1 (0.08, 0.60)", status: "VERIFIED" },
      { key: "expiry_date", label: "تاريخ الانتهاء / Expiry", value: "2027-10-31", coords: "p.1 (0.08, 0.78)", status: "VERIFIED" },
    ],
  },
  {
    id: "contract",
    tab: "Bilingual Contract",
    badge: "Legal & HR",
    titleAr: "عقد عمل محدد المدة",
    titleEn: "EMPLOYMENT CONTRACT",
    docLines: [
      {
        labelAr: "الطرف الأول",
        labelEn: "Employer",
        value: "Kashfara Holdings Ltd.",
        box: { top: "24%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "الموظف",
        labelEn: "Employee",
        value: "أحمد بن سعيد المنصوري",
        box: { top: "42%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "الراتب الأساسي",
        labelEn: "Basic Salary",
        value: "SAR 18,500 / month",
        box: { top: "60%", left: "8%", width: "84%", height: "14%" },
      },
      {
        labelAr: "توقيع الطرفين",
        labelEn: "Signatures",
        value: "2 Verified Signatures & Stamp",
        box: { top: "78%", left: "8%", width: "84%", height: "14%" },
      },
    ],
    extracted: [
      { key: "employer", label: "الطرف الأول / Employer", value: "Kashfara Holdings Ltd.", coords: "p.1 (0.08, 0.24)", status: "VERIFIED" },
      { key: "employee_name", label: "الموظف / Employee", value: "أحمد بن سعيد المنصوري", coords: "p.1 (0.08, 0.42)", status: "VERIFIED" },
      { key: "basic_salary", label: "الراتب / Basic Salary", value: "SAR 18,500 / month", coords: "p.1 (0.08, 0.60)", status: "VERIFIED" },
      { key: "execution_proof", label: "التوقيع والختم / Execution", value: "Signed & Stamped", coords: "p.1 (0.08, 0.78)", status: "VERIFIED" },
    ],
  },
];

const USE_CASES = [
  {
    icon: FileSpreadsheet,
    region: "UAE & Saudi Arabia",
    title: "Finance, VAT & ZATCA Compliance",
    desc: "Automate Arabic-English tax invoices, bank statements, and vendor receipts with line-item table extraction and TRN verification.",
  },
  {
    icon: ShieldCheck,
    region: "Government & PRO",
    title: "Identity, Licensing & Permits",
    desc: "Digitalize Emirates IDs, Trade Licenses, Visas, and Municipality certificates into structured schemas in seconds.",
  },
  {
    icon: Globe2,
    region: "Legal & Enterprise HR",
    title: "Bilingual Contracts & Onboarding",
    desc: "Extract clauses, parties, dates, stamps, and handwritten signatures from mixed RTL/LTR agreements and application forms.",
  },
  {
    icon: Layers,
    region: "Logistics & Trade",
    title: "Customs, Bills of Lading & Ports",
    desc: "Turn multi-page shipping manifests, delivery notes, and customs declarations into ERP-ready JSON and CSV exports.",
  },
];

export function LandingPage() {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const scenario = SCENARIOS[activeScenarioIdx];

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] selection:bg-black selection:text-white">
      {/* Sticky iOS-Style Glassmorphic Header */}
      <header className="sticky top-0 z-50 apple-glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-sm">
              <ScanSearch className="w-4 h-4" />
            </div>
            <div className="leading-tight">
              <span className="text-sm font-semibold tracking-tight text-black">
                KASHFARA
              </span>
              <span className="text-sm font-light tracking-tight text-[#6E6E73] ml-1">
                VISION
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#6E6E73]">
            <a href="#architecture" className="hover:text-black transition-colors">
              OCR + Vision
            </a>
            <a href="#showcase" className="hover:text-black transition-colors">
              Proof of Evidence
            </a>
            <a href="#use-cases" className="hover:text-black transition-colors">
              Middle East Use Cases
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/demo"
              className="group relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-black bg-white/80 hover:bg-black hover:text-white border border-black/15 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-300"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Live Demo</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-[#1D1D1F] hover:bg-black/5"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-black/10 bg-white/95 backdrop-blur-xl px-6 py-4 space-y-3 text-sm font-medium"
            >
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-[#1D1D1F]"
              >
                OCR + Vision
              </a>
              <a
                href="#showcase"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-[#1D1D1F]"
              >
                Proof of Evidence
              </a>
              <a
                href="#use-cases"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-1 text-[#1D1D1F]"
              >
                Middle East Use Cases
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28 px-4 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_70%)]"
        />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-surface text-[11px] font-mono uppercase tracking-widest text-[#1D1D1F]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-black" />
            <span>OCR + Vision · Built for Arabic &amp; English</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="text-4xl sm:text-6xl font-semibold tracking-tight text-black leading-[1.06]"
          >
            Document Intelligence,
            <br />
            <span className="text-[#6E6E73]">Engineered for Precision.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="text-base sm:text-xl text-[#6E6E73] max-w-2xl mx-auto leading-relaxed"
          >
            Kashfara Vision combines fast structural OCR parsing with multimodal vision reasoning — delivering{" "}
            <span className="text-black font-medium">low-compute, high-accuracy</span>{" "}
            understanding for Arabic RTL, English, and bilingual enterprise documents.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="pt-2 flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-black hover:bg-[#1D1D1F] text-white text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition-all hover:scale-[1.02]"
            >
              <span>Try Live Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#use-cases"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full apple-glass text-black text-sm font-medium hover:bg-[#F5F5F7] transition-all"
            >
              <span>Explore Automation</span>
            </a>
          </motion.div>
        </div>

        {/* Interactive Animated Arabic & English Extraction Showcase */}
        <div id="showcase" className="max-w-5xl mx-auto mt-16 sm:mt-20">
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {SCENARIOS.map((sc, idx) => (
              <button
                key={sc.id}
                onClick={() => setActiveScenarioIdx(idx)}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
                  activeScenarioIdx === idx
                    ? "bg-black text-white shadow-sm"
                    : "bg-[#F5F5F7] text-[#6E6E73] hover:text-black"
                }`}
              >
                {sc.tab}
              </button>
            ))}
          </div>

          <div className="apple-card rounded-3xl p-4 sm:p-8 bg-[#F5F5F7]/70 backdrop-blur-xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={scenario.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
              >
                {/* Left: Simulated Bilingual Document with Animated Laser Scan */}
                <div className="lg:col-span-6 relative rounded-2xl bg-white border border-black/10 p-5 sm:p-6 shadow-sm overflow-hidden min-h-[340px]">
                  {/* Animated Scan Line */}
                  <motion.div
                    initial={{ top: "0%" }}
                    animate={{ top: ["0%", "96%", "0%"] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                    className="pointer-events-none absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-black to-transparent opacity-60 z-20"
                  />

                  <div className="flex items-start justify-between border-b border-black/10 pb-3 mb-4">
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-[#6E6E73]">
                        {scenario.titleEn}
                      </div>
                      <div className="text-lg font-bold text-black mt-0.5" dir="rtl">
                        {scenario.titleAr}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#F5F5F7] text-black border border-black/10">
                      {scenario.badge}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {scenario.docLines.map((line, i) => (
                      <motion.div
                        key={line.labelEn}
                        initial={{ opacity: 0.5, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative p-3 rounded-xl border border-black/15 bg-[#F5F5F7]/60 flex items-center justify-between gap-3"
                      >
                        <div className="text-left">
                          <div className="text-[10px] font-mono uppercase text-[#6E6E73]">
                            {line.labelEn}
                          </div>
                          <div className="text-xs sm:text-sm font-semibold text-black" dir="auto">
                            {line.value}
                          </div>
                        </div>
                        <div className="text-right text-xs font-medium text-[#6E6E73]" dir="rtl">
                          {line.labelAr}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Right: Real-Time Proof-of-Evidence Output */}
                <div className="lg:col-span-6 rounded-2xl bg-black text-white p-5 sm:p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/15">
                      <div className="flex items-center gap-2 text-xs font-mono text-white/80">
                        <FileCheck2 className="w-4 h-4 text-white" />
                        <span>PROOF OF EVIDENCE OUTPUT</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-white">
                        OCR + VISION
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {scenario.extracted.map((item, idx) => (
                        <motion.div
                          key={item.key}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.08 * idx }}
                          className="p-3 rounded-xl bg-white/10 border border-white/10 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] text-white/60 truncate" dir="auto">
                              {item.label}
                            </div>
                            <div className="text-sm font-medium text-white truncate" dir="auto">
                              {item.value}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white text-black font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              {item.status}
                            </span>
                            <div className="text-[10px] font-mono text-white/50 mt-1">
                              {item.coords}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
                    <span className="font-mono">RTL + LTR Dual-Script Verified</span>
                    <Link
                      href="/demo"
                      className="text-white font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      Test your document <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Architecture Section: Low Compute, High Accuracy */}
      <section id="architecture" className="py-20 px-4 sm:px-6 bg-[#F5F5F7]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-[#6E6E73]">
              HYBRID ARCHITECTURE
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
              OCR Speed. Vision Intelligence.
            </h2>
            <p className="text-base text-[#6E6E73]">
              Instead of brute-forcing raw pixels with heavy compute, Kashfara parses structure first and pairs it with targeted multimodal vision reasoning.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="apple-card rounded-3xl p-7 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono text-[#6E6E73]">01 · LOW COMPUTE</div>
              <h3 className="text-lg font-semibold text-black">Fast Structural &amp; OCR Parsing</h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                PDFs and Office files are parsed for native text layers and page geometry in milliseconds, keeping token usage lean and responses fast.
              </p>
            </div>

            <div className="apple-card rounded-3xl p-7 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                <Globe2 className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono text-[#6E6E73]">02 · ARABIC + ENGLISH</div>
              <h3 className="text-lg font-semibold text-black">Bilingual Vision Reasoning</h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                Preserves Arabic RTL script, English LTR text, tables, checkboxes, stamps, and handwritten signatures across structured and unstructured layouts.
              </p>
            </div>

            <div className="apple-card rounded-3xl p-7 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono text-[#6E6E73]">03 · AUDITABLE</div>
              <h3 className="text-lg font-semibold text-black">Proof-of-Evidence Marking</h3>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                Every extracted field links back to its source page, verbatim quote, and normalized bounding box — zero blind guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Middle East Use Cases */}
      <section id="use-cases" className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-3">
              <div className="text-xs font-mono uppercase tracking-widest text-[#6E6E73]">
                MIDDLE EAST ENTERPRISE AUTOMATION
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
                Built for Real Business Workflows.
              </h2>
            </div>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 text-sm font-semibold text-black hover:underline"
            >
              Launch interactive workspace <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              return (
                <div
                  key={uc.title}
                  className="apple-surface rounded-3xl p-7 hover:bg-white hover:shadow-[0_12px_36px_rgba(0,0,0,0.06)] transition-all duration-300 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-black/10 flex items-center justify-center text-black">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white border border-black/10 text-[#6E6E73]">
                      {uc.region}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-black pt-1">{uc.title}</h3>
                  <p className="text-sm text-[#6E6E73] leading-relaxed">{uc.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 sm:px-6 bg-[#F5F5F7]">
        <div className="max-w-4xl mx-auto rounded-3xl bg-black text-white p-8 sm:p-14 text-center space-y-6 shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            See Kashfara Vision on Your Own Documents.
          </h2>
          <p className="text-sm sm:text-base text-white/70 max-w-xl mx-auto">
            Upload any Arabic, English, or bilingual PDF, image, or Office document in the Live Demo to inspect extracted fields, tables, digital forms, and grounded Q&amp;A.
          </p>
          <div>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black hover:bg-white/90 text-sm font-semibold transition-transform hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Open Live Demo</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/10 py-8 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E6E73]">
          <div className="flex items-center gap-2 font-medium text-black">
            <ScanSearch className="w-4 h-4" />
            <span>KASHFARA VISION</span>
          </div>
          <div>Arabic &amp; English Multimodal Document Intelligence</div>
        </div>
      </footer>
    </div>
  );
}
