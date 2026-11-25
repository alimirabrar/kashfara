"use client";

import type { OcrBlock } from "@/types/kashfara";

/**
 * Renders PDF pages to crisp JPEG File objects AND extracts grouped text lines
 * + normalized [0..1] bounding boxes in the browser using pdfjs-dist.
 */
export async function renderPdfPagesToPngFiles(
  file: File,
  maxPages = 10
): Promise<{
  files: File[];
  pageTexts: string[];
  pageOcrBlocks: OcrBlock[][];
  totalPages: number;
}> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pagesToRender = Math.min(totalPages, maxPages);
  const files: File[] = [];
  const pageTexts: string[] = [];
  const pageOcrBlocks: OcrBlock[][] = [];

  for (let i = 1; i <= pagesToRender; i++) {
    const page = await pdf.getPage(i);
    // Scale 1.8 gives crisp ~1100-1500px wide images for accurate OCR on small 9-10pt fonts
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88)
      );
      if (blob) {
        files.push(new File([blob], `page_${i}.jpg`, { type: "image/jpeg" }));
      }
    }

    try {
      const textContent = await page.getTextContent();
      const baseViewport = page.getViewport({ scale: 1 });
      const pw = Math.max(1, baseViewport.width);
      const ph = Math.max(1, baseViewport.height);

      // Collect raw spans and group spans on the same horizontal line (within 0.012 y)
      const rawSpans: Array<{ text: string; x: number; y: number; x2: number; y2: number }> = [];
      for (const item of textContent.items) {
        if (!("str" in item)) continue;
        const str = item.str.trim();
        if (!str) continue;

        const tx = item.transform[4];
        const ty = item.transform[5];
        const itemW = Math.max(4, item.width || str.length * 5);
        const itemH = Math.max(8, item.height || Math.abs(item.transform[3]) || 12);

        const x = Math.max(0, Math.min(1, tx / pw));
        const y = Math.max(0, Math.min(1, 1 - (ty + itemH) / ph));
        const x2 = Math.max(x + 0.005, Math.min(1, x + itemW / pw));
        const y2 = Math.max(y + 0.005, Math.min(1, y + itemH / ph));
        rawSpans.push({ text: str, x, y, x2, y2 });
      }

      // Sort top-to-bottom, left-to-right
      rawSpans.sort((a, b) => (Math.abs(a.y - b.y) < 0.01 ? a.x - b.x : a.y - b.y));

      const groupedLines: Array<{ texts: string[]; x: number; y: number; x2: number; y2: number }> = [];
      for (const sp of rawSpans) {
        const last = groupedLines[groupedLines.length - 1];
        if (last && Math.abs(last.y - sp.y) < 0.012) {
          last.texts.push(sp.text);
          last.x = Math.min(last.x, sp.x);
          last.y = Math.min(last.y, sp.y);
          last.x2 = Math.max(last.x2, sp.x2);
          last.y2 = Math.max(last.y2, sp.y2);
        } else {
          groupedLines.push({ texts: [sp.text], x: sp.x, y: sp.y, x2: sp.x2, y2: sp.y2 });
        }
      }

      const blocks: OcrBlock[] = groupedLines.map((gl) => ({
        text: gl.texts.join(" ").replace(/\s+/g, " ").trim(),
        bbox: {
          x: Number(gl.x.toFixed(4)),
          y: Number(gl.y.toFixed(4)),
          width: Number(Math.max(0.01, gl.x2 - gl.x).toFixed(4)),
          height: Number(Math.max(0.01, gl.y2 - gl.y).toFixed(4)),
        },
      }));

      pageTexts.push(blocks.map((b) => b.text).join("\n"));
      pageOcrBlocks.push(blocks);
    } catch {
      pageTexts.push("");
      pageOcrBlocks.push([]);
    }
  }

  return { files, pageTexts, pageOcrBlocks, totalPages };
}
