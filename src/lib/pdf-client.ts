"use client";

/**
 * Renders PDF pages to crisp JPEG File objects AND extracts raw text per page
 * in the browser using pdfjs-dist (hybrid fast parser + vision input, 100% Vercel compatible).
 */
export async function renderPdfPagesToPngFiles(
  file: File,
  maxPages = 10
): Promise<{ files: File[]; pageTexts: string[]; totalPages: number }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pagesToRender = Math.min(totalPages, maxPages);
  const files: File[] = [];
  const pageTexts: string[] = [];

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

    // Fast text-layer extraction for hybrid OCR + Vision verification
    try {
      const textContent = await page.getTextContent();
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pageTexts.push(text);
    } catch {
      pageTexts.push("");
    }
  }

  return { files, pageTexts, totalPages };
}
