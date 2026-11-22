"use client";

import React, { useRef, useState } from "react";
import { parseApiResponse } from "@/lib/api-response";
import { UploadCloud, Loader2, AlertTriangle, FileCheck2 } from "lucide-react";
import { renderPdfPagesToPngFiles } from "@/lib/pdf-client";
import { runOcrOnPageImage } from "@/lib/ocr-client";
import { mergePageImagesFromClient, stripPageImagesForApi } from "@/lib/utils";
import type { DocumentRecord } from "@/types/kashfara";

interface UploadDropzoneProps {
  maxPages?: number;
  onUploadedAndProcessed: (doc: DocumentRecord) => void;
  compact?: boolean;
}

const ACCEPTED_EXTS = ".pdf,.png,.jpg,.jpeg,.webp,.tif,.tiff,.docx,.pptx,.xlsx";

export function UploadDropzone({
  maxPages = 10,
  onUploadedAndProcessed,
  compact = false,
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [stageText, setStageText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      if (file.name.toLowerCase().endsWith(".pdf")) {
        setStageText("Parsing & rendering PDF pages for Kashfara Vision...");
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

      setStageText("Validating & preparing document...");
      const upRes = await fetch("/api/upload", { method: "POST", body: formData });
      const upJson = await parseApiResponse(upRes);
      if (!upRes.ok) {
        throw new Error(upJson.error || "Document upload failed.");
      }

      const clientDoc = upJson.document as DocumentRecord;

      // Run Arabic + English OCR on any image or scanned PDF page that lacks native text
      for (let i = 0; i < clientDoc.pages.length; i++) {
        const page = clientDoc.pages[i];
        const hasEnoughText = Boolean(page.text_content && page.text_content.trim().length >= 25);
        if (page.image_url && !hasEnoughText) {
          setStageText(`Running Arabic & English OCR (Page ${page.page_number}/${clientDoc.pages.length})...`);
          const ocr = await runOcrOnPageImage(page.image_url, page.width, page.height);
          page.text_content = ocr.text_content;
          page.ocr_blocks = ocr.ocr_blocks;
        }
      }

      setStageText("Reasoning over parsed OCR & layout...");
      const procRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: stripPageImagesForApi(clientDoc) }),
      });
      const procJson = await parseApiResponse(procRes);

      if (!procRes.ok) {
        const reasons: string[] = Array.isArray(procJson.reasons) ? procJson.reasons : [];
        const detail = reasons.length ? ` — ${reasons[reasons.length - 1]}` : "";
        const message = (procJson.error || "Processing failed.") + detail;
        onUploadedAndProcessed({ ...clientDoc, status: "failed", error_message: message });
        throw new Error(message);
      }

      onUploadedAndProcessed(mergePageImagesFromClient(procJson.document, clientDoc));
      setStageText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload or processing failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
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
              Hybrid OCR + Vision Pipeline Active
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
              <span>Instant proof-of-evidence extraction</span>
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
