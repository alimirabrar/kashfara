import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; pageNumber: string }> }
) {
  const { id, pageNumber } = await context.params;
  const doc = await store.getDocument(id);
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const pageNum = Number(pageNumber);
  const page = doc.pages.find((p) => p.page_number === pageNum);
  if (!page || !page.image_path) {
    return NextResponse.json({ error: "Page image not available." }, { status: 404 });
  }

  const buf = await store.readPageImageBuffer(page.image_path);
  if (!buf) {
    return NextResponse.json({ error: "Page image file missing." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": page.mime_type || "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
