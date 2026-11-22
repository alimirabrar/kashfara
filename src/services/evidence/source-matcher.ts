import type { BoundingBox, DocumentPage } from "@/types/kashfara";

export interface SourceMatchResult {
  matched: boolean;
  ambiguous: boolean;
  matchCount: number;
  matchedStructuralRef?: string;
  matchedOcrBox?: BoundingBox;
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
    const needleSource = sourceText ? normalizeForMatch(sourceText) : "";
    const needleVal = value != null ? normalizeForMatch(String(value)) : "";

    let count = 0;
    if (haystack && needleSource && needleSource.length >= 2) {
      let idx = haystack.indexOf(needleSource);
      while (idx !== -1) {
        count++;
        idx = haystack.indexOf(needleSource, idx + needleSource.length);
      }
    }

    if (haystack && count === 0 && needleVal && needleVal.length >= 2) {
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

    let matchedOcrBox: BoundingBox | undefined;
    if (page.ocr_blocks && page.ocr_blocks.length > 0 && (needleVal || needleSource)) {
      const targetVal = needleVal && needleVal.length >= 2 ? needleVal : "";
      const targetSrc = needleSource && needleSource.length >= 2 ? needleSource : "";
      const blockMatch =
        (targetVal &&
          page.ocr_blocks.find((b) => {
            const bt = normalizeForMatch(b.text);
            return bt.includes(targetVal) || (bt.length >= 3 && targetVal.includes(bt));
          })) ||
        (targetSrc &&
          page.ocr_blocks.find((b) => {
            const bt = normalizeForMatch(b.text);
            return bt.includes(targetSrc) || (bt.length >= 3 && targetSrc.includes(bt));
          }));

      if (blockMatch) {
        matchedOcrBox = blockMatch.bbox;
        if (count === 0) count = 1;
      }
    }

    return {
      matched: count > 0,
      ambiguous: count > 1,
      matchCount: count,
      matchedStructuralRef: matchedRef,
      matchedOcrBox,
    };
  },
};
