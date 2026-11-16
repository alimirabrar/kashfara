import { FreeTierRegistry } from "./free-tier-registry";
import { ModelCapabilityRegistry } from "./model-capabilities";
import type { ProviderEligibility, TaskCategory } from "@/types/kashfara";

export interface RoutingCandidate {
  entry: ProviderEligibility;
  score: number;
  rationale: string;
}

const VISION_REQUIRED_TASKS = new Set<TaskCategory>([
  "document_classification",
  "ocr_text_recognition",
  "visual_layout_understanding",
  "key_value_extraction",
  "table_extraction",
  "handwriting_recognition",
  "stamp_signature_identification",
  "arabic_english_understanding",
  "form_detection",
]);

export const QuotaAwareRouter = {
  requiresVision(task: TaskCategory, hasImages: boolean): boolean {
    if (VISION_REQUIRED_TASKS.has(task)) return hasImages;
    if (task === "document_qa") return hasImages;
    return false;
  },

  rankCandidates(
    providers: ProviderEligibility[],
    opts: {
      task: TaskCategory;
      requiresVision: boolean;
      requiresArabic?: boolean;
      excludeModels?: Set<string>;
    }
  ): RoutingCandidate[] {
    const ranked: RoutingCandidate[] = [];

    for (const p of providers) {
      const key = `${p.provider}:${p.model}`;
      if (opts.excludeModels?.has(key)) continue;

      const evalResult = FreeTierRegistry.evaluateEligibility(p);
      if (!evalResult.eligible_for_routing) continue;

      if (opts.requiresVision && (!p.supports_vision || !p.supports_document_images)) {
        continue;
      }

      if (p.health_status === "rate_limited") continue;

      const caps = ModelCapabilityRegistry.inspect(p.model, {
        supports_vision: p.supports_vision,
      });

      let score = caps.quality_tier;

      // Primary preference: Groq Direct & OpenRouter; Gemini acts as reliable fallback
      if (p.provider_source === "groq_direct" || p.provider_source === "openrouter") {
        score += 10;
      } else if (p.provider_source === "gemini_fallback") {
        score += 4;
      }

      // Strongest models for Arabic, unstructured documents, and dense extraction
      if (/gemini-2\.5-flash|gemini-2\.0-flash|qwen2\.5-vl|qwen3-vl|llama-4-maverick/i.test(p.model)) {
        score += 14;
      }

      if (opts.requiresArabic || opts.task === "arabic_english_understanding") {
        if (caps.supports_arabic) score += 12;
        else score -= 25;
        // Gemini & Qwen-VL excel at Arabic RTL OCR & mixed Arabic-English layouts
        if (/gemini|qwen/i.test(p.model)) score += 10;
      }

      if (p.health_status === "healthy") score += 5;
      if (p.health_status === "degraded") score -= 12;
      if (p.remaining_daily_requests !== null && p.remaining_daily_requests < 5) {
        score -= 10;
      }
      if (p.avg_latency_ms !== null && p.avg_latency_ms < 2500) {
        score += 4;
      }

      ranked.push({
        entry: evalResult,
        score,
        rationale: `Kashfara Neural Router (score=${score}, health=${p.health_status})`,
      });
    }

    return ranked.sort((a, b) => b.score - a.score);
  },
};
