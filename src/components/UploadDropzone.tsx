"use client";

import React, { useRef, useState } from "react";
import { UploadCloud, Loader2, AlertTriangle, FileCheck2 } from "lucide-react";
import { renderPdfPagesToPngFiles } from "@/lib/pdf-client";
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
        setStageText("Rendering PDF pages for multimodal vision...");
        const rendered = await renderPdfPagesToPngFiles(file, maxPages);
        if (rendered.totalPages > maxPages) {
          throw new Error(
            `PDF has ${rendered.totalPages} pages, exceeding configured limit (${maxPages} pages).`
          );
        }
        for (const pFile of rendered.files) {
          formData.append("rendered_pages", pFile);
        }
      }

      setStageText("Validating & ingesting document...");
      const upRes = await fetch("/api/upload", { method: "POST", body: formData });
      const upJson = await upRes.json();
      if (!upRes.ok) {
        throw new Error(upJson.error || "Document upload failed.");
      }

      setStageText("Running Kashfara multimodal intelligence...");
      const procRes = await fetch("/api/documents/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document: upJson.document }),
      });
      const procJson = await procRes.json();

      if (!procRes.ok) {
        const reasons: string[] = Array.isArray(procJson.reasons) ? procJson.reasons : [];
        const detail = reasons.length ? ` — ${reasons[reasons.length - 1]}` : "";
        const message = (procJson.error || "Processing failed.") + detail;
        // Keep the uploaded document so the user can retry from the workspace, with the error visible
        onUploadedAndProcessed({ ...upJson.document, status: "failed", error_message: message });
        throw new Error(message);
      }

      onUploadedAndProcessed(procJson.document);
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
        className={`kv-panel-cyan rounded-xl cursor-pointer transition-all hover:border-[#40E9E1]/60 flex flex-col items-center justify-center text-center ${
          compact ? "p-5" : "p-8"
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
            <Loader2 className="w-8 h-8 text-[#40E9E1] animate-spin mb-2.5" />
            <div className="text-sm font-medium text-[#E8F0F7]">{stageText}</div>
            <div className="text-xs font-mono text-[#91A3B6] mt-1">
              Quota-aware routing active
            </div>
          </>
        ) : (
          <>
            <div className="w-11 h-11 rounded-full bg-[#40E9E1]/10 border border-[#40E9E1]/30 flex items-center justify-center mb-3">
              <UploadCloud className="w-5 h-5 text-[#40E9E1]" />
            </div>
            <div className="text-sm font-semibold text-[#E8F0F7]">
              Drop document or click to ingest
            </div>
            <div className="text-xs text-[#91A3B6] mt-1 max-w-md">
              Supports PDF, PNG, JPG, WEBP, TIFF, DOCX, PPTX, XLSX (up to {maxPages} pages).
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-[#1FBFCA]">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Magic-byte verified · Private server storage</span>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#F87171]/10 border border-[#F87171]/35 text-xs text-[#F87171] flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
