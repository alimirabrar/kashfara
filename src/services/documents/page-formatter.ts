import type { DocumentPage } from "@/types/kashfara";

/**
 * Formats parsed OCR text and Office structural blocks into a compact,
 * token-efficient prompt for fast Gemini reasoning (no verbose box strings).
 * Bounding boxes are matched deterministically afterwards via SourceMatcher.
 */
export function formatPagesForReasoning(pages: DocumentPage[]): string {
  return pages
    .map((p) => {
      const sections: string[] = [`=== PAGE ${p.page_number} ===`];

      if (p.structural_blocks && p.structural_blocks.length > 0) {
        sections.push(
          p.structural_blocks
            .slice(0, 120)
            .map((b) => `[${b.ref}] ${b.text}`)
            .join("\n")
        );
      } else if (p.text_content && p.text_content.trim().length > 0) {
        sections.push(p.text_content.slice(0, 5500));
      } else if (p.ocr_blocks && p.ocr_blocks.length > 0) {
        sections.push(
          p.ocr_blocks
            .slice(0, 140)
            .map((b) => b.text)
            .join("\n")
        );
      } else {
        sections.push("[No OCR or text content extracted on this page]");
      }

      return sections.join("\n");
    })
    .join("\n\n");
}
