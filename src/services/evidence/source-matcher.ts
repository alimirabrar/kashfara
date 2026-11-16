import type { DocumentPage } from "@/types/kashfara";

export interface SourceMatchResult {
  matched: boolean;
  ambiguous: boolean;
  matchCount: number;
  matchedStructuralRef?: string;
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "") // Arabic diacritics
    .replace(/\s+/g, " ")
    .trim();
}

export const SourceMatcher = {
  matchOnPage(
    page: DocumentPage | undefined,
    value: string | number | boolean | null,
    sourceText: string | null
  ): SourceMatchResult {
    if (!page) {
      return { matched: false, ambiguous: false, matchCount: 0 };
    }

    const haystack = normalizeForMatch(page.text_content || "");
    if (!haystack) {
      return { matched: false, ambiguous: false, matchCount: 0 };
    }

    const needleSource = sourceText ? normalizeForMatch(sourceText) : "";
    const needleVal = value != null ? normalizeForMatch(String(value)) : "";

    let count = 0;
    if (needleSource && needleSource.length >= 2) {
      let idx = haystack.indexOf(needleSource);
      while (idx !== -1) {
        count++;
        idx = haystack.indexOf(needleSource, idx + needleSource.length);
      }
    }

    if (count === 0 && needleVal && needleVal.length >= 2) {
      let idx = haystack.indexOf(needleVal);
      while (idx !== -1) {
        count++;
        idx = haystack.indexOf(needleVal, idx + needleVal.length);
      }
    }

    let matchedRef: string | undefined;
    if (page.structural_blocks && (needleSource || needleVal)) {
      const target = needleVal || needleSource;
      const found = page.structural_blocks.find((b) =>
        normalizeForMatch(b.text).includes(target)
      );
      matchedRef = found?.ref;
    }

    return {
      matched: count > 0,
      ambiguous: count > 1,
      matchCount: count,
      matchedStructuralRef: matchedRef,
    };
  },
};
