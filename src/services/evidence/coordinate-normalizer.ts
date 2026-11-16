import type { BoundingBox } from "@/types/kashfara";

export const CoordinateNormalizer = {
  normalize(
    box: Partial<BoundingBox> | null | undefined,
    pageWidth = 1000,
    pageHeight = 1400
  ): BoundingBox | null {
    if (!box) return null;
    let x = Number(box.x);
    let y = Number(box.y);
    let width = Number(box.width);
    let height = Number(box.height);

    if (![x, y, width, height].every((n) => Number.isFinite(n))) {
      return null;
    }

    // If model returned pixel-like or 0..1000 coordinates instead of 0..1, normalize to [0, 1]
    if (x > 1 || y > 1 || width > 1 || height > 1) {
      if (x <= 1000 && y <= 1000 && width <= 1000 && height <= 1000 && pageWidth > 1000) {
        x = x / 1000;
        y = y / 1000;
        width = width / 1000;
        height = height / 1000;
      } else {
        x = x / Math.max(1, pageWidth);
        y = y / Math.max(1, pageHeight);
        width = width / Math.max(1, pageWidth);
        height = height / Math.max(1, pageHeight);
      }
    }

    x = Math.max(0, Math.min(1, x));
    y = Math.max(0, Math.min(1, y));
    width = Math.max(0.005, Math.min(1 - x, width));
    height = Math.max(0.005, Math.min(1 - y, height));

    if (width <= 0 || height <= 0) return null;

    return {
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
      width: Number(width.toFixed(4)),
      height: Number(height.toFixed(4)),
    };
  },
};
