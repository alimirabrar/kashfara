import { GroqProvider } from "./groq-provider";
import { OmniRouteProvider, type OmniRouteRawModel } from "./omniroute-provider";
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

function inferOmniRouteFreeTier(raw: OmniRouteRawModel): {
  is_free: boolean;
  free_tier_type: FreeTierType;
  payment_required: boolean;
} {
  if (raw.is_free === true || raw.free === true) {
    return { is_free: true, free_tier_type: "recurring", payment_required: false };
  }
  const idLower = raw.id.toLowerCase();
  const upstreamLower = (raw.upstream_provider || raw.provider || raw.owned_by || "").toLowerCase();

  if (idLower.endsWith(":free") || idLower.includes("/free")) {
    return { is_free: true, free_tier_type: "recurring", payment_required: false };
  }
  if (
    upstreamLower.includes("ollama") ||
    upstreamLower.includes("lmstudio") ||
    upstreamLower.includes("vllm") ||
    upstreamLower.includes("local")
  ) {
    return { is_free: true, free_tier_type: "local", payment_required: false };
  }
  if (raw.pricing) {
    const p = Number(raw.pricing.prompt ?? NaN);
    const c = Number(raw.pricing.completion ?? NaN);
    if (p === 0 && c === 0) {
      return { is_free: true, free_tier_type: "recurring", payment_required: false };
    }
    if ((Number.isFinite(p) && p > 0) || (Number.isFinite(c) && c > 0)) {
      return { is_free: false, free_tier_type: "paid", payment_required: true };
    }
  }
  // If pricing/free status is not explicitly zero-cost, do not assume it's free
  return { is_free: false, free_tier_type: "unknown", payment_required: true };
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
          const candidate = FreeTierRegistry.evaluateEligibility({
            provider: "groq",
            provider_source: "groq_direct",
            upstream_provider: m.owned_by || "groq",
            model: m.id,
            display_name: m.id,
            is_free: true, // Groq developer free tier (subject to rate-limit headers)
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
          });
          discovered.push(candidate);
        }
      } catch (err) {
        errors.push({
          source: "groq_direct",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      errors.push({
        source: "groq_direct",
        message: "GROQ_API_KEY is not configured in environment.",
      });
    }

    // 2. OmniRoute Gateway Discovery
    if (OmniRouteProvider.isConfigured()) {
      try {
        const models = await OmniRouteProvider.listModels();
        const health = ProviderHealthMonitor.getHealth("omniroute");

        for (const m of models) {
          const upstream =
            m.upstream_provider ||
            m.provider ||
            m.owned_by ||
            (m.id.includes("/") ? m.id.split("/")[0] : "omniroute");
          const poolId = `omniroute:${upstream}`;
          const pool = ProviderQuotaManager.getPoolSnapshot(poolId);
          const terms = ProviderTermsRegistry.evaluate("omniroute", upstream);
          const freeInfo = inferOmniRouteFreeTier(m);
          const caps = ModelCapabilityRegistry.inspect(m.id, {
            modalities: m.modalities,
            input_modalities: m.input_modalities,
            capabilities: m.capabilities,
            vision: m.vision,
            supports_vision: m.supports_vision,
          });

          const candidate = FreeTierRegistry.evaluateEligibility({
            provider: `omniroute/${upstream}`,
            provider_source: "omniroute",
            upstream_provider: upstream,
            model: m.id,
            display_name: m.name || m.id,
            is_free: freeInfo.is_free,
            free_tier_type: freeInfo.free_tier_type,
            supports_vision: caps.supports_vision,
            supports_document_images: caps.supports_document_images,
            supports_structured_output: caps.supports_structured_output,
            supports_arabic: caps.supports_arabic,
            context_window: m.context_length ?? m.context_window ?? null,
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
            shared_quota_pool: poolId,
            payment_required: freeInfo.payment_required,
            terms_approved: terms.terms_approved,
            terms_notes: terms.notes,
            health_status: health.status,
            avg_latency_ms: health.avg_latency_ms,
            last_verified_at: now,
          });
          discovered.push(candidate);
        }
      } catch (err) {
        errors.push({
          source: "omniroute",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    } else {
      errors.push({
        source: "omniroute",
        message: "OMNIROUTE_BASE_URL is not configured in environment.",
      });
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
