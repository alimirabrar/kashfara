import { getConfig } from "@/lib/config";
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
    const cfg = getConfig();
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

      // Prioritize accuracy & evidence reliability for extraction/verification tasks
      if (
        opts.task === "key_value_extraction" ||
        opts.task === "table_extraction" ||
        opts.task === "stamp_signature_identification"
      ) {
        if (/maverick|gemini-2\.5|qwen2\.5-vl|claude|gpt-4o/i.test(p.model)) {
          score += 12;
        }
      }

      // Fast classification/form detection can favor Scout / Flash
      if (opts.task === "document_classification" || opts.task === "form_detection") {
        if (/scout|flash/i.test(p.model)) {
          score += 6;
        }
      }

      // Multilingual / Arabic boost
      if (opts.requiresArabic || opts.task === "arabic_english_understanding") {
        if (caps.supports_arabic) score += 10;
        else score -= 20;
      }

      // Explicit config preference overrides
      if (
        cfg.groqVisionModelOverride &&
        p.provider_source === "groq_direct" &&
        p.model === cfg.groqVisionModelOverride
      ) {
        score += 25;
      }
      if (
        cfg.omniroutePreferredVisionModel &&
        p.provider_source === "omniroute" &&
        p.model === cfg.omniroutePreferredVisionModel
      ) {
        score += 25;
      }

      if (cfg.primaryProvider !== "auto") {
        if (p.provider.includes(cfg.primaryProvider) || p.provider_source === cfg.primaryProvider) {
          score += 15;
        }
      }

      // Quota availability & health
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
        rationale: `${caps.reason} (score=${score}, health=${p.health_status})`,
      });
    }

    return ranked.sort((a, b) => b.score - a.score);
  },
};
