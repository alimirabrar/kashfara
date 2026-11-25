"use client";

import type { DocumentRecord, ExtractedField } from "@/types/kashfara";

/**
 * Fast local extractor that turns OCR lines / parsed text into immediate
 * proof-of-evidence fields with real bounding boxes across the entire document.
 */
export function extractInstantFields(doc: DocumentRecord): ExtractedField[] {
  const fields: ExtractedField[] = [];
  const seen = new Set<string>();

  const pushField = (
    label: string,
    value: string,
    pageNum: number,
    sourceText: string,
    bbox: ExtractedField["bounding_box"],
    dataType: ExtractedField["data_type"] = "string"
  ) => {
    const normKey =
      label
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, "_")
        .replace(/^_|_$/g, "") || `field_${fields.length + 1}`;
    const dedupeKey = `${pageNum}:${normKey}:${value.slice(0, 60)}`;
    if (seen.has(dedupeKey) || fields.length >= 60) return;
    seen.add(dedupeKey);

    fields.push({
      field_id: `instant_${String(fields.length + 1).padStart(3, "0")}`,
      label,
      normalized_key: normKey,
      value,
      raw_value: value,
      data_type: dataType,
      page_number: pageNum,
      source_text: sourceText,
      bounding_box: bbox,
      coordinate_source: bbox ? "source_matched" : "none",
      confidence: null,
      verification_status: bbox ? "VERIFIED" : "NEEDS_REVIEW",
      verification_notes: "OCR/Parser extracted & anchored",
    });
  };

  for (const page of doc.pages) {
    const blocks =
      page.ocr_blocks && page.ocr_blocks.length > 0
        ? page.ocr_blocks.map((b) => ({ text: b.text, bbox: b.bbox }))
        : (page.text_content || "")
            .split(/\r?\n/)
            .map((t) => ({ text: t.trim(), bbox: null }));

    let currentSection = "Document Line";

    for (const block of blocks) {
      const line = block.text.trim();
      if (!line || line.length < 2) continue;

      // Detect uppercase/short section headings (e.g. PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE)
      if (
        line.length <= 42 &&
        !/[:：]/.test(line) &&
        (line === line.toUpperCase() || /^(summary|skills|experience|education|projects|certifications|total|invoice|bill to|ship to)/i.test(line))
      ) {
        currentSection = line;
        pushField("Section", line, page.page_number, line, block.bbox, "string");
        continue;
      }

      // 1. Key: Value pattern (supports English ":" and Arabic "：")
      const kvMatch = line.match(/^([^:：]{2,42})[:：]\s*(.{1,160})$/);
      if (kvMatch) {
        const lbl = kvMatch[1].trim();
        const val = kvMatch[2].trim();
        if (lbl && val && !/^https?$/i.test(lbl)) {
          pushField(lbl, val, page.page_number, line, block.bbox, "string");
          continue;
        }
      }

      // 2. Email
      const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) {
        pushField("Email", emailMatch[0], page.page_number, line, block.bbox, "string");
      }

      // 3. Phone
      const phoneMatch = line.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);
      if (phoneMatch && phoneMatch[0].replace(/\D/g, "").length >= 8) {
        pushField("Phone", phoneMatch[0].trim(), page.page_number, line, block.bbox, "string");
      }

      // 4. IBAN
      const ibanMatch = line.match(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,28}\b/);
      if (ibanMatch) {
        pushField("IBAN", ibanMatch[0], page.page_number, line, block.bbox, "string");
      }

      // 5. Currency amount
      const moneyMatch = line.match(/\b(?:AED|SAR|USD|EUR|GBP|QAR|KWD|BHD|OMR)\s*[\d,]+(?:\.\d{2})?\b/i);
      if (moneyMatch) {
        pushField("Monetary Amount", moneyMatch[0], page.page_number, line, block.bbox, "currency");
      }

      // 6. General content line under current section so every region of the page is marked
      if (line.length >= 6) {
        pushField(currentSection, line, page.page_number, line, block.bbox, "string");
      }
    }
  }

  return fields;
}
