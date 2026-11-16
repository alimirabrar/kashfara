import { GroqProvider } from "./groq-provider";
import { OpenRouterProvider, type OpenRouterRawModel } from "./openrouter-provider";
import { GeminiProvider, GEMINI_FALLBACK_MODELS } from "./gemini-provider";
import { ModelCapabilityRegistry } from "./model-capabilities";
import { ProviderTermsRegistry } from "./provider-terms";
import { ProviderQuotaManager } from "./quota-manager";
import { ProviderHealthMonitor } from "./provider-health";
import { FreeTierRegistry } from "./free-tier-registry";
import { store } from "@/services/storage/store";
import type { FreeTierType, ProviderEligibility } from "@/types/kashfara";

export interface DiscoveryResult {
  providers: ProviderEligibility[];
  errors: Array<{ source: string; message: string }>;
  discovered_at: string;
}

function inferOpenRouterFreeTier(raw: OpenRouterRawModel): {
  is_free: boolean;
  free_tier_type: FreeTierType;
  payment_required: boolean;
} {
  const idLower = raw.id.toLowerCase();
  const p = Number(raw.pricing?.prompt ?? NaN);
  const c = Number(raw.pricing?.completion ?? NaN);
  if (idLower.endsWith(":free") || (p === 0 && c === 0)) {
    return { is_free: true, free_tier_type: "recurring", payment_required: false };
  }
  return { is_free: false, free_tier_type: "paid", payment_required: true };
}

export const ProviderDiscovery = {
  async discoverAll(forceRefresh = false): Promise<DiscoveryResult> {
    if (!forceRefresh) {
      const cached = await store.getProviderCache();
      if (cached) {
        const ageMs = Date.now() - new Date(cached.updated_at).getTime();
        if (ageMs < 60_000 && cached.providers.length > 0) {
          return {
            providers: cached.providers,
            errors: [],
            discovered_at: cached.updated_at,
          };
        }
      }
    }

    const discovered: ProviderEligibility[] = [];
    const errors: Array<{ source: string; message: string }> = [];
    const now = new Date().toISOString();

    // 1. Groq Direct Discovery
    if (GroqProvider.isConfigured()) {
      try {
        const models = await GroqProvider.listModels();
        const pool = ProviderQuotaManager.getPoolSnapshot(GroqProvider.poolId);
        const health = ProviderHealthMonitor.getHealth("groq");
        const terms = ProviderTermsRegistry.evaluate("groq");

        for (const m of models) {
          const caps = ModelCapabilityRegistry.inspect(m.id);
          discovered.push(
            FreeTierRegistry.evaluateEligibility({
              provider: "groq",
              provider_source: "groq_direct",
              upstream_provider: m.owned_by || "groq",
              model: m.id,
              display_name: m.id,
              is_free: true,
              free_tier_type: "recurring",
              supports_vision: caps.supports_vision,
              supports_document_images: caps.supports_document_images,
              supports_structured_output: caps.supports_structured_output,
              supports_arabic: caps.supports_arabic,
              context_window: m.context_window ?? null,
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
              shared_quota_pool: GroqProvider.poolId,
              payment_required: false,
              terms_approved: terms.terms_approved,
              terms_notes: terms.notes,
              health_status: health.status,
              avg_latency_ms: health.avg_latency_ms,
              last_verified_at: now,
            })
          );
        }
      } catch (err) {
        errors.push({
          source: "primary_engine_a",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 2. OpenRouter Discovery
    if (OpenRouterProvider.isConfigured()) {
      try {
        const models = await OpenRouterProvider.listModels();
        const pool = ProviderQuotaManager.getPoolSnapshot(OpenRouterProvider.poolId);
        const health = ProviderHealthMonitor.getHealth("openrouter");
        const terms = ProviderTermsRegistry.evaluate("openrouter");

        for (const m of models) {
          const freeInfo = inferOpenRouterFreeTier(m);
          // Only index free models from OpenRouter so catalog stays lean and zero-cost
          if (!freeInfo.is_free) continue;

          const inputMods = m.architecture?.input_modalities || [];
          const hasImageMod =
            inputMods.includes("image") ||
            Boolean(m.architecture?.modality?.toLowerCase().includes("image"));

          const caps = ModelCapabilityRegistry.inspect(m.id, {
            input_modalities: inputMods,
            supports_vision: hasImageMod,
          });

          discovered.push(
            FreeTierRegistry.evaluateEligibility({
              provider: "openrouter",
              provider_source: "openrouter",
              upstream_provider: m.id.split("/")[0] || "openrouter",
              model: m.id,
              display_name: m.name || m.id,
              is_free: true,
              free_tier_type: "recurring",
              supports_vision: caps.supports_vision,
              supports_document_images: caps.supports_document_images,
              supports_structured_output: caps.supports_structured_output,
              supports_arabic: caps.supports_arabic,
              context_window: m.context_length ?? null,
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
              shared_quota_pool: OpenRouterProvider.poolId,
              payment_required: false,
              terms_approved: terms.terms_approved,
              terms_notes: terms.notes,
              health_status: health.status,
              avg_latency_ms: health.avg_latency_ms,
              last_verified_at: now,
            })
          );
        }
      } catch (err) {
        errors.push({
          source: "primary_engine_b",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 3. Gemini Fallback Discovery
    if (GeminiProvider.isConfigured()) {
      const health = ProviderHealthMonitor.getHealth("gemini");
      const terms = ProviderTermsRegistry.evaluate("gemini");
      const pool = ProviderQuotaManager.getPoolSnapshot(GeminiProvider.poolId);

      for (const gm of GEMINI_FALLBACK_MODELS) {
        const caps = ModelCapabilityRegistry.inspect(gm.id, { supports_vision: true });
        discovered.push(
          FreeTierRegistry.evaluateEligibility({
            provider: "gemini",
            provider_source: "gemini_fallback",
            upstream_provider: "google",
            model: gm.id,
            display_name: gm.id,
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
    }

    if (discovered.length > 0) {
      await store.saveProviderCache(discovered);
    }

    return {
      providers: discovered,
      errors,
      discovered_at: now,
    };
  },
};
