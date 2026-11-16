import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";
import { DocumentClassifier } from "@/services/documents/document-classifier";
import { FieldAndTableExtractor } from "@/services/documents/field-extractor";
import { EvidenceValidator } from "@/services/evidence/evidence-validator";
import { DailyUsageLedger } from "@/services/usage/daily-ledger";
import { NoEligibleProviderError } from "@/services/ai/inference-orchestrator";
import type { ProcessingJob } from "@/types/kashfara";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id");
  if (!jobId) {
    return NextResponse.json({ error: "Missing job_id query parameter." }, { status: 400 });
  }
  const job = await store.getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }
  return NextResponse.json({ job });
}

export async function POST(req: Request) {
  let documentId = "";
  const jobId = `job_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const startAll = Date.now();

  try {
    const body = (await req.json()) as { document_id?: string };
    documentId = body.document_id || "";
    if (!documentId) {
      return NextResponse.json({ error: "Missing document_id." }, { status: 400 });
    }

    const doc = await store.getDocument(documentId);
    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const updateJob = async (
      status: ProcessingJob["status"],
      stage: string,
      progress_pct: number,
      error?: string
    ) => {
      await store.saveJob({
        job_id: jobId,
        document_id: documentId,
        status,
        stage,
        progress_pct,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error,
      });
    };

    doc.status = "processing";
    doc.error_message = undefined;
    await store.saveDocument(doc);
    await updateJob("running", "classification", 20);

    // Stage 1: Classification
    const clsRes = await DocumentClassifier.classify(doc);
    doc.classification = clsRes.classification;
    doc.processing_logs.push({
      step: "Document Classification",
      task: "document_classification",
      status: "completed",
      provider: clsRes.provider,
      model: clsRes.model,
      duration_ms: clsRes.latency_ms,
      input_tokens: clsRes.input_tokens,
      output_tokens: clsRes.output_tokens,
      timestamp: new Date().toISOString(),
    });
    await store.saveDocument(doc);
    await updateJob("running", "extraction", 55);

    // Stage 2: Dynamic Field & Table Extraction
    const extRes = await FieldAndTableExtractor.extractAll(doc);
    doc.processing_logs.push({
      step: "Multimodal Field & Table Extraction",
      task: "key_value_extraction",
      status: "completed",
      provider: extRes.provider,
      model: extRes.model,
      duration_ms: extRes.latency_ms,
      input_tokens: extRes.input_tokens,
      output_tokens: extRes.output_tokens,
      timestamp: new Date().toISOString(),
    });
    await updateJob("running", "verification", 85);

    // Stage 3: Evidence Verification
    const verifyStart = Date.now();
    doc.fields = EvidenceValidator.validateFields(extRes.fields, doc.pages);
    doc.tables = EvidenceValidator.validateTables(extRes.tables, doc.pages);
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
    await store.saveDocument(doc);
    await DailyUsageLedger.recordDocumentCompleted(doc.page_count, true);
    await updateJob("completed", "done", 100);

    return NextResponse.json({
      job_id: jobId,
      document: doc,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed.";
    const reasons = err instanceof NoEligibleProviderError ? err.reasons : undefined;

    if (documentId) {
      const doc = await store.getDocument(documentId);
      if (doc) {
        doc.status = "failed";
        doc.error_message = message;
        doc.updated_at = new Date().toISOString();
        await store.saveDocument(doc);
      }
    }

    await store.saveJob({
      job_id: jobId,
      document_id: documentId,
      status: "failed",
      stage: "error",
      progress_pct: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: message,
    });

    return NextResponse.json(
      {
        job_id: jobId,
        error: message,
        reasons,
      },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}
