import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";
import { FormDigitalizer } from "@/services/documents/form-digitalizer";
import { NoEligibleProviderError } from "@/services/ai/inference-orchestrator";
import type { DigitalFormSchema } from "@/types/kashfara";

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

    const res = await FormDigitalizer.digitalize(doc);
    doc.digital_form = res.form;
    doc.updated_at = new Date().toISOString();
    doc.processing_logs.push({
      step: "Automatic Form Digitalisation",
      task: "form_detection",
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
      digital_form: doc.digital_form,
      document: doc,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Form digitalisation failed.";
    return NextResponse.json(
      { error: message, reasons: err instanceof NoEligibleProviderError ? err.reasons : undefined },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const doc = await store.getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const body = (await req.json()) as { digital_form?: DigitalFormSchema };
  if (!body.digital_form) {
    return NextResponse.json({ error: "Missing digital_form payload." }, { status: 400 });
  }

  doc.digital_form = body.digital_form;
  doc.updated_at = new Date().toISOString();
  await store.saveDocument(doc);

  return NextResponse.json({ digital_form: doc.digital_form });
}
