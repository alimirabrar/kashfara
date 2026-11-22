import { InferenceOrchestrator } from "@/services/ai/inference-orchestrator";
import { formatPagesForReasoning } from "./page-formatter";
import type {
  DocumentClassification,
  DocumentIntelligence,
  DocumentRecord,
  EngineDiagnostics,
  ExtractedField,
  ExtractedTable,
  TemplateKind,
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
  template?: TemplateKind;
  template_confidence?: number | null;
  template_data?: Record<string, unknown> | null;
  english_translation?: string | null;
  key_points?: string[];
  fields?: Array<{
    label?: string;
    normalized_key?: string;
    value?: string | number | boolean | null;
    raw_value?: string | null;
    data_type?: string;
    page_number?: number;
    source_text?: string | null;
    structural_ref?: string | null;
    confidence?: number | null;
  }>;
  tables?: Array<{
    title?: string | null;
    page_number?: number;
    headers?: string[];
    rows?: string[][];
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

const VALID_TEMPLATES = new Set<TemplateKind>([
  "resume",
  "invoice",
  "bank_statement",
  "contract",
  "receipt",
  "generic",
]);

export const DocumentAnalyzer = {
  async classifyAndExtract(doc: DocumentRecord): Promise<{
    classification: DocumentClassification;
    intelligence: DocumentIntelligence;
    fields: ExtractedField[];
    tables: ExtractedTable[];
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
    diagnostics: EngineDiagnostics;
  }> {
    const parsedText = formatPagesForReasoning(doc.pages.slice(0, 8));
    const hasArabicHint = /[\u0600-\u06FF]/.test(doc.filename + " " + parsedText);

    const systemPrompt = `You are KASHFARA VISION's Document Reasoning Engine.
You are given pre-parsed OCR / structural text extracted from a document (up to ${doc.page_count} pages).
Perform:
1. Accurate classification (document_type, language, is_rtl, is_form, has_tables, has_signatures, has_stamps, has_handwriting, summary).
2. Template detection — choose ONE of:
   - "resume": CV / Resume. Populate template_data with:
     { "full_name", "email", "phone", "location", "headline", "summary", "years_of_experience", "skills": string[], "experience": [{"role","company","period","highlights"}], "education": [{"degree","institution","year"}], "certifications": string[], "languages": string[] }
   - "invoice": Tax or Commercial Invoice. Populate template_data with:
     { "invoice_number", "issue_date", "due_date", "vendor_name", "vendor_trn", "customer_name", "currency", "subtotal", "vat_tax", "total_amount", "payment_terms", "line_items": [{"description","qty","unit_price","total"}] }
   - "bank_statement": Bank or Financial Statement. Populate template_data with:
     { "bank_name", "account_holder", "account_number", "iban", "statement_period", "currency", "opening_balance", "closing_balance", "total_credits", "total_debits", "transactions": [{"date","description","debit","credit","balance"}] }
   - "contract": Legal / Commercial / Employment Contract. Populate template_data with:
     { "contract_title", "contract_number", "effective_date", "expiry_date", "party_a", "party_b", "contract_value", "governing_law", "key_obligations": string[], "termination_terms" }
   - "receipt": Payment Receipt / Purchase Order / Expense Voucher. Populate template_data with:
     { "receipt_number", "date", "merchant_name", "payer", "payment_method", "currency", "subtotal", "tax", "total_paid", "items": [{"name","qty","amount"}] }
   - "generic": If none of the 5 templates fit. Populate template_data with null.
3. If the document is Arabic or non-English, provide a concise, faithful "english_translation" summarizing the full document content in English (otherwise null), plus 3-6 "key_points".
4. Extract key-value "fields" (with exact verbatim "source_text" from the parsed text so coordinates can be matched) and "tables".
Never invent values not present in the text.

Return ONLY valid JSON:
{
  "classification": {
    "document_type": "string",
    "subtype": "string | null",
    "language": "string",
    "is_rtl": boolean,
    "is_form": boolean,
    "has_tables": boolean,
    "has_signatures": boolean,
    "has_stamps": boolean,
    "has_handwriting": boolean,
    "confidence": 0.95,
    "summary": "string"
  },
  "template": "resume | invoice | bank_statement | contract | receipt | generic",
  "template_confidence": 0.95,
  "template_data": {},
  "english_translation": "string | null",
  "key_points": ["string"],
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
      "confidence": 0.95
    }
  ],
  "tables": [
    {
      "title": "string | null",
      "page_number": 1,
      "headers": ["col1"],
      "rows": [["val1"]]
    }
  ]
}`;

    // Single fast reasoning call over the entire parsed text (keeps total latency ~2-5s!)
    const res = await InferenceOrchestrator.runTask<RawCombinedPayload>({
      task: hasArabicHint ? "arabic_english_understanding" : "key_value_extraction",
      documentId: doc.id,
      systemPrompt,
      userPrompt: `Document: ${doc.filename} (${doc.page_count} pages)\n\n${parsedText}`,
      requiresArabic: hasArabicHint,
      expectJson: true,
      maxTokens: 6000,
      pagesCount: doc.page_count,
    });

    const p = res.parsed || {};
    const c = p.classification || {};
    const classification: DocumentClassification = {
      document_type: c.document_type || "Document",
      subtype: c.subtype ?? null,
      language: c.language || (hasArabicHint ? "Arabic" : "Unknown"),
      is_rtl: Boolean(c.is_rtl ?? hasArabicHint),
      page_count: doc.page_count,
      is_form: Boolean(c.is_form),
      has_tables: Boolean(c.has_tables),
      has_signatures: Boolean(c.has_signatures),
      has_stamps: Boolean(c.has_stamps),
      has_handwriting: Boolean(c.has_handwriting),
      confidence: typeof c.confidence === "number" ? c.confidence : null,
      summary: c.summary || "Document analysis completed.",
      provider_used: res.provider,
      model_used: res.model,
    };

    const template: TemplateKind =
      p.template && VALID_TEMPLATES.has(p.template) ? p.template : "generic";

    const intelligence: DocumentIntelligence = {
      template,
      template_confidence:
        typeof p.template_confidence === "number" ? p.template_confidence : null,
      data: p.template_data && typeof p.template_data === "object" ? p.template_data : null,
      english_translation: p.english_translation ?? null,
      key_points: Array.isArray(p.key_points) ? p.key_points.map(String) : [],
      ats: null,
    };

    const allFields: ExtractedField[] = (p.fields || []).map((f, idx) => {
      const dt = f.data_type && VALID_DATA_TYPES.has(f.data_type) ? f.data_type : "string";
      return {
        field_id: `field_${String(idx + 1).padStart(3, "0")}`,
        label: String(f.label || `Field ${idx + 1}`),
        normalized_key: String(
          f.normalized_key ||
            String(f.label || `field_${idx + 1}`)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_|_$/g, "") ||
            `field_${idx + 1}`
        ),
        value: f.value ?? null,
        raw_value: f.raw_value ?? (f.value != null ? String(f.value) : null),
        data_type: dt as ExtractedField["data_type"],
        page_number: Number(f.page_number) || 1,
        source_text: f.source_text ?? null,
        structural_ref: f.structural_ref ?? null,
        bounding_box: null,
        coordinate_source: "none",
        confidence: typeof f.confidence === "number" ? f.confidence : null,
        verification_status: "NEEDS_REVIEW",
      };
    });

    const allTables: ExtractedTable[] = (p.tables || []).map((t, idx) => ({
      table_id: `table_${String(idx + 1).padStart(3, "0")}`,
      title: t.title ?? null,
      page_number: Number(t.page_number) || 1,
      headers: Array.isArray(t.headers) ? t.headers.map(String) : [],
      rows: Array.isArray(t.rows) ? t.rows.map((r) => (Array.isArray(r) ? r.map(String) : [])) : [],
      bounding_box: null,
      coordinate_source: "none",
      verification_status: "NEEDS_REVIEW",
    }));

    return {
      classification,
      intelligence,
      fields: allFields,
      tables: allTables,
      provider: res.provider,
      model: res.model,
      input_tokens: res.input_tokens,
      output_tokens: res.output_tokens,
      latency_ms: res.latency_ms,
      diagnostics: res.diagnostics,
    };
  },
};
