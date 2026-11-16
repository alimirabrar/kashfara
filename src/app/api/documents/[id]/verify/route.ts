import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";
import { EvidenceValidator } from "@/services/evidence/evidence-validator";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const doc = await store.getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  // Allow manual visual verification override for a specific field_id, or full re-validation
  const body = (await req.json().catch(() => ({}))) as {
    field_id?: string;
    verification_status?: "VERIFIED" | "NEEDS_REVIEW" | "NOT_FOUND";
    visually_verified?: boolean;
  };

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
  await store.saveDocument(doc);

  return NextResponse.json({
    fields: doc.fields,
    tables: doc.tables,
    document: doc,
  });
}
