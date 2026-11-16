import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";
import { DocumentClassifier } from "@/services/documents/document-classifier";
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

    const res = await DocumentClassifier.classify(doc);
    doc.classification = res.classification;
    doc.updated_at = new Date().toISOString();
    doc.processing_logs.push({
      step: "Document Classification",
      task: "document_classification",
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
      classification: doc.classification,
      document: doc,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Classification failed.";
    return NextResponse.json(
      { error: message, reasons: err instanceof NoEligibleProviderError ? err.reasons : undefined },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}
