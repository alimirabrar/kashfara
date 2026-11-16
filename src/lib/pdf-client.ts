"use client";

/**
 * Renders PDF pages to PNG File objects in the browser using pdfjs-dist
 * so serverless environments do not require native Cairo/Canvas binaries.
 */
export async function renderPdfPagesToPngFiles(
  file: File,
  maxPages = 10
): Promise<{ files: File[]; totalPages: number }> {
  const pdfjs = await import("pdfjs-dist");
  // Use CDN worker matching installed pdfjs-dist version
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;
  const pagesToRender = Math.min(totalPages, maxPages);
  const files: File[] = [];

  for (let i = 1; i <= pagesToRender; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.4 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
    );
    if (blob) {
      files.push(new File([blob], `page_${i}.jpg`, { type: "image/jpeg" }));
    }
  }

  return { files, totalPages };
}
