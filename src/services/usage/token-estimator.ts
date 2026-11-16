export const InferenceCostEstimator = {
  /**
   * Estimates vision input tokens based on image dimensions (tile-based approximation)
   * plus text prompt tokens.
   */
  estimateVisionTokens(params: {
    pages: Array<{ width: number; height: number }>;
    promptChars: number;
    expectedOutputTokens?: number;
  }): { input_tokens: number; output_tokens: number; total_tokens: number } {
    let imageTokens = 0;
    for (const p of params.pages) {
      const w = Math.max(256, p.width || 1024);
      const h = Math.max(256, p.height || 1440);
      // Tile-based vision token estimate: ~85 base + ~170 per 512x512 tile (capped at 16 tiles)
      const tilesX = Math.ceil(Math.min(w, 2048) / 512);
      const tilesY = Math.ceil(Math.min(h, 2048) / 512);
      const tiles = Math.min(16, tilesX * tilesY);
      imageTokens += 85 + tiles * 170;
    }
    const textTokens = Math.ceil(params.promptChars / 4);
    const inputTokens = imageTokens + textTokens;
    const outputTokens = params.expectedOutputTokens ?? 1200;
    return {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    };
  },
};
