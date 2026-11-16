import sharp from "sharp";
import { getConfig } from "@/lib/config";
import type { SupportedDocumentFormat } from "@/types/kashfara";

export interface ValidatedFile {
  format: SupportedDocumentFormat;
  mime: string;
  sizeBytes: number;
}

const EXT_TO_FORMAT: Record<string, SupportedDocumentFormat> = {
  pdf: "pdf",
  png: "png",
  jpg: "jpg",
  jpeg: "jpeg",
  webp: "webp",
  tif: "tiff",
  tiff: "tiff",
  docx: "docx",
  pptx: "pptx",
  xlsx: "xlsx",
};

export const DocumentIngestion = {
  validateFile(filename: string, mime: string, buffer: Buffer): ValidatedFile {
    const cfg = getConfig();
    const maxBytes = cfg.maxUploadSizeMb * 1024 * 1024;
    if (buffer.length === 0) {
      throw new Error("Uploaded file is empty.");
    }
    if (buffer.length > maxBytes) {
      throw new Error(
        `File size ${(buffer.length / (1024 * 1024)).toFixed(2)} MB exceeds MAX_UPLOAD_SIZE_MB (${cfg.maxUploadSizeMb} MB).`
      );
    }

    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const format = EXT_TO_FORMAT[ext];
    if (!format) {
      throw new Error(
        `Unsupported file extension ".${ext}". Supported formats: PDF, PNG, JPG, JPEG, WEBP, TIFF, DOCX, PPTX, XLSX.`
      );
    }

    // Magic-byte signature verification
    if (format === "pdf") {
      const header = buffer.subarray(0, 5).toString("ascii");
      if (header !== "%PDF-") {
        throw new Error("File signature mismatch: expected valid PDF header (%PDF-).");
      }
    } else if (format === "png") {
      if (
        buffer.length < 8 ||
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47
      ) {
        throw new Error("File signature mismatch: expected valid PNG signature.");
      }
    } else if (format === "jpg" || format === "jpeg") {
      if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
        throw new Error("File signature mismatch: expected valid JPEG signature.");
      }
    } else if (format === "webp") {
      const riff = buffer.subarray(0, 4).toString("ascii");
      const webp = buffer.subarray(8, 12).toString("ascii");
      if (riff !== "RIFF" || webp !== "WEBP") {
        throw new Error("File signature mismatch: expected valid WEBP signature.");
      }
    } else if (format === "tiff") {
      const le = buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00;
      const be = buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a;
      if (!le && !be) {
        throw new Error("File signature mismatch: expected valid TIFF signature.");
      }
    } else if (format === "docx" || format === "pptx" || format === "xlsx") {
      if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
        throw new Error(`File signature mismatch: expected valid Office Open XML archive for .${format}.`);
      }
    }

    return {
      format,
      mime: mime || `application/${format}`,
      sizeBytes: buffer.length,
    };
  },

  async prepareImageForStorageAndVision(buffer: Buffer): Promise<{
    pngBuffer: Buffer;
    width: number;
    height: number;
  }> {
    // Auto-orient from EXIF, convert to crisp JPEG, and cap dimensions at 1500px so payloads stay fast & within all vision API limits
    const image = sharp(buffer).rotate();
    const meta = await image.metadata();
    const origW = meta.width || 1024;
    const origH = meta.height || 1440;

    const maxDim = 1500;
    const pipeline =
      origW > maxDim || origH > maxDim
        ? image.resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
        : image;

    const { data, info } = await pipeline
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return {
      pngBuffer: data,
      width: info.width,
      height: info.height,
    };
  },

  countPdfPagesRough(buffer: Buffer): number {
    // Quick fallback page count; client pdfjs-dist also supplies exact page count & rendered pages
    const text = buffer.toString("latin1");
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    return matches ? Math.max(1, matches.length) : 1;
  },
};
