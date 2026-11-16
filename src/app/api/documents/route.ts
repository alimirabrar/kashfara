import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";

export async function GET() {
  const docs = await store.listDocuments();
  return NextResponse.json({
    documents: docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      format: d.format,
      size_bytes: d.size_bytes,
      page_count: d.page_count,
      status: d.status,
      classification: d.classification,
      fields_count: d.fields.length,
      tables_count: d.tables.length,
      created_at: d.created_at,
      updated_at: d.updated_at,
      total_processing_ms: d.total_processing_ms,
    })),
  });
}
