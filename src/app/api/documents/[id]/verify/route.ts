import { NextResponse } from "next/server";
import { EvidenceValidator } from "@/services/evidence/evidence-validator";
import type { DocumentRecord } from "@/types/kashfara";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    document?: DocumentRecord;
    field_id?: string;
    verification_status?: "VERIFIED" | "NEEDS_REVIEW" | "NOT_FOUND";
    visually_verified?: boolean;
  };

  const doc = body.document;
  if (!doc) {
    return NextResponse.json({ error: "Missing document payload." }, { status: 400 });
  }

  if (body.field_id && body.verification_status) {
    doc.fields = doc.fields.map((f) =>
      f.field_id === body.field_id
        ? {
            ...f,
            verification_status: body.verification_status!,
            coordinate_source: body.visually_verified ? "visually_verified" : f.coordinate_source,
            verification_notes: body.visually_verified
              ? "Visually verified by operator in Kashfara Proofing."
              : f.verification_notes,
          }
        : f
    );
  } else {
    doc.fields = EvidenceValidator.validateFields(doc.fields, doc.pages);
    doc.tables = EvidenceValidator.validateTables(doc.tables, doc.pages);
  }

  doc.updated_at = new Date().toISOString();

  return NextResponse.json({
    fields: doc.fields,
    tables: doc.tables,
    document: doc,
  });
}
