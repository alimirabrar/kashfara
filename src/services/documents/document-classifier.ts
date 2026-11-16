import { InferenceOrchestrator } from "@/services/ai/inference-orchestrator";
import { store } from "@/services/storage/store";
import type { DocumentClassification, DocumentRecord } from "@/types/kashfara";

interface RawClassificationJson {
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
}

export const DocumentClassifier = {
  async classify(doc: DocumentRecord): Promise<{
    classification: DocumentClassification;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
  }> {
    const images: Array<{ base64: string; mimeType: string }> = [];
    for (const page of doc.pages.slice(0, 3)) {
      if (page.image_path) {
        const b64 = await store.readPageImageBase64(page.image_path);
        if (b64) {
          images.push({ base64: b64, mimeType: page.mime_type || "image/png" });
        }
      }
    }

    const textContext =
      images.length === 0
        ? doc.pages
            .slice(0, 4)
            .map((p) => `--- Page ${p.page_number} ---\n${(p.text_content || "").slice(0, 3000)}`)
            .join("\n\n")
        : `Filename: ${doc.filename}, Format: ${doc.format}, Total Pages: ${doc.page_count}`;

    const systemPrompt = `You are KASHFARA VISION, an enterprise multimodal document classification engine.
Inspect the document strictly based on its actual visual and textual contents.
Return ONLY valid JSON matching this schema:
{
  "document_type": "e.g. Tax Invoice | Commercial Invoice | Purchase Order | Contract | Passport | Emirates ID | Bank Statement | Insurance Document | Tax Certificate | Application Form | Employee Form | Industrial Inspection Report | Technical Specification | Delivery Note | Bill of Lading | Customs Document | Government Certificate | Other",
  "subtype": "string or null",
  "language": "e.g. English | Arabic | Arabic-English | French | etc.",
  "is_rtl": boolean,
  "is_form": boolean (true if the document contains fillable/labeled form fields, checkboxes, or application/registration sections),
  "has_tables": boolean,
  "has_signatures": boolean,
  "has_stamps": boolean,
  "has_handwriting": boolean,
  "confidence": number between 0 and 1 or null,
  "summary": "concise 1-2 sentence factual summary of the document"
}`;

    const res = await InferenceOrchestrator.runTask<RawClassificationJson>({
      task: "document_classification",
      documentId: doc.id,
      systemPrompt,
      userPrompt: `Classify this ${doc.page_count}-page document.\n${textContext}`,
      images,
      expectJson: true,
      maxTokens: 800,
      pagesCount: images.length || doc.page_count,
    });

    const p = res.parsed || {};
    const classification: DocumentClassification = {
      document_type: p.document_type || "Other",
      subtype: p.subtype ?? null,
      language: p.language || "Unknown",
      is_rtl: Boolean(p.is_rtl),
      page_count: doc.page_count,
      is_form: Boolean(p.is_form),
      has_tables: Boolean(p.has_tables),
      has_signatures: Boolean(p.has_signatures),
      has_stamps: Boolean(p.has_stamps),
      has_handwriting: Boolean(p.has_handwriting),
      confidence: typeof p.confidence === "number" ? p.confidence : null,
      summary: p.summary || "Classification completed.",
      provider_used: res.provider,
      model_used: res.model,
    };

    return {
      classification,
      provider: res.provider,
      model: res.model,
      input_tokens: res.input_tokens,
      output_tokens: res.output_tokens,
      latency_ms: res.latency_ms,
    };
  },
};
