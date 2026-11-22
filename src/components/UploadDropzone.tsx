"use client";

import React, { useRef, useState } from "react";
import { parseApiResponse } from "@/lib/api-response";
import { UploadCloud, Loader2, AlertTriangle, FileCheck2 } from "lucide-react";
import { renderPdfPagesToPngFiles } from "@/lib/pdf-client";
import { runOcrOnPageImage } from "@/lib/ocr-client";
import { extractInstantFields } from "@/lib/instant-extractor";
import { mergePageImagesFromClient, stripPageImagesForApi } from "@/lib/utils";
import type { DocumentRecord, PipelineStep, TemplateKind } from "@/types/kashfara";

interface UploadDropzoneProps {
  maxPages?: number;
  onUploadedAndProcessed: (doc: DocumentRecord) => void;
  compact?: boolean;
}

const ACCEPTED_EXTS = ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.docx,.pptx,.xlsx";

const TEMPLATE_OPTIONS: Array<{ id: TemplateKind | "auto"; label: string }> = [
  { id: "auto", label: "Auto-Detect" },
  { id: "resume", label: "Resume / CV" },
  { id: "invoice", label: "Invoice" },
  { id: "bank_statement", label: "Bank Statement" },
  { id: "contract", label: "Contract" },
  { id: "receipt", label: "Receipt" },
];

export function UploadDropzone({
  maxPages = 10,
  onUploadedAndProcessed,
  compact = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKind | "auto">("auto");
  const [busy, setBusy] = useState(false);
  const [stageText, setStageText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    const pipeline: PipelineStep[] = [];

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Step 1: PDF / File Preparation
      const t0 = Date.now();
      if (file.name.toLowerCase().endsWith(".pdf")) {
        setStageText("Parsing PDF text layer & rendering pages...");
        const rendered = await renderPdfPagesToPngFiles(file, maxPages);
        if (rendered.totalPages > maxPages) {
          throw new Error(
            `PDF has ${rendered.totalPages} pages, exceeding configured limit (${maxPages} pages).`
          );
        }
        for (const pFile of rendered.files) {
          formData.append("rendered_pages", pFile);
        }
        formData.append("page_texts", JSON.stringify(rendered.pageTexts));
        formData.append("page_ocr_blocks", JSON.stringify(rendered.pageOcrBlocks));
      }

      setStageText("Validating & uploading document...");
      const upRes = await fetch("/api/upload", { method: "POST", body: formData });
      const upJson = await parseApiResponse(upRes);
      if (!upRes.ok) {
        throw new Error(upJson.error || "Document upload failed.");
      }

      pipeline.push({
        id: "upload",
        label: "Upload & Format Validation",
        status: "done",
        started_at: t0,
        duration_ms: Date.now() - t0,
      });

      const clientDoc = upJson.document as DocumentRecord;

      // Step 2: OCR on image / scanned pages lacking native text
      const tOcr = Date.now();
      let ranOcr = false;
      for (let i = 0; i < clientDoc.pages.length; i++) {
        const page = clientDoc.pages[i];
        const hasEnoughText = Boolean(page.text_content && page.text_content.trim().length >= 25);
        if (page.image_url && !hasEnoughText) {
          ranOcr = true;
          setStageText(`Running Arabic & English OCR (Page ${page.page_number}/${clientDoc.pages.length})...`);
          const ocr = await runOcrOnPageImage(page.image_url, page.width, page.height);
          page.text_content = ocr.text_content;
          page.ocr_blocks = ocr.ocr_blocks;
        }
      }
      pipeline.push({
        id: "ocr",
        label: ranOcr ? "Kashfara OCR Engine (Arabic & English)" : "Kashfara Structural & PDF Parser",
        status: "done",
        started_at: tOcr,
        duration_ms: Date.now() - tOcr,
        detail: `${clientDoc.pages.reduce((s, p) => s + (p.text_content?.length || 0), 0)} chars extracted`,
      });

      // Step 3: Instant local proof-of-evidence field marking (<20ms)
      const tInst = Date.now();
      const instantFields = extractInstantFields(clientDoc);
      clientDoc.fields = instantFields;
      pipeline.push({
        id: "instant",
        label: "Instant Field & Evidence Marking",
        status: "done",
        started_at: tInst,
        duration_ms: Date.now() - tInst,
        detail: `${instantFields.length} fields marked`,
      });

      // Immediately show instant OCR + proof-of-evidence in Workspace!
      const aiStep: PipelineStep = {
        id: "ai",
        label: "Kashfara AI Classification, Translation & Template",
        status: "running",
        started_at: Date.now(),
      };
      clientDoc.pipeline = [...pipeline, aiStep];
      onUploadedAndProcessed({ ...clientDoc });

      // Step 4: Server-side Gemini reasoning over parsed OCR text (zero images sent)
      setStageText("Running AI classification, translation & template extraction...");
      const tAi = Date.now();
      const procRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: stripPageImagesForApi(clientDoc),
          preferred_template: selectedTemplate,
        }),
      });
      const procJson = await parseApiResponse(procRes);

      if (!procRes.ok) {
        const reasons: string[] = Array.isArray(procJson.reasons) ? procJson.reasons : [];
        const detail = reasons.length ? ` — ${reasons[reasons.length - 1]}` : "";
        const message = (procJson.error || "AI reasoning failed.") + detail;
        aiStep.status = "failed";
        aiStep.duration_ms = Date.now() - tAi;
        aiStep.error = message;
        onUploadedAndProcessed({
          ...clientDoc,
          status: "completed", // keep instant OCR + fields usable!
          error_message: `Instant OCR & evidence succeeded, but AI reasoning failed: ${message}`,
          pipeline: [...pipeline, aiStep],
        });
        setError(message);
        return;
      }

      aiStep.status = "done";
      aiStep.duration_ms = Date.now() - tAi;
      aiStep.detail = procJson.diagnostics?.model
        ? `Model: ${procJson.diagnostics.model}`
        : undefined;

      const merged = mergePageImagesFromClient(procJson.document, clientDoc);
      merged.pipeline = [...pipeline, aiStep];
      onUploadedAndProcessed(merged);
      setStageText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload or processing failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Optional Template Selector */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-mono text-[#6E6E73] mr-1">Template:</span>
        {TEMPLATE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            disabled={busy}
            onClick={() => setSelectedTemplate(opt.id)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              selectedTemplate === opt.id
                ? "bg-black text-white shadow-sm"
                : "bg-white text-[#6E6E73] border border-black/10 hover:text-black"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) void handleFile(f);
        }}
        onClick={() => !busy && inputRef.current?.click()}
        className={`apple-card rounded-3xl cursor-pointer transition-all hover:border-black/30 hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] flex flex-col items-center justify-center text-center ${
          compact ? "p-6" : "p-10"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTS}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
        {busy ? (
          <>
            <Loader2 className="w-8 h-8 text-black animate-spin mb-3" />
            <div className="text-sm font-semibold text-black">{stageText}</div>
            <div className="text-xs font-mono text-[#6E6E73] mt-1">
              Fast OCR + Parser → Kashfara Reasoning
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mb-3.5 shadow-sm">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="text-base font-semibold text-black">
              Drop any document or tap to upload
            </div>
            <div className="text-xs text-[#6E6E73] mt-1 max-w-md">
              Arabic, English, or bilingual PDF, PNG, JPG, WEBP, TIFF, DOCX, PPTX, XLSX (up to {maxPages} pages).
            </div>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-mono text-[#1D1D1F]">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Instant OCR + 5 Smart Templates + Proof of Evidence</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
