import { NextResponse } from "next/server";
import { FormDigitalizer } from "@/services/documents/form-digitalizer";
import { NoEligibleProviderError } from "@/services/ai/inference-orchestrator";
import type { DigitalFormSchema, DocumentRecord } from "@/types/kashfara";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { document?: DocumentRecord };
    const doc = body.document;
    if (!doc) {
      return NextResponse.json({ error: "Missing document payload." }, { status: 400 });
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

export async function PATCH(req: Request) {
  const body = (await req.json()) as { digital_form?: DigitalFormSchema };
  if (!body.digital_form) {
    return NextResponse.json({ error: "Missing digital_form payload." }, { status: 400 });
  }
  return NextResponse.json({ digital_form: body.digital_form });
}
