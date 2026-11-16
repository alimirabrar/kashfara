import mammoth from "mammoth";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import type { DocumentPage } from "@/types/kashfara";

export const OfficeParser = {
  async parseDocx(buffer: Buffer): Promise<DocumentPage[]> {
    const result = await mammoth.extractRawText({ buffer });
    const lines = result.value
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const blocks = lines.map((text, idx) => ({
      ref: `docx:paragraph:${idx + 1}`,
      type: "paragraph" as const,
      text,
    }));

    return [
      {
        page_number: 1,
        width: 1000,
        height: 1400,
        text_content: lines.join("\n"),
        structural_blocks: blocks,
      },
    ];
  },

  async parsePptx(buffer: Buffer): Promise<DocumentPage[]> {
    const zip = await JSZip.loadAsync(buffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const na = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
        const nb = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);
        return na - nb;
      });

    const pages: DocumentPage[] = [];
    for (let i = 0; i < slideFiles.length; i++) {
      const xml = await zip.files[slideFiles[i]].async("text");
      const textMatches = Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) =>
        m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
      );
      const cleanLines = textMatches.filter(Boolean);
      pages.push({
        page_number: i + 1,
        width: 1280,
        height: 720,
        text_content: cleanLines.join("\n"),
        structural_blocks: cleanLines.map((text, idx) => ({
          ref: `pptx:slide:${i + 1}:element:${idx + 1}`,
          type: "slide" as const,
          text,
        })),
      });
    }

    return pages.length > 0
      ? pages
      : [{ page_number: 1, width: 1280, height: 720, text_content: "", structural_blocks: [] }];
  },

  async parseXlsx(buffer: Buffer): Promise<DocumentPage[]> {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const pages: DocumentPage[] = [];

    workbook.SheetNames.forEach((sheetName, idx) => {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
      const blocks: DocumentPage["structural_blocks"] = [];
      const lines: string[] = [`[Sheet: ${sheetName}]`];

      rows.forEach((row, rIdx) => {
        const nonEmpty = row.map((c) => (c == null ? "" : String(c).trim()));
        if (nonEmpty.some(Boolean)) {
          const line = nonEmpty.join(" | ");
          lines.push(line);
          blocks.push({
            ref: `xlsx:sheet:${sheetName}:row:${rIdx + 1}`,
            type: "cell",
            text: line,
          });
        }
      });

      pages.push({
        page_number: idx + 1,
        width: 1200,
        height: 900,
        text_content: lines.join("\n"),
        structural_blocks: blocks,
      });
    });

    return pages;
  },
};
