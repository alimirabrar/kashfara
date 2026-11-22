"use client";

import type { DocumentRecord, ExtractedField } from "@/types/kashfara";

/**
 * Ultra-fast (<20ms) local heuristic extractor that turns OCR lines / parsed text
 * into immediate proof-of-evidence fields with real bounding boxes before Gemini runs.
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
    const normKey = label
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, "_")
      .replace(/^_|_$/g, "") || `field_${fields.length + 1}`;
    const dedupeKey = `${pageNum}:${normKey}:${value}`;
    if (seen.has(dedupeKey) || fields.length >= 30) return;
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
      verification_notes: "Instant OCR/Parser extraction",
    });
  };

  for (const page of doc.pages) {
    const blocks =
      page.ocr_blocks && page.ocr_blocks.length > 0
        ? page.ocr_blocks.map((b) => ({ text: b.text, bbox: b.bbox }))
        : (page.text_content || "")
            .split(/\r?\n/)
            .map((t) => ({ text: t.trim(), bbox: null }));

    for (const block of blocks) {
      const line = block.text.trim();
      if (!line || line.length < 3) continue;

      // 1. Key: Value pattern (supports English ":" and Arabic "：")
      const kvMatch = line.match(/^([^:：]{2,40})[:：]\s*(.{1,120})$/);
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
    }
  }

  return fields;
}
