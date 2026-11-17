import { InferenceOrchestrator } from "@/services/ai/inference-orchestrator";
import { getPageImageForVision } from "./page-image";
import type {
  DocumentClassification,
  DocumentRecord,
  ExtractedField,
  ExtractedTable,
} from "@/types/kashfara";

interface RawCombinedPayload {
  classification?: {
    document_type?: string;
    subtype?: string | null;
    language?: string;
    is_rtl?: boolean;
    is_form?: boolean;
    has_tables?: boolean;
    has_signatures?: boolean;
    has_stamps?: boolean;
    has_handwriting?: boolean;
    confidence?: number | null;
    summary?: string;
  };
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

export const DocumentAnalyzer = {
  async classifyAndExtract(doc: DocumentRecord): Promise<{
    classification: DocumentClassification;
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
    let classification: DocumentClassification | null = null;
    let totalIn = 0;
    let totalOut = 0;
    let totalLatency = 0;
    let lastProvider = "Kashfara Vision";
    let lastModel = "Kashfara Multimodal Core";

    // Check if filename or any structural text has Arabic characters
    const hasArabicHint = /[\u0600-\u06FF]/.test(
      doc.filename + " " + doc.pages.map((p) => p.text_content || "").join(" ")
    );

    const batchSize = 2;
    const batchStarts: number[] = [];
    for (let i = 0; i < doc.pages.length; i += batchSize) batchStarts.push(i);

    // Run all page batches in parallel for speed
    const batchResults = await Promise.all(batchStarts.map(async (i) => {
      const batch = doc.pages.slice(i, i + batchSize);
      const images: Array<{ base64: string; mimeType: string }> = [];

      for (const page of batch) {
        const img = await getPageImageForVision(page);
        if (img) images.push(img);
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
          : `Filename: ${doc.filename} (${doc.page_count} total pages). Analyzing ${pageRangeLabel}.${
              batch.some((p) => p.text_content)
                ? "\n\nPre-parsed OCR/Text Layer:\n" +
                  batch
                    .filter((p) => p.text_content)
                    .map((p) => `[Page ${p.page_number}]: ${(p.text_content || "").slice(0, 2000)}`)
                    .join("\n")
                : ""
            }`;

      const isFirstBatch = i === 0;
      const systemPrompt = `You are KASHFARA VISION, an enterprise multimodal document intelligence engine.
You MUST accurately understand:
- English, Arabic (RTL), and bilingual Arabic-English documents (preserve original Arabic script faithfully; never transliterate or drop Arabic text).
- BOTH structured documents (invoices, IDs, passports, forms, tax certificates, bank statements) AND unstructured documents (contracts, letters, memos, inspection reports, narratives, handwritten notes, stamps, signatures).
- For unstructured documents, extract key sections, clauses, parties, obligations, dates, reference numbers, stamps, signatures, and summary points as fields.
- Never invent fields that do not exist in the document. Empty/blank form fields must have value: null.

For every extracted field:
- "label": Exact label or section heading as written (keep Arabic or English as printed).
- "normalized_key": English snake_case key.
- "value": Extracted value (or null if blank).
- "raw_value": Verbatim string from document.
- "page_number": Exact 1-based page number.
- "source_text": Exact verbatim quote from the document supporting this field.
- "bounding_box": Normalized { "x": 0..1, "y": 0..1, "width": 0..1, "height": 0..1 } relative to page dimensions (or null for text-only Office docs).

Return ONLY valid JSON:
{${
        isFirstBatch
          ? `
  "classification": {
    "document_type": "e.g. Tax Invoice | Commercial Invoice | Contract | Government Certificate | Application Form | Letter | Report | Other",
    "subtype": "string or null",
    "language": "e.g. Arabic | English | Arabic-English",
    "is_rtl": boolean,
    "is_form": boolean,
    "has_tables": boolean,
    "has_signatures": boolean,
    "has_stamps": boolean,
    "has_handwriting": boolean,
    "confidence": 0.95,
    "summary": "1-2 sentence factual summary"
  },`
          : ""
      }
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

      const res = await InferenceOrchestrator.runTask<RawCombinedPayload>({
        task: hasArabicHint ? "arabic_english_understanding" : "key_value_extraction",
        documentId: doc.id,
        systemPrompt,
        userPrompt: `Analyze ${pageRangeLabel} of this document and return structured JSON.\n${structuralContext}`,
        images,
        requiresArabic: hasArabicHint,
        expectJson: true,
        maxTokens: 16384,
        pagesCount: batch.length,
      });
      return { i, batch, res };
    }));

    for (const { i, batch, res } of batchResults) {
      const isFirstBatch = i === 0;
      totalIn += res.input_tokens;
      totalOut += res.output_tokens;
      totalLatency += res.latency_ms;
      lastProvider = res.provider;
      lastModel = res.model;

      if (isFirstBatch && res.parsed?.classification) {
        const c = res.parsed.classification;
        classification = {
          document_type: c.document_type || "Document",
          subtype: c.subtype ?? null,
          language: c.language || "Unknown",
          is_rtl: Boolean(c.is_rtl),
          page_count: doc.page_count,
          is_form: Boolean(c.is_form),
          has_tables: Boolean(c.has_tables),
          has_signatures: Boolean(c.has_signatures),
          has_stamps: Boolean(c.has_stamps),
          has_handwriting: Boolean(c.has_handwriting),
          confidence: typeof c.confidence === "number" ? c.confidence : null,
          summary: c.summary || "Analysis completed.",
          provider_used: res.provider,
          model_used: res.model,
        };
      }

      for (const f of res.parsed?.fields || []) {
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
                .replace(/^_|_$/g, "") ||
              `field_${idx}`
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

      for (const t of res.parsed?.tables || []) {
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

    if (!classification) {
      classification = {
        document_type: "Document",
        subtype: null,
        language: hasArabicHint ? "Arabic" : "Unknown",
        is_rtl: hasArabicHint,
        page_count: doc.page_count,
        is_form: false,
        has_tables: allTables.length > 0,
        has_signatures: false,
        has_stamps: false,
        has_handwriting: false,
        confidence: null,
        summary: "Document processed.",
        provider_used: lastProvider,
        model_used: lastModel,
      };
    }

    return {
      classification,
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
