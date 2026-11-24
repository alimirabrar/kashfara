"use client";

import React, { useState } from "react";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  Languages,
  Loader2,
  Receipt,
  Scale,
  Sparkles,
  UserCheck,
  AlertCircle,
} from "lucide-react";
import { parseApiResponse } from "@/lib/api-response";
import { mergePageImagesFromClient, stripPageImagesForApi } from "@/lib/utils";
import type { AtsResult, DocumentRecord } from "@/types/kashfara";

interface TemplatePanelsProps {
  doc: DocumentRecord;
  onDocumentUpdated: (doc: DocumentRecord) => void;
}

const TEMPLATE_META: Record<
  string,
  { title: string; icon: React.ComponentType<{ className?: string }> }
> = {
  resume: { title: "Resume & Candidate Profile", icon: UserCheck },
  invoice: { title: "Tax / Commercial Invoice", icon: FileText },
  bank_statement: { title: "Banking & Financial Statement", icon: Building2 },
  contract: { title: "Legal / Commercial Contract", icon: Scale },
  receipt: { title: "Payment Receipt / Voucher", icon: Receipt },
  generic: { title: "Structured Document Summary", icon: Sparkles },
};

function renderVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function TemplatePanels({ doc, onDocumentUpdated }: TemplatePanelsProps) {
  const intel = doc.intelligence;
  const [jd, setJd] = useState(intel?.job_description || "");
  const [atsBusy, setAtsBusy] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);

  if (!intel) {
    return (
      <div className="p-6 text-center text-xs text-[#6E6E73]">
        Smart template &amp; translation will appear once AI reasoning completes.
      </div>
    );
  }

  const meta = TEMPLATE_META[intel.template] || TEMPLATE_META.generic;
  const Icon = meta.icon;
  const data = (intel.data || {}) as Record<string, unknown>;

  async function runAts() {
    if (!jd.trim()) return;
    setAtsBusy(true);
    setAtsError(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/ats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: stripPageImagesForApi(doc),
          job_description: jd,
        }),
      });
      const json = await parseApiResponse(res);
      if (!res.ok) throw new Error(json.error || "ATS scoring failed.");
      const nextDoc: DocumentRecord = {
        ...doc,
        intelligence: {
          ...intel!,
          job_description: jd,
          ats: json.ats as AtsResult,
        },
      };
      onDocumentUpdated(mergePageImagesFromClient(nextDoc, doc));
    } catch (err) {
      setAtsError(err instanceof Error ? err.message : "ATS scoring failed.");
    } finally {
      setAtsBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Badge */}
      <div className="p-3.5 rounded-2xl bg-white border border-black/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-black">{meta.title}</div>
            <div className="text-[10px] font-mono text-[#6E6E73] uppercase">
              Template: {intel.template}
            </div>
          </div>
        </div>
        {typeof intel.template_confidence === "number" && (
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#F5F5F7] text-black">
            {Math.round(intel.template_confidence * 100)}% match
          </span>
        )}
      </div>

      {/* English Translation (if Arabic or non-English) */}
      {intel.english_translation && (
        <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-black">
            <Languages className="w-3.5 h-3.5" />
            <span>English Translation &amp; Summary</span>
          </div>
          <p className="text-xs text-[#1D1D1F] leading-relaxed whitespace-pre-wrap">
            {intel.english_translation}
          </p>
        </div>
      )}

      {/* Key Points */}
      {intel.key_points && intel.key_points.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-2">
          <div className="text-xs font-semibold text-black">Key Highlights</div>
          <ul className="space-y-1 text-xs text-[#1D1D1F]">
            {intel.key_points.map((pt, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-black font-bold">•</span>
                <span dir="auto">{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Unstructured Intelligence: Entities, Clauses/Sections & Action Items */}
      {intel.entities &&
        Object.values(intel.entities).some((arr) => Array.isArray(arr) && arr.length > 0) && (
          <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-2.5">
            <div className="text-xs font-semibold text-black">Extracted Entities</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {Object.entries(intel.entities)
                .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
                .map(([group, arr]) => (
                  <div key={group} className="p-2.5 rounded-xl bg-[#F5F5F7]">
                    <div className="text-[10px] font-mono uppercase text-[#6E6E73] mb-1">
                      {group.replace(/_/g, " ")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(arr as string[]).slice(0, 10).map((item, idx) => (
                        <span
                          key={idx}
                          dir="auto"
                          className="px-2 py-0.5 rounded-full bg-white border border-black/10 text-[11px] text-black"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

      {intel.clauses_or_sections && intel.clauses_or_sections.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-2.5">
          <div className="text-xs font-semibold text-black">
            Sections, Clauses &amp; Semantic Breakdown
          </div>
          <div className="space-y-2">
            {intel.clauses_or_sections.map((cs, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-[#F5F5F7] text-xs space-y-1">
                <div className="font-semibold text-black" dir="auto">
                  {cs.heading}
                </div>
                <div className="text-[#1D1D1F] leading-relaxed" dir="auto">
                  {cs.summary}
                </div>
                {cs.risk_or_note && (
                  <div className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2 py-1 rounded-lg">
                    Note: {cs.risk_or_note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {intel.action_items && intel.action_items.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-1.5">
          <div className="text-xs font-semibold text-black">Action Items &amp; Deadlines</div>
          <ul className="space-y-1 text-xs text-[#1D1D1F]">
            {intel.action_items.map((act, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-mono text-black">→</span>
                <span dir="auto">{act}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Template 1: RESUME + Conditional ATS Machine */}
      {intel.template === "resume" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-3">
            <div className="text-xs font-mono uppercase text-[#6E6E73]">
              Candidate Profile Form
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                ["Full Name", data.full_name],
                ["Headline", data.headline],
                ["Email", data.email],
                ["Phone", data.phone],
                ["Location", data.location],
                ["Experience", data.years_of_experience],
              ].map(([lbl, val]) => (
                <div key={String(lbl)} className="p-2.5 rounded-xl bg-[#F5F5F7]">
                  <div className="text-[10px] font-mono text-[#6E6E73]">{String(lbl)}</div>
                  <div className="font-medium text-black mt-0.5 break-words" dir="auto">
                    {renderVal(val)}
                  </div>
                </div>
              ))}
            </div>

            {Boolean(data.summary) && (
              <div className="p-2.5 rounded-xl bg-[#F5F5F7] text-xs">
                <div className="text-[10px] font-mono text-[#6E6E73] mb-1">Summary</div>
                <div className="text-[#1D1D1F] leading-relaxed" dir="auto">
                  {String(data.summary)}
                </div>
              </div>
            )}

            {Array.isArray(data.skills) && data.skills.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] font-mono uppercase text-[#6E6E73]">
                  Extracted Skills ({data.skills.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.skills.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-medium"
                    >
                      {String(s)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(data.experience) && data.experience.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-mono uppercase text-[#6E6E73]">
                  Work Experience
                </div>
                {(data.experience as Array<Record<string, unknown>>).map((exp, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#F5F5F7] text-xs space-y-0.5">
                    <div className="font-semibold text-black">
                      {renderVal(exp.role)} · {renderVal(exp.company)}
                    </div>
                    <div className="text-[10px] font-mono text-[#6E6E73]">
                      {renderVal(exp.period)}
                    </div>
                    {Boolean(exp.highlights) && (
                      <div className="text-[#1D1D1F] pt-1">{renderVal(exp.highlights)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(data.education) && data.education.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono uppercase text-[#6E6E73]">Education</div>
                {(data.education as Array<Record<string, unknown>>).map((edu, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#F5F5F7] text-xs">
                    <span className="font-semibold text-black">{renderVal(edu.degree)}</span> —{" "}
                    {renderVal(edu.institution)} ({renderVal(edu.year)})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Conditional ATS Machine (ONLY shown when template === "resume") */}
          <div className="p-4 rounded-2xl bg-black text-white space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Briefcase className="w-4 h-4" />
              <span>ATS Resume Scorer</span>
            </div>
            <p className="text-[11px] text-white/70">
              Paste a Job Description below to compare skills, experience, and compute an ATS match score.
            </p>
            <textarea
              rows={4}
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste target Job Description (JD) here..."
              className="w-full p-3 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white"
            />
            <button
              onClick={runAts}
              disabled={atsBusy || !jd.trim()}
              className="w-full py-2.5 rounded-full bg-white text-black hover:bg-white/90 disabled:opacity-40 text-xs font-semibold flex items-center justify-center gap-2"
            >
              {atsBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Run ATS Match &amp; Score
            </button>

            {atsError && (
              <div className="p-2.5 rounded-xl bg-red-500/20 border border-red-400/40 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{atsError}</span>
              </div>
            )}

            {intel.ats && (
              <div className="pt-2 border-t border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono text-white/60">ATS MATCH SCORE</div>
                    <div className="text-3xl font-bold font-mono">{intel.ats.score}/100</div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white text-black text-xs font-semibold">
                    {intel.ats.verdict}
                  </span>
                </div>

                {intel.ats.matched_skills.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-white/60 mb-1">MATCHED SKILLS</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.ats.matched_skills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 text-[10px]">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {intel.ats.missing_skills.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-white/60 mb-1">MISSING SKILLS</div>
                    <div className="flex flex-wrap gap-1">
                      {intel.ats.missing_skills.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-200 text-[10px]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {intel.ats.recommendations.length > 0 && (
                  <div className="text-[11px] text-white/80 space-y-1">
                    <div className="text-[10px] font-mono text-white/60">RECOMMENDATIONS</div>
                    {intel.ats.recommendations.map((r, i) => (
                      <div key={i}>• {r}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates 2-5: Invoice, Bank Statement, Contract, Receipt */}
      {intel.template !== "resume" && intel.template !== "generic" && intel.data && (
        <div className="p-4 rounded-2xl bg-white border border-black/10 space-y-3">
          <div className="text-xs font-mono uppercase text-[#6E6E73]">
            Extracted {meta.title} Fields
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {Object.entries(data)
              .filter(([, v]) => !Array.isArray(v))
              .map(([k, v]) => (
                <div key={k} className="p-2.5 rounded-xl bg-[#F5F5F7]">
                  <div className="text-[10px] font-mono text-[#6E6E73] uppercase">
                    {k.replace(/_/g, " ")}
                  </div>
                  <div className="font-medium text-black mt-0.5 break-words" dir="auto">
                    {renderVal(v)}
                  </div>
                </div>
              ))}
          </div>

          {Object.entries(data)
            .filter(([, v]) => Array.isArray(v) && v.length > 0)
            .map(([k, v]) => (
              <div key={k} className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono uppercase text-[#6E6E73]">
                  {k.replace(/_/g, " ")} ({(v as unknown[]).length})
                </div>
                <div className="space-y-1.5">
                  {(v as unknown[]).slice(0, 15).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#F5F5F7] text-xs text-black" dir="auto">
                      {typeof item === "object" && item !== null
                        ? Object.entries(item as Record<string, unknown>)
                            .map(([ik, iv]) => `${ik}: ${renderVal(iv)}`)
                            .join(" · ")
                        : String(item)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Pipeline Timings */}
      {doc.pipeline && doc.pipeline.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white border border-black/10 space-y-2">
          <div className="text-[10px] font-mono uppercase text-[#6E6E73]">
            Pipeline Diagnostics
          </div>
          {doc.pipeline.map((step) => (
            <div key={step.id} className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1.5 text-black">
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${
                    step.status === "done"
                      ? "text-emerald-600"
                      : step.status === "failed"
                        ? "text-red-600"
                        : "text-amber-600"
                  }`}
                />
                {step.label}
              </span>
              <span className="font-mono text-[#6E6E73]">
                {step.duration_ms ? `${step.duration_ms}ms` : step.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
