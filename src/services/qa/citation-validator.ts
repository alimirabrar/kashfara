import type { DocumentRecord, QACitation } from "@/types/kashfara";

export const CitationValidator = {
  validate(citations: QACitation[], doc: DocumentRecord): QACitation[] {
    const validPageNums = new Set(doc.pages.map((p) => p.page_number));
    const fieldMap = new Map(doc.fields.map((f) => [f.field_id, f]));

    return citations
      .filter((c) => validPageNums.has(c.page_number))
      .map((c) => {
        const linkedField = c.field_id ? fieldMap.get(c.field_id) : undefined;
        return {
          page_number: c.page_number,
          supporting_passage: c.supporting_passage || linkedField?.source_text || "",
          field_id: linkedField?.field_id,
          table_id: c.table_id,
          bounding_box: c.bounding_box ?? linkedField?.bounding_box ?? null,
        };
      });
  },
};
