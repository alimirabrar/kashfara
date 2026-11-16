import crypto from "node:crypto";
import { InferenceOrchestrator } from "@/services/ai/inference-orchestrator";
import { store } from "@/services/storage/store";
import { QARetrieval } from "./retrieval";
import { CitationValidator } from "./citation-validator";
import type { DocumentRecord, QACitation, QAMessage } from "@/types/kashfara";

interface RawQAPayload {
  answer?: string;
  not_found_in_document?: boolean;
  uncertainty_note?: string | null;
  citations?: Array<{
    page_number?: number;
    supporting_passage?: string;
    field_id?: string;
    table_id?: string;
  }>;
}

export const AnswerGenerator = {
  async answerQuestion(
    doc: DocumentRecord,
    question: string
  ): Promise<{
    userMessage: QAMessage;
    assistantMessage: QAMessage;
  }> {
    const retrieved = QARetrieval.retrieve(doc, question);
    const images: Array<{ base64: string; mimeType: string }> = [];

    for (const pageNum of retrieved.relevantPages) {
      const page = doc.pages.find((p) => p.page_number === pageNum);
      if (page?.image_path) {
        const b64 = await store.readPageImageBase64(page.image_path);
        if (b64) {
          images.push({ base64: b64, mimeType: page.mime_type || "image/png" });
        }
      }
    }

    const systemPrompt = `You are KASHFARA VISION's Document-Grounded Q&A Engine.
Answer the user's question strictly from the selected document's pages, extracted fields, and tables.
RULES:
1. If the answer is NOT present in the document, set "not_found_in_document": true and explicitly state that the information is absent from the document. Never fabricate an answer.
2. Every factual claim must cite the exact page_number and supporting_passage from the document.
3. If the document is ambiguous or partially legible, include an "uncertainty_note".

Return ONLY valid JSON:
{
  "answer": "Clear, concise grounded answer",
  "not_found_in_document": false,
  "uncertainty_note": null,
  "citations": [
    {
      "page_number": 1,
      "supporting_passage": "Exact quote or evidence from document",
      "field_id": "optional field_id",
      "table_id": "optional table_id"
    }
  ]
}`;

    const res = await InferenceOrchestrator.runTask<RawQAPayload>({
      task: "document_qa",
      documentId: doc.id,
      systemPrompt,
      userPrompt: `Question: ${question}\n\nGrounded Document Context:\n${retrieved.contextText}`,
      images,
      requiresArabic: doc.classification?.is_rtl,
      expectJson: true,
      maxTokens: 1600,
      pagesCount: images.length || 1,
    });

    const rawCitations: QACitation[] = (res.parsed?.citations || []).map((c) => ({
      page_number: Number(c.page_number) || retrieved.relevantPages[0] || 1,
      supporting_passage: String(c.supporting_passage || ""),
      field_id: c.field_id,
      table_id: c.table_id,
    }));

    const validCitations = CitationValidator.validate(rawCitations, doc);

    const now = new Date().toISOString();
    const userMessage: QAMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      created_at: now,
    };

    const assistantMessage: QAMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        res.parsed?.answer ||
        res.raw_text ||
        "Unable to extract an answer from the document.",
      created_at: new Date().toISOString(),
      citations: validCitations,
      uncertainty_note: res.parsed?.uncertainty_note ?? null,
      not_found_in_document: Boolean(res.parsed?.not_found_in_document),
      provider_used: res.provider,
      model_used: res.model,
    };

    return { userMessage, assistantMessage };
  },
};
