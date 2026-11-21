"use client";

import React, { useState } from "react";
import { parseApiResponse } from "@/lib/api-response";
import {
  Download,
  Printer,
  Save,
  Sparkles,
  Loader2,
  Languages,
  FileSpreadsheet,
} from "lucide-react";
import type { DigitalFormSchema, DocumentRecord } from "@/types/kashfara";

interface DigitalFormsViewProps {
  activeDoc: DocumentRecord | null;
  onDocumentUpdated: (doc: DocumentRecord) => void;
}

export function DigitalFormsView({ activeDoc, onDocumentUpdated }: DigitalFormsViewProps) {
  const [formState, setFormState] = useState<DigitalFormSchema | null>(
    activeDoc?.digital_form ?? null
  );
  const [rtlOverride, setRtlOverride] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  if (!activeDoc) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-[#6E6E73]">
        Open a document in Document Proofing first to digitalize its form fields.
      </div>
    );
  }

  async function generateForm() {
    if (!activeDoc) return;
    setBusy(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/digitalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: activeDoc }),
      });
      const json = await parseApiResponse(res);
      if (!res.ok) throw new Error(json.error || "Digitalisation failed.");
      setFormState(json.digital_form);
      onDocumentUpdated(json.document);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveFormEdits() {
    if (!activeDoc || !formState) return;
    setBusy(true);
    setSaveMsg(null);
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/digitalize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digital_form: formState }),
      });
      const json = await parseApiResponse(res);
      if (res.ok) {
        onDocumentUpdated({ ...activeDoc, digital_form: json.digital_form });
        setSaveMsg("Saved form edits.");
      }
    } finally {
      setBusy(false);
    }
  }

  function exportJson() {
    if (!formState) return;
    const blob = new Blob([JSON.stringify(formState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc!.filename.replace(/\.[^.]+$/, "")}_digital_form.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!formState) return;
    const rows = [["Section", "Order", "Label", "Key", "Type", "Value", "Page"]];
    for (const sec of formState.sections) {
      for (const f of sec.fields) {
        const val = f.field_type === "checkbox" ? String(Boolean(f.checked)) : String(f.value ?? "");
        rows.push([
          sec.title,
          String(f.order),
          f.label,
          f.normalized_key,
          f.field_type,
          val,
          String(f.page_number),
        ]);
      }
    }
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeDoc!.filename.replace(/\.[^.]+$/, "")}_digital_form.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const isRtl = rtlOverride ?? formState?.is_rtl ?? false;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="no-print apple-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-black" />
          <div>
            <h2 className="text-base font-semibold text-black">
              Digital Form — {activeDoc.filename}
            </h2>
            <p className="text-xs text-[#6E6E73]">
              Side-by-side editable digital representation preserving empty fields &amp; section order.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setRtlOverride(!isRtl)}
            className="px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-black/10 text-xs text-black flex items-center gap-1.5"
          >
            <Languages className="w-3.5 h-3.5" />
            {isRtl ? "RTL (Arabic)" : "LTR"}
          </button>

          {formState ? (
            <>
              <button
                onClick={saveFormEdits}
                disabled={busy}
                className="px-3.5 py-1.5 rounded-full bg-black text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button
                onClick={exportJson}
                className="px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-black/10 text-xs text-black flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
              <button
                onClick={exportCsv}
                className="px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-black/10 text-xs text-black flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 rounded-full bg-[#F5F5F7] border border-black/10 text-xs text-black flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </>
          ) : (
            <button
              onClick={generateForm}
              disabled={busy}
              className="px-4 py-2 rounded-full bg-black hover:bg-[#1D1D1F] text-white text-xs font-semibold flex items-center gap-1.5"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              DIGITALIZE THIS FORM
            </button>
          )}
        </div>
      </div>

      {saveMsg && (
        <div className="no-print text-xs font-mono text-emerald-700 px-2">{saveMsg}</div>
      )}

      {!formState ? (
        <div className="apple-card rounded-2xl p-10 text-center text-sm text-[#6E6E73]">
          Click <strong className="text-black">DIGITALIZE THIS FORM</strong> above to generate an editable digital representation.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Original Reference */}
          <div className="no-print lg:col-span-5 apple-card rounded-2xl p-4 space-y-3 max-h-[75vh] overflow-y-auto">
            <div className="text-xs font-mono uppercase text-[#6E6E73]">
              Original Document Comparison
            </div>
            {activeDoc.pages.map((p) =>
              p.image_url ? (
                <img
                  key={p.page_number}
                  src={p.image_url}
                  alt={`Original page ${p.page_number}`}
                  className="w-full rounded-xl border border-black/10"
                />
              ) : (
                <pre
                  key={p.page_number}
                  className="text-xs font-mono text-[#6E6E73] whitespace-pre-wrap bg-[#F5F5F7] p-3 rounded-xl"
                >
                  {p.text_content}
                </pre>
              )
            )}
          </div>

          {/* Editable Digital Form */}
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className="lg:col-span-7 apple-card rounded-2xl p-6 space-y-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="border-b border-black/10 pb-3">
              <h3 className="text-lg font-semibold text-black">{formState.title}</h3>
              <div className="text-xs font-mono text-[#6E6E73] mt-1">
                Language: {formState.language} · {formState.sections.length} section(s)
              </div>
            </div>

            {formState.sections.map((sec, sIdx) => (
              <div key={sIdx} className="space-y-3">
                <h4 className="text-sm font-semibold text-black border-b border-black/10 pb-1">
                  {sec.title}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sec.fields.map((f, fIdx) => (
                    <div
                      key={f.id}
                      className={f.field_type === "textarea" ? "md:col-span-2" : ""}
                    >
                      <label className="block text-xs text-[#6E6E73] mb-1">
                        {f.label}
                        <span className="text-[10px] font-mono opacity-60 mx-1.5">
                          (p.{f.page_number})
                        </span>
                      </label>

                      {f.field_type === "checkbox" ? (
                        <label className="inline-flex items-center gap-2 text-xs text-black cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(f.checked)}
                            onChange={(e) => {
                              const next = structuredClone(formState);
                              next.sections[sIdx].fields[fIdx].checked = e.target.checked;
                              next.sections[sIdx].fields[fIdx].value = e.target.checked;
                              next.sections[sIdx].fields[fIdx].is_empty = false;
                              setFormState(next);
                            }}
                            className="rounded border-black/30 text-black"
                          />
                          <span>{f.checked ? "Checked" : "Unchecked"}</span>
                        </label>
                      ) : f.field_type === "textarea" ? (
                        <textarea
                          rows={3}
                          value={f.value === null ? "" : String(f.value)}
                          placeholder="<empty>"
                          onChange={(e) => {
                            const next = structuredClone(formState);
                            const v = e.target.value;
                            next.sections[sIdx].fields[fIdx].value = v === "" ? null : v;
                            next.sections[sIdx].fields[fIdx].is_empty = v === "";
                            setFormState(next);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/10 text-xs text-black focus:outline-none focus:border-black"
                        />
                      ) : (
                        <input
                          type={f.field_type === "number" ? "number" : "text"}
                          value={f.value === null ? "" : String(f.value)}
                          placeholder="<empty>"
                          onChange={(e) => {
                            const next = structuredClone(formState);
                            const v = e.target.value;
                            next.sections[sIdx].fields[fIdx].value = v === "" ? null : v;
                            next.sections[sIdx].fields[fIdx].is_empty = v === "";
                            setFormState(next);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-[#F5F5F7] border border-black/10 text-xs text-black focus:outline-none focus:border-black"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
