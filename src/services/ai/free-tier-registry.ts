import { getConfig } from "@/lib/config";
import type { ProviderEligibility } from "@/types/kashfara";

export const FreeTierRegistry = {
  evaluateEligibility(
    entry: Omit<ProviderEligibility, "eligible_for_routing" | "excluded_reason">
  ): ProviderEligibility {
    const cfg = getConfig();
    const reasons: string[] = [];

    if (cfg.freeOnlyMode) {
      if (!entry.is_free) {
        reasons.push("Excluded by FREE_ONLY_MODE: model is not verified free-tier");
      }
      if (entry.free_tier_type === "paid") {
        reasons.push("Excluded by FREE_ONLY_MODE: paid tier");
      }
      if (entry.payment_required) {
        reasons.push("Excluded by FREE_ONLY_MODE: payment method required");
      }
      if (!entry.terms_approved) {
        reasons.push("Excluded by compliance registry: provider terms not approved");
      }
    }

    if (entry.health_status === "unavailable") {
      reasons.push("Provider health status is unavailable");
    }

    if (
      entry.remaining_daily_requests !== null &&
      entry.remaining_daily_requests <= 0
    ) {
      reasons.push("Daily request quota exhausted");
    }

    return {
      ...entry,
      eligible_for_routing: reasons.length === 0,
      excluded_reason: reasons.length > 0 ? reasons.join("; ") : null,
    };
  },

  isModelEligibleForVision(model: ProviderEligibility): {
    eligible: boolean;
    reason: string | null;
  } {
    const evaluated = this.evaluateEligibility(model);
    if (!evaluated.eligible_for_routing) {
      return { eligible: false, reason: evaluated.excluded_reason };
    }
    if (!evaluated.supports_vision || !evaluated.supports_document_images) {
      return {
        eligible: false,
        reason: "Model does not support multimodal document image inputs",
      };
    }
    return { eligible: true, reason: null };
  },
};
