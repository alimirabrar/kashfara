import type { ProviderEligibility } from "@/types/kashfara";

export const FreeTierRegistry = {
  evaluateEligibility(
    entry: Omit<ProviderEligibility, "eligible_for_routing" | "excluded_reason">
  ): ProviderEligibility {
    const reasons: string[] = [];

    if (entry.health_status === "unavailable") {
      reasons.push("Engine status is temporarily unavailable");
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
