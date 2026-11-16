export interface DiscoveredCapabilities {
  supports_vision: boolean;
  supports_document_images: boolean;
  supports_structured_output: boolean;
  supports_arabic: boolean;
  quality_tier: number; // 1-100 heuristic for ranking
  reason: string;
}

const KNOWN_VISION_PATTERNS: Array<{
  pattern: RegExp;
  quality: number;
  arabic: boolean;
  structured: boolean;
  note: string;
}> = [
  {
    pattern: /llama-4-maverick/i,
    quality: 92,
    arabic: true,
    structured: true,
    note: "Llama 4 Maverick early-fusion multimodal MoE (strong DocVQA & ChartQA)",
  },
  {
    pattern: /llama-4-scout/i,
    quality: 86,
    arabic: true,
    structured: true,
    note: "Llama 4 Scout early-fusion multimodal MoE (fast long-context document vision)",
  },
  {
    pattern: /gemini-2\.5-pro|gemini-2\.5-flash|gemini-2\.0-flash|gemini-1\.5-pro|gemini-1\.5-flash/i,
    quality: 94,
    arabic: true,
    structured: true,
    note: "Gemini multimodal vision & document understanding",
  },
  {
    pattern: /pixtral|mistral-small-3|mistral-medium-3|mistral-large-2/i,
    quality: 85,
    arabic: true,
    structured: true,
    note: "Mistral multimodal vision model",
  },
  {
    pattern: /qwen2\.5-vl|qwen-vl|qwen3-vl/i,
    quality: 88,
    arabic: true,
    structured: true,
    note: "Qwen-VL multimodal document & OCR model",
  },
  {
    pattern: /llama-3\.2-.*-vision/i,
    quality: 74,
    arabic: false,
    structured: true,
    note: "Llama 3.2 Vision",
  },
  {
    pattern: /claude-3|claude-4|gpt-4o|gpt-4\.1|gpt-5/i,
    quality: 93,
    arabic: true,
    structured: true,
    note: "Frontier multimodal model",
  },
  {
    pattern: /glm-4v|glm-4\.5v|internvl|molmo|phi-3\.5-vision|phi-4-multimodal|llava/i,
    quality: 78,
    arabic: false,
    structured: true,
    note: "Multimodal vision model",
  },
];

const TEXT_ONLY_EXCLUSIONS =
  /whisper|tts|embedding|rerank|guard|moderation|llama-3\.3-70b|llama-3\.1-8b|llama-3\.1-70b|deepseek-r1|deepseek-v3|qwen-qwq|mixtral-8x7b|gemma2-9b/i;

export const ModelCapabilityRegistry = {
  inspect(
    modelId: string,
    metadata?: {
      modalities?: string[];
      input_modalities?: string[];
      capabilities?: string[];
      vision?: boolean;
      supports_vision?: boolean;
    }
  ): DiscoveredCapabilities {
    // Explicit metadata from provider/OmniRoute takes precedence
    const modList = [
      ...(metadata?.modalities || []),
      ...(metadata?.input_modalities || []),
      ...(metadata?.capabilities || []),
    ].map((s) => s.toLowerCase());

    const explicitVision =
      metadata?.vision === true ||
      metadata?.supports_vision === true ||
      modList.some((m) => m.includes("image") || m.includes("vision") || m.includes("multimodal"));

    const explicitTextOnly =
      metadata?.vision === false ||
      metadata?.supports_vision === false ||
      (modList.length > 0 && !explicitVision && modList.every((m) => m === "text"));

    if (TEXT_ONLY_EXCLUSIONS.test(modelId) && !explicitVision) {
      return {
        supports_vision: false,
        supports_document_images: false,
        supports_structured_output: !/whisper|tts|embedding|rerank/i.test(modelId),
        supports_arabic: true,
        quality_tier: 50,
        reason: "Text/audio/embedding-only model; not eligible for document vision",
      };
    }

    for (const rule of KNOWN_VISION_PATTERNS) {
      if (rule.pattern.test(modelId)) {
        return {
          supports_vision: !explicitTextOnly,
          supports_document_images: !explicitTextOnly,
          supports_structured_output: rule.structured,
          supports_arabic: rule.arabic,
          quality_tier: rule.quality,
          reason: rule.note,
        };
      }
    }

    if (explicitVision) {
      return {
        supports_vision: true,
        supports_document_images: true,
        supports_structured_output: true,
        supports_arabic: true,
        quality_tier: 75,
        reason: "Provider metadata declares image/vision modality",
      };
    }

    // Never count unverified text-only models as vision models
    return {
      supports_vision: false,
      supports_document_images: false,
      supports_structured_output: true,
      supports_arabic: true,
      quality_tier: 60,
      reason: "No verified vision capability in model ID or provider metadata",
    };
  },
};
