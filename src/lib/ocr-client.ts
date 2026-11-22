"use client";

import type { OcrBlock } from "@/types/kashfara";

/**
 * Runs real client-side Arabic + English OCR (tesseract.js) on an image data URL
 * and returns normalized [0..1] line bounding boxes + full text.
 */
export async function runOcrOnPageImage(
  imageDataUrl: string,
  pageWidth: number,
  pageHeight: number
): Promise<{ text_content: string; ocr_blocks: OcrBlock[] }> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["eng", "ara"]);

  try {
    const result = await worker.recognize(imageDataUrl, {}, { text: true, blocks: true });
    const pw = Math.max(1, pageWidth || 1000);
    const ph = Math.max(1, pageHeight || 1400);
    const ocrBlocks: OcrBlock[] = [];

    for (const block of result.data.blocks || []) {
      for (const para of block.paragraphs || []) {
        for (const line of para.lines || []) {
          const text = (line.text || "").trim();
          if (!text) continue;
          const x = Math.max(0, Math.min(1, line.bbox.x0 / pw));
          const y = Math.max(0, Math.min(1, line.bbox.y0 / ph));
          const w = Math.max(0.01, Math.min(1 - x, (line.bbox.x1 - line.bbox.x0) / pw));
          const h = Math.max(0.01, Math.min(1 - y, (line.bbox.y1 - line.bbox.y0) / ph));
          ocrBlocks.push({
            text,
            confidence: typeof line.confidence === "number" ? Number((line.confidence / 100).toFixed(2)) : undefined,
            bbox: {
              x: Number(x.toFixed(4)),
              y: Number(y.toFixed(4)),
              width: Number(w.toFixed(4)),
              height: Number(h.toFixed(4)),
            },
          });
        }
      }
    }

    return {
      text_content: (result.data.text || "").trim(),
      ocr_blocks: ocrBlocks,
    };
  } finally {
    await worker.terminate();
  }
}
