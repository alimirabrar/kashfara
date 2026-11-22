"use client";

import type { OcrBlock } from "@/types/kashfara";

/**
 * Renders PDF pages to crisp JPEG File objects AND extracts raw text + normalized
 * bounding boxes per line in the browser using pdfjs-dist.
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
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
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

      const blocks: OcrBlock[] = [];
      const lines: string[] = [];

      for (const item of textContent.items) {
        if (!("str" in item)) continue;
        const str = item.str.trim();
        if (!str) continue;
        lines.push(str);

        const tx = item.transform[4];
        const ty = item.transform[5];
        const itemW = Math.max(4, item.width || str.length * 5);
        const itemH = Math.max(8, item.height || Math.abs(item.transform[3]) || 12);

        const x = Math.max(0, Math.min(1, tx / pw));
        const y = Math.max(0, Math.min(1, 1 - (ty + itemH) / ph));
        const width = Math.max(0.01, Math.min(1 - x, itemW / pw));
        const height = Math.max(0.01, Math.min(1 - y, itemH / ph));

        blocks.push({
          text: str,
          bbox: {
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
            width: Number(width.toFixed(4)),
            height: Number(height.toFixed(4)),
          },
        });
      }

      pageTexts.push(lines.join(" ").replace(/\s+/g, " ").trim());
      pageOcrBlocks.push(blocks);
    } catch {
      pageTexts.push("");
      pageOcrBlocks.push([]);
    }
  }

  return { files, pageTexts, pageOcrBlocks, totalPages };
}
