import { GeminiProvider, GEMINI_MODELS } from "./gemini-provider";
import { ModelCapabilityRegistry } from "./model-capabilities";
import { ProviderTermsRegistry } from "./provider-terms";
import { ProviderQuotaManager } from "./quota-manager";
import { ProviderHealthMonitor } from "./provider-health";
import { FreeTierRegistry } from "./free-tier-registry";
import type { ProviderEligibility } from "@/types/kashfara";

export interface DiscoveryResult {
  providers: ProviderEligibility[];
  errors: Array<{ source: string; message: string }>;
  discovered_at: string;
}

export const ProviderDiscovery = {
  async discoverAll(_forceRefresh = false): Promise<DiscoveryResult> {
    const discovered: ProviderEligibility[] = [];
    const errors: Array<{ source: string; message: string }> = [];
    const now = new Date().toISOString();

    if (!GeminiProvider.isConfigured()) {
      errors.push({
        source: "kashfara_engine",
        message: "GEMINI_API_KEY is not configured.",
      });
      return { providers: [], errors, discovered_at: now };
    }

    const health = ProviderHealthMonitor.getHealth("gemini");
    const terms = ProviderTermsRegistry.evaluate("gemini");
    const pool = ProviderQuotaManager.getPoolSnapshot(GeminiProvider.poolId);

    for (const gm of GEMINI_MODELS) {
      const caps = ModelCapabilityRegistry.inspect(gm.id, { supports_vision: true });
      discovered.push(
        FreeTierRegistry.evaluateEligibility({
          provider: "kashfara",
          provider_source: "gemini_fallback",
          upstream_provider: "kashfara",
          model: gm.id,
          display_name: "Kashfara Vision Core",
          is_free: true,
          free_tier_type: "recurring",
          supports_vision: caps.supports_vision,
          supports_document_images: caps.supports_document_images,
          supports_structured_output: caps.supports_structured_output,
          supports_arabic: caps.supports_arabic,
          context_window: gm.context_window,
          requests_per_minute: pool?.requests_per_minute ?? null,
          requests_per_day: pool?.requests_per_day ?? null,
          tokens_per_minute: pool?.tokens_per_minute ?? null,
          tokens_per_day: pool?.tokens_per_day ?? null,
          remaining_daily_requests: pool?.remaining_daily_requests ?? null,
          remaining_daily_quota: pool?.remaining_daily_tokens ?? null,
          remaining_minute_requests: pool?.remaining_minute_requests ?? null,
          remaining_minute_tokens: pool?.remaining_minute_tokens ?? null,
          quota_reset_at: pool?.quota_reset_at ?? null,
          quota_source: pool?.quota_source ?? "unknown",
          shared_quota_pool: GeminiProvider.poolId,
          payment_required: false,
          terms_approved: terms.terms_approved,
          terms_notes: terms.notes,
          health_status: health.status,
          avg_latency_ms: health.avg_latency_ms,
          last_verified_at: now,
        })
      );
    }

    return {
      providers: discovered,
      errors,
      discovered_at: now,
    };
  },
};
