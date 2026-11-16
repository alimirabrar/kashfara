import { InferenceOrchestrator } from "@/services/ai/inference-orchestrator";
import { store } from "@/services/storage/store";
import type { DocumentRecord, ExtractedField, ExtractedTable } from "@/types/kashfara";

interface RawExtractionPayload {
  fields?: Array<{
    label?: string;
    normalized_key?: string;
    value?: string | number | boolean | null;
    raw_value?: string | null;
    data_type?: string;
    page_number?: number;
    source_text?: string | null;
    structural_ref?: string | null;
    bounding_box?: { x?: number; y?: number; width?: number; height?: number } | null;
    confidence?: number | null;
  }>;
  tables?: Array<{
    title?: string | null;
    page_number?: number;
    headers?: string[];
    rows?: string[][];
    bounding_box?: { x?: number; y?: number; width?: number; height?: number } | null;
  }>;
}

const VALID_DATA_TYPES = new Set([
  "string",
  "number",
  "date",
  "currency",
  "boolean",
  "array",
  "unknown",
]);

export const FieldAndTableExtractor = {
  async extractAll(doc: DocumentRecord): Promise<{
    fields: ExtractedField[];
    tables: ExtractedTable[];
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
  }> {
    const allFields: ExtractedField[] = [];
    const allTables: ExtractedTable[] = [];
    let totalIn = 0;
    let totalOut = 0;
    let totalLatency = 0;
    let lastProvider = "";
    let lastModel = "";

    const requiresArabic =
      doc.classification?.language?.toLowerCase().includes("arabic") ||
      doc.classification?.is_rtl ||
      false;

    // Batch pages in groups of 3 to stay within vision image-count & token budgets
    const batchSize = 3;
    for (let i = 0; i < doc.pages.length; i += batchSize) {
      const batch = doc.pages.slice(i, i + batchSize);
      const images: Array<{ base64: string; mimeType: string }> = [];

      for (const page of batch) {
        if (page.image_path) {
          const b64 = await store.readPageImageBase64(page.image_path);
          if (b64) {
            images.push({ base64: b64, mimeType: page.mime_type || "image/png" });
          }
        }
      }

      const pageRangeLabel =
        batch.length === 1
          ? `Page ${batch[0].page_number}`
          : `Pages ${batch[0].page_number}-${batch[batch.length - 1].page_number}`;

      const structuralContext =
        images.length === 0
          ? batch
              .map(
                (p) =>
                  `=== Page ${p.page_number} ===\n${
                    p.structural_blocks
                      ? p.structural_blocks.map((b) => `[${b.ref}] ${b.text}`).join("\n")
                      : p.text_content || ""
                  }`
              )
              .join("\n\n")
          : `Document Type: ${doc.classification?.document_type || "Unknown"}. Extracting ${pageRangeLabel} of ${doc.page_count}.`;

      const systemPrompt = `You are KASHFARA VISION, an evidence-backed multimodal document extraction engine.
Extract ALL key-value fields, headings, labels, dates, monetary amounts, currencies, entities, checkboxes, stamps/signatures, and tables visible in the provided ${pageRangeLabel}.
Never hardcode or invent fields that are not present in the document.
For every field:
- Provide the exact original "label" as printed on the document.
- Provide a snake_case "normalized_key".
- Provide "value" (null if empty/blank on a form) and "raw_value".
- Provide "page_number" (exact 1-based page number).
- Provide "source_text" (exact verbatim snippet from the document containing the label/value).
- For image pages, provide normalized "bounding_box": {"x": 0..1, "y": 0..1, "width": 0..1, "height": 0..1} relative to page dimensions. If unknown, set null.
- For Office documents without images, set "bounding_box": null and provide "structural_ref" if available.

Return ONLY valid JSON:
{
  "fields": [
    {
      "label": "string",
      "normalized_key": "string",
      "value": "string | number | boolean | null",
      "raw_value": "string | null",
      "data_type": "string | number | date | currency | boolean | unknown",
      "page_number": 1,
      "source_text": "string",
      "structural_ref": "string | null",
      "bounding_box": { "x": 0.1, "y": 0.2, "width": 0.2, "height": 0.04 },
      "confidence": 0.95
    }
  ],
  "tables": [
    {
      "title": "string | null",
      "page_number": 1,
      "headers": ["col1", "col2"],
      "rows": [["val1", "val2"]],
      "bounding_box": { "x": 0.05, "y": 0.4, "width": 0.9, "height": 0.3 }
    }
  ]
}`;

      const res = await InferenceOrchestrator.runTask<RawExtractionPayload>({
        task: requiresArabic ? "arabic_english_understanding" : "key_value_extraction",
        documentId: doc.id,
        systemPrompt,
        userPrompt: `Extract all fields and tables from ${pageRangeLabel}.\n${structuralContext}`,
        images,
        requiresArabic,
        expectJson: true,
        maxTokens: 3500,
        pagesCount: batch.length,
      });

      totalIn += res.input_tokens;
      totalOut += res.output_tokens;
      totalLatency += res.latency_ms;
      lastProvider = res.provider;
      lastModel = res.model;

      const rawFields = res.parsed?.fields || [];
      for (const f of rawFields) {
        const idx = allFields.length + 1;
        const dt = f.data_type && VALID_DATA_TYPES.has(f.data_type) ? f.data_type : "string";
        allFields.push({
          field_id: `field_${String(idx).padStart(3, "0")}`,
          label: String(f.label || `Field ${idx}`),
          normalized_key: String(
            f.normalized_key ||
              String(f.label || `field_${idx}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_|_$/g, "")
          ),
          value: f.value ?? null,
          raw_value: f.raw_value ?? (f.value != null ? String(f.value) : null),
          data_type: dt as ExtractedField["data_type"],
          page_number: Number(f.page_number) || batch[0].page_number,
          source_text: f.source_text ?? null,
          structural_ref: f.structural_ref ?? null,
          bounding_box: f.bounding_box
            ? {
                x: Number(f.bounding_box.x ?? 0),
                y: Number(f.bounding_box.y ?? 0),
                width: Number(f.bounding_box.width ?? 0),
                height: Number(f.bounding_box.height ?? 0),
              }
            : null,
          coordinate_source: f.bounding_box ? "model_proposed" : "none",
          confidence: typeof f.confidence === "number" ? f.confidence : null,
          verification_status: "NEEDS_REVIEW",
        });
      }

      const rawTables = res.parsed?.tables || [];
      for (const t of rawTables) {
        const idx = allTables.length + 1;
        allTables.push({
          table_id: `table_${String(idx).padStart(3, "0")}`,
          title: t.title ?? null,
          page_number: Number(t.page_number) || batch[0].page_number,
          headers: Array.isArray(t.headers) ? t.headers.map(String) : [],
          rows: Array.isArray(t.rows) ? t.rows.map((r) => (Array.isArray(r) ? r.map(String) : [])) : [],
          bounding_box: t.bounding_box
            ? {
                x: Number(t.bounding_box.x ?? 0),
                y: Number(t.bounding_box.y ?? 0),
                width: Number(t.bounding_box.width ?? 0),
                height: Number(t.bounding_box.height ?? 0),
              }
            : null,
          coordinate_source: t.bounding_box ? "model_proposed" : "none",
          verification_status: "NEEDS_REVIEW",
        });
      }
    }

    return {
      fields: allFields,
      tables: allTables,
      provider: lastProvider,
      model: lastModel,
      input_tokens: totalIn,
      output_tokens: totalOut,
      latency_ms: totalLatency,
    };
  },
};
