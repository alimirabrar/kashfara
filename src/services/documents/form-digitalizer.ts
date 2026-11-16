import crypto from "node:crypto";
import { InferenceOrchestrator } from "@/services/ai/inference-orchestrator";
import { store } from "@/services/storage/store";
import type {
  DigitalFormField,
  DigitalFormSchema,
  DigitalFormSection,
  DocumentRecord,
} from "@/types/kashfara";

interface RawDigitalFormPayload {
  title?: string;
  sections?: Array<{
    title?: string;
    fields?: Array<{
      label?: string;
      normalized_key?: string;
      field_type?: string;
      value?: string | boolean | null;
      checked?: boolean;
      page_number?: number;
      source_field_id?: string;
    }>;
  }>;
}

const VALID_FIELD_TYPES = new Set([
  "text",
  "number",
  "date",
  "checkbox",
  "textarea",
  "signature",
]);

export const FormDigitalizer = {
  async digitalize(doc: DocumentRecord): Promise<{
    form: DigitalFormSchema;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
  }> {
    const images: Array<{ base64: string; mimeType: string }> = [];
    for (const page of doc.pages.slice(0, 4)) {
      if (page.image_path) {
        const b64 = await store.readPageImageBase64(page.image_path);
        if (b64) {
          images.push({ base64: b64, mimeType: page.mime_type || "image/png" });
        }
      }
    }

    const existingFieldsSummary = doc.fields
      .map(
        (f) =>
          `- [${f.field_id}] (p.${f.page_number}) ${f.label}: ${
            f.value === null || f.value === "" ? "<EMPTY>" : String(f.value)
          }`
      )
      .join("\n");

    const systemPrompt = `You are KASHFARA VISION's Automatic Form Digitalisation Engine.
Convert the attached form document into a faithful, editable digital form structure.
RULES:
1. Preserve exact section headings and field ordering from top to bottom.
2. Include BOTH filled fields and EMPTY/blank fields.
3. Missing or blank values MUST remain null (never invent answers, dropdown options, or required-field flags).
4. Identify checkboxes (field_type: "checkbox", checked: true/false), date fields ("date"), numerical fields ("number"), signatures ("signature"), long text ("textarea"), and standard text ("text").

Return ONLY valid JSON:
{
  "title": "Form title from document",
  "sections": [
    {
      "title": "Section heading (or General Information)",
      "fields": [
        {
          "label": "Original label",
          "normalized_key": "snake_case_key",
          "field_type": "text | number | date | checkbox | textarea | signature",
          "value": "string | boolean | null",
          "checked": false,
          "page_number": 1,
          "source_field_id": "optional matching field_id"
        }
      ]
    }
  ]
}`;

    const res = await InferenceOrchestrator.runTask<RawDigitalFormPayload>({
      task: "form_detection",
      documentId: doc.id,
      systemPrompt,
      userPrompt: `Digitalize this form (${doc.filename}).\nPreviously extracted fields:\n${existingFieldsSummary || "None yet"}`,
      images,
      requiresArabic: doc.classification?.is_rtl,
      expectJson: true,
      maxTokens: 3500,
      pagesCount: images.length || doc.page_count,
    });

    const rawSections = res.parsed?.sections || [];
    let fieldOrder = 0;

    const sections: DigitalFormSection[] = rawSections.map((sec, sIdx) => {
      const fields: DigitalFormField[] = (sec.fields || []).map((f) => {
        fieldOrder += 1;
        const ft =
          f.field_type && VALID_FIELD_TYPES.has(f.field_type)
            ? (f.field_type as DigitalFormField["field_type"])
            : "text";
        const val = f.value === undefined || f.value === "" ? null : f.value;
        return {
          id: `df_${String(fieldOrder).padStart(3, "0")}`,
          label: String(f.label || `Field ${fieldOrder}`),
          normalized_key: String(
            f.normalized_key ||
              String(f.label || `field_${fieldOrder}`)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
          ),
          field_type: ft,
          value: val,
          is_empty: val === null,
          checked: ft === "checkbox" ? Boolean(f.checked ?? val === true) : undefined,
          page_number: Number(f.page_number) || 1,
          order: fieldOrder,
          section: sec.title || `Section ${sIdx + 1}`,
          source_field_id: f.source_field_id,
        };
      });

      return {
        title: sec.title || `Section ${sIdx + 1}`,
        order: sIdx + 1,
        fields,
      };
    });

    const form: DigitalFormSchema = {
      form_id: crypto.randomUUID(),
      document_id: doc.id,
      title: res.parsed?.title || doc.classification?.document_type || doc.filename,
      language: doc.classification?.language || "Unknown",
      is_rtl: Boolean(doc.classification?.is_rtl),
      generated_at: new Date().toISOString(),
      sections,
      tables: doc.tables || [],
      provider_used: res.provider,
      model_used: res.model,
    };

    return {
      form,
      provider: res.provider,
      model: res.model,
      input_tokens: res.input_tokens,
      output_tokens: res.output_tokens,
      latency_ms: res.latency_ms,
    };
  },
};
