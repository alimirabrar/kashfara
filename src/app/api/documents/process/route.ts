import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { DocumentAnalyzer } from "@/services/documents/document-analyzer";
import { EvidenceValidator } from "@/services/evidence/evidence-validator";
import { DailyUsageLedger } from "@/services/usage/daily-ledger";
import { NoEligibleProviderError } from "@/services/ai/inference-orchestrator";
import type { DocumentRecord, TemplateKind } from "@/types/kashfara";

export const maxDuration = 60;

export async function POST(req: Request) {
  const jobId = `job_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const startAll = Date.now();

  try {
    const body = (await req.json()) as {
      document?: DocumentRecord;
      preferred_template?: TemplateKind | "auto";
    };
    const doc = body.document;
    if (!doc || !doc.id || !Array.isArray(doc.pages)) {
      return NextResponse.json(
        { error: "Missing stateless document payload." },
        { status: 400 }
      );
    }

    doc.status = "processing";
    doc.error_message = undefined;

    const analysis = await DocumentAnalyzer.classifyAndExtract(doc, body.preferred_template);
    doc.classification = analysis.classification;
    doc.intelligence = analysis.intelligence;
    doc.processing_logs.push({
      step: "AI Classification, Template & Extraction",
      task: "key_value_extraction",
      status: "completed",
      provider: analysis.provider,
      model: analysis.model,
      duration_ms: analysis.latency_ms,
      input_tokens: analysis.input_tokens,
      output_tokens: analysis.output_tokens,
      timestamp: new Date().toISOString(),
    });

    const verifyStart = Date.now();
    const validatedFields = EvidenceValidator.validateFields(analysis.fields, doc.pages);
    doc.fields = validatedFields.length > 0 ? validatedFields : doc.fields;
    doc.tables = EvidenceValidator.validateTables(analysis.tables, doc.pages);
    doc.processing_logs.push({
      step: "Evidence Verification",
      task: "extraction_verification",
      status: "completed",
      duration_ms: Date.now() - verifyStart,
      timestamp: new Date().toISOString(),
    });

    doc.status = "completed";
    doc.updated_at = new Date().toISOString();
    doc.total_processing_ms = Date.now() - startAll;

    await DailyUsageLedger.recordDocumentCompleted(doc.page_count, true);

    return NextResponse.json({
      job_id: jobId,
      document: doc,
      diagnostics: analysis.diagnostics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    const reasons = err instanceof NoEligibleProviderError ? err.reasons : undefined;
    const diagnostics = err instanceof NoEligibleProviderError ? err.diagnostics : undefined;

    return NextResponse.json(
      {
        job_id: jobId,
        error: message,
        reasons,
        diagnostics,
      },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}
