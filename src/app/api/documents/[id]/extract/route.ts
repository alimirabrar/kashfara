import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";
import { FieldAndTableExtractor } from "@/services/documents/field-extractor";
import { EvidenceValidator } from "@/services/evidence/evidence-validator";
import { NoEligibleProviderError } from "@/services/ai/inference-orchestrator";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const doc = await store.getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const res = await FieldAndTableExtractor.extractAll(doc);
    doc.fields = EvidenceValidator.validateFields(res.fields, doc.pages);
    doc.tables = EvidenceValidator.validateTables(res.tables, doc.pages);
    doc.status = "completed";
    doc.updated_at = new Date().toISOString();
    doc.processing_logs.push({
      step: "Field & Table Extraction",
      task: "key_value_extraction",
      status: "completed",
      provider: res.provider,
      model: res.model,
      duration_ms: res.latency_ms,
      input_tokens: res.input_tokens,
      output_tokens: res.output_tokens,
      timestamp: new Date().toISOString(),
    });
    await store.saveDocument(doc);

    return NextResponse.json({
      fields: doc.fields,
      tables: doc.tables,
      document: doc,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    return NextResponse.json(
      { error: message, reasons: err instanceof NoEligibleProviderError ? err.reasons : undefined },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}
