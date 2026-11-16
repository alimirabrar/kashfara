import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { DocumentIngestion } from "@/services/documents/ingestion";
import { OfficeParser } from "@/services/documents/office-parser";
import type { DocumentPage, DocumentRecord } from "@/types/kashfara";

export async function POST(req: Request) {
  try {
    const cfg = getConfig();
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing uploaded file." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const validated = DocumentIngestion.validateFile(file.name, file.type, buffer);

    const docId = `doc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    let pages: DocumentPage[] = [];

    if (validated.format === "pdf") {
      const pageFiles = formData
        .getAll("rendered_pages")
        .filter((v): v is File => v instanceof File);
      const roughCount = DocumentIngestion.countPdfPagesRough(buffer);
      const pageCount = pageFiles.length > 0 ? pageFiles.length : roughCount;

      if (pageCount > cfg.maxDocumentPages) {
        return NextResponse.json(
          {
            error: `PDF has ${pageCount} pages, exceeding maximum (${cfg.maxDocumentPages} pages).`,
          },
          { status: 400 }
        );
      }

      if (pageFiles.length > 0) {
        for (let i = 0; i < pageFiles.length; i++) {
          const pBuf = Buffer.from(await pageFiles[i].arrayBuffer());
          const prep = await DocumentIngestion.prepareImageForStorageAndVision(pBuf);
          const dataUrl = `data:image/jpeg;base64,${prep.pngBuffer.toString("base64")}`;
          pages.push({
            page_number: i + 1,
            width: prep.width,
            height: prep.height,
            image_url: dataUrl,
            mime_type: "image/jpeg",
          });
        }
      } else {
        for (let i = 1; i <= pageCount; i++) {
          pages.push({
            page_number: i,
            width: 1240,
            height: 1754,
            mime_type: "image/png",
          });
        }
      }
    } else if (
      validated.format === "png" ||
      validated.format === "jpg" ||
      validated.format === "jpeg" ||
      validated.format === "webp" ||
      validated.format === "tiff"
    ) {
      const prep = await DocumentIngestion.prepareImageForStorageAndVision(buffer);
      const dataUrl = `data:image/jpeg;base64,${prep.pngBuffer.toString("base64")}`;
      pages = [
        {
          page_number: 1,
          width: prep.width,
          height: prep.height,
          image_url: dataUrl,
          mime_type: "image/jpeg",
        },
      ];
    } else if (validated.format === "docx") {
      pages = await OfficeParser.parseDocx(buffer);
    } else if (validated.format === "pptx") {
      pages = await OfficeParser.parsePptx(buffer);
    } else if (validated.format === "xlsx") {
      pages = await OfficeParser.parseXlsx(buffer);
    }

    if (pages.length > cfg.maxDocumentPages) {
      return NextResponse.json(
        {
          error: `Document has ${pages.length} pages, exceeding maximum (${cfg.maxDocumentPages}).`,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const record: DocumentRecord = {
      id: docId,
      filename: file.name,
      original_mime: validated.mime,
      format: validated.format,
      size_bytes: validated.sizeBytes,
      page_count: pages.length,
      created_at: now,
      updated_at: now,
      status: "uploaded",
      pages,
      fields: [],
      tables: [],
      qa_history: [],
      processing_logs: [],
    };

    return NextResponse.json({ document: record });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
