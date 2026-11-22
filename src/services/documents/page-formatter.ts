import type { DocumentPage } from "@/types/kashfara";

/**
 * Formats parsed OCR lines (with normalized [0..1] bounding boxes), raw page text,
 * and Office structural blocks into a compact, layout-aware text representation
 * for Gemini reasoning — without sending raw document images.
 */
export function formatPagesForReasoning(pages: DocumentPage[]): string {
  return pages
    .map((p) => {
      const sections: string[] = [`=== PAGE ${p.page_number} (${p.width}x${p.height}) ===`];

      if (p.structural_blocks && p.structural_blocks.length > 0) {
        sections.push(
          p.structural_blocks.map((b) => `[${b.ref}] ${b.text}`).join("\n")
        );
      } else if (p.ocr_blocks && p.ocr_blocks.length > 0) {
        // Include up to 180 OCR lines with normalized bounding boxes so Gemini can preserve exact coordinates
        const lines = p.ocr_blocks.slice(0, 180).map(
          (b) =>
            `[box=${b.bbox.x},${b.bbox.y},${b.bbox.width},${b.bbox.height}] ${b.text}`
        );
        sections.push(lines.join("\n"));
        if (p.text_content && p.ocr_blocks.length > 180) {
          sections.push(`\n[Full Text Remainder]\n${p.text_content.slice(0, 3000)}`);
        }
      } else if (p.text_content) {
        sections.push(p.text_content.slice(0, 6000));
      } else {
        sections.push("[No OCR or text content extracted on this page]");
      }

      return sections.join("\n");
    })
    .join("\n\n");
}
