import { CoordinateNormalizer } from "./coordinate-normalizer";
import { SourceMatcher } from "./source-matcher";
import type {
  DocumentPage,
  ExtractedField,
  ExtractedTable,
  VerificationStatus,
} from "@/types/kashfara";

export const EvidenceValidator = {
  validateFields(fields: ExtractedField[], pages: DocumentPage[]): ExtractedField[] {
    const pageMap = new Map(pages.map((p) => [p.page_number, p]));

    return fields.map((field) => {
      const page = pageMap.get(field.page_number);
      if (!page) {
        return {
          ...field,
          bounding_box: null,
          coordinate_source: "none",
          verification_status: "NOT_FOUND" as VerificationStatus,
          verification_notes: `Page ${field.page_number} does not exist in document (1..${pages.length}).`,
        };
      }

      const normalizedBox = CoordinateNormalizer.normalize(
        field.bounding_box,
        page.width,
        page.height
      );

      const hasOcrOrImagePage = Boolean(
        page.image_path || page.image_url || (page.ocr_blocks && page.ocr_blocks.length > 0)
      );
      const match = SourceMatcher.matchOnPage(page, field.value, field.source_text);
      const finalBox = hasOcrOrImagePage ? match.matchedOcrBox || normalizedBox : null;

      // Never treat AI-proposed coordinates as verified automatically!
      let status: VerificationStatus = "NEEDS_REVIEW";
      const notes: string[] = [];

      if (field.value === null || field.value === "") {
        status = field.source_text ? "NEEDS_REVIEW" : "NOT_FOUND";
        notes.push("Empty or missing value.");
      } else if (!hasOcrOrImagePage && match.matched) {
        status = match.ambiguous ? "NEEDS_REVIEW" : "VERIFIED";
        notes.push(
          match.ambiguous
            ? `Matched ${match.matchCount} occurrences in structural text; review recommended.`
            : "Verified against document structural reference."
        );
      } else if (hasOcrOrImagePage) {
        if (!field.source_text) {
          status = "NEEDS_REVIEW";
          notes.push("Missing source_text quote from document.");
        } else if (!finalBox) {
          status = "NEEDS_REVIEW";
          notes.push("Bounding box missing or invalid; visual review required.");
        } else if (match.matched) {
          status = match.ambiguous ? "NEEDS_REVIEW" : "VERIFIED";
          notes.push("Verified against OCR/parsed text layer with normalized bounding box.");
        } else {
          status = "NEEDS_REVIEW";
          notes.push("Proposed coordinates & source text (needs visual review).");
        }
      } else {
        status = "NOT_FOUND";
        notes.push("Value not found in parsed document text.");
      }

      return {
        ...field,
        bounding_box: finalBox,
        coordinate_source: finalBox
          ? match.matched
            ? "source_matched"
            : "model_proposed"
          : "none",
        structural_ref: field.structural_ref || match.matchedStructuralRef || null,
        verification_status: status,
        verification_notes: notes.join(" "),
      };
    });
  },

  validateTables(tables: ExtractedTable[], pages: DocumentPage[]): ExtractedTable[] {
    const pageMap = new Map(pages.map((p) => [p.page_number, p]));
    return tables.map((table) => {
      const page = pageMap.get(table.page_number);
      if (!page) {
        return {
          ...table,
          bounding_box: null,
          coordinate_source: "none",
          verification_status: "NOT_FOUND" as VerificationStatus,
        };
      }
      const hasImagePage = Boolean(page.image_path || page.image_url);
      const box = hasImagePage
        ? CoordinateNormalizer.normalize(table.bounding_box, page.width, page.height)
        : null;

      return {
        ...table,
        bounding_box: box,
        coordinate_source: box ? "model_proposed" : "none",
        verification_status:
          table.headers.length > 0 || table.rows.length > 0 ? "NEEDS_REVIEW" : "NOT_FOUND",
      };
    });
  },
};
