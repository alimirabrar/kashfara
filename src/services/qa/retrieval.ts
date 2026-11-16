import type { DocumentRecord, ExtractedField, ExtractedTable } from "@/types/kashfara";

export interface RetrievedDocumentContext {
  relevantPages: number[];
  matchedFields: ExtractedField[];
  matchedTables: ExtractedTable[];
  contextText: string;
}

export const QARetrieval = {
  retrieve(doc: DocumentRecord, question: string): RetrievedDocumentContext {
    const terms = question
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scoredPages = new Map<number, number>();
    for (const p of doc.pages) {
      let score = 0;
      const text = (p.text_content || "").toLowerCase();
      for (const term of terms) {
        if (text.includes(term)) score += 2;
      }
      scoredPages.set(p.page_number, score);
    }

    const matchedFields = doc.fields.filter((f) => {
      const hay = `${f.label} ${f.value ?? ""} ${f.source_text ?? ""}`.toLowerCase();
      return terms.some((t) => hay.includes(t));
    });

    for (const f of matchedFields) {
      scoredPages.set(f.page_number, (scoredPages.get(f.page_number) || 0) + 3);
    }

    const matchedTables = doc.tables.filter((t) => {
      const hay = `${t.title ?? ""} ${t.headers.join(" ")} ${t.rows.flat().join(" ")}`.toLowerCase();
      return terms.some((term) => hay.includes(term));
    });

    for (const t of matchedTables) {
      scoredPages.set(t.page_number, (scoredPages.get(t.page_number) || 0) + 3);
    }

    const sortedPages = Array.from(scoredPages.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([pageNum]) => pageNum);

    // Always include at least top 3 pages (or all if <= 3) so vision Q&A has direct visual grounding
    const relevantPages =
      sortedPages.length > 0
        ? sortedPages.slice(0, 3)
        : doc.pages.slice(0, 3).map((p) => p.page_number);

    const fieldsToShow = matchedFields.length > 0 ? matchedFields : doc.fields.slice(0, 40);
    const tablesToShow = matchedTables.length > 0 ? matchedTables : doc.tables.slice(0, 5);

    const parts: string[] = [];
    parts.push(`Document: ${doc.filename} (${doc.classification?.document_type || doc.format}, ${doc.page_count} pages)`);
    if (fieldsToShow.length > 0) {
      parts.push(
        "Extracted Fields:\n" +
          fieldsToShow
            .map(
              (f) =>
                `- [${f.field_id}] (Page ${f.page_number}, ${f.verification_status}) ${f.label}: ${
                  f.value ?? "<EMPTY>"
                } | Source: "${f.source_text || ""}"`
            )
            .join("\n")
      );
    }
    if (tablesToShow.length > 0) {
      parts.push(
        "Extracted Tables:\n" +
          tablesToShow
            .map(
              (t) =>
                `- [${t.table_id}] (Page ${t.page_number}) ${t.title || "Table"}: Headers=${JSON.stringify(
                  t.headers
                )}, Rows=${JSON.stringify(t.rows.slice(0, 15))}`
            )
            .join("\n")
      );
    }
    for (const pNum of relevantPages) {
      const page = doc.pages.find((p) => p.page_number === pNum);
      if (page?.text_content) {
        parts.push(`Page ${pNum} Text:\n${page.text_content.slice(0, 2500)}`);
      }
    }

    return {
      relevantPages,
      matchedFields: fieldsToShow,
      matchedTables: tablesToShow,
      contextText: parts.join("\n\n"),
    };
  },
};
