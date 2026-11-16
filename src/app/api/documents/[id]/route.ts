import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const doc = await store.getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  return NextResponse.json({ document: doc });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const deleted = await store.deleteDocument(id);
  if (!deleted) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
  return NextResponse.json({
    deleted: true,
    document_id: id,
    message: "Original file, page renders, and extracted data securely deleted.",
  });
}
