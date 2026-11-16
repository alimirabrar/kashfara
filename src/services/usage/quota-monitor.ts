import { getConfig } from "@/lib/config";
import type { CapacityEstimate, ProviderEligibility } from "@/types/kashfara";

export const QuotaMonitor = {
  estimateDailyCapacity(providers: ProviderEligibility[]): CapacityEstimate {
    const cfg = getConfig();
    const eligibleVision = providers.filter(
      (p) => p.eligible_for_routing && p.supports_vision && p.supports_document_images
    );

    const defaultPages = cfg.defaultWorkloadPages;
    // Typical pipeline: 1 classification call + 1-2 extraction calls (batched pages) = ~2-3 calls per 5-page doc
    const estimatedCallsPerDoc = Math.max(2, Math.ceil(defaultPages / 3) + 1);
    const estimatedTokensPerPage = 1800; // ~1200 image/text input + ~600 structured output

    if (eligibleVision.length === 0) {
      return {
        daily_document_target: cfg.dailyDocumentTarget,
        default_workload_pages: defaultPages,
        max_document_pages: cfg.maxDocumentPages,
        estimated_tokens_per_page: estimatedTokensPerPage,
        estimated_calls_per_document: estimatedCallsPerDoc,
        verified_remaining_documents: 0,
        estimated_remaining_documents: 0,
        shortfall_documents: cfg.dailyDocumentTarget,
        capacity_status: "insufficient",
        notes: [
          "No eligible free-tier vision models are currently connected or available.",
          "Configure GROQ_API_KEY or OMNIROUTE_BASE_URL to enable multimodal document processing.",
        ],
      };
    }

    // Deduplicate shared quota pools so we never double-count multiple models sharing one account
    const uniquePools = new Map<string, ProviderEligibility>();
    for (const m of eligibleVision) {
      if (!uniquePools.has(m.shared_quota_pool)) {
        uniquePools.set(m.shared_quota_pool, m);
      }
    }

    let verifiedDocsSum = 0;
    let hasAnyVerifiedPool = false;
    let hasUnknownPools = false;
    const notes: string[] = [];

    for (const [poolId, rep] of uniquePools.entries()) {
      if (rep.quota_source === "verified" && rep.remaining_daily_requests !== null) {
        hasAnyVerifiedPool = true;
        const docsFromPool = Math.floor(rep.remaining_daily_requests / estimatedCallsPerDoc);
        verifiedDocsSum += docsFromPool;
        notes.push(
          `Pool ${poolId}: ${rep.remaining_daily_requests} verified remaining requests (~${docsFromPool} docs at ${defaultPages} pages/doc).`
        );
      } else {
        hasUnknownPools = true;
        notes.push(
          `Pool ${poolId}: daily request quota is unknown (not yet observed in provider headers).`
        );
      }
    }

    const verifiedRemaining = hasAnyVerifiedPool ? verifiedDocsSum : null;
    const estimatedRemaining = hasAnyVerifiedPool ? verifiedDocsSum : null;

    let shortfall: number | null = null;
    let status: CapacityEstimate["capacity_status"] = "unknown";

    if (verifiedRemaining !== null && !hasUnknownPools) {
      shortfall = Math.max(0, cfg.dailyDocumentTarget - verifiedRemaining);
      if (verifiedRemaining >= cfg.dailyDocumentTarget) status = "sufficient";
      else if (verifiedRemaining >= Math.ceil(cfg.dailyDocumentTarget * 0.5)) status = "tight";
      else status = "insufficient";
    } else if (verifiedRemaining !== null && hasUnknownPools) {
      shortfall = Math.max(0, cfg.dailyDocumentTarget - verifiedRemaining);
      status = verifiedRemaining >= cfg.dailyDocumentTarget ? "sufficient" : "unknown";
    }

    return {
      daily_document_target: cfg.dailyDocumentTarget,
      default_workload_pages: defaultPages,
      max_document_pages: cfg.maxDocumentPages,
      estimated_tokens_per_page: estimatedTokensPerPage,
      estimated_calls_per_document: estimatedCallsPerDoc,
      verified_remaining_documents: verifiedRemaining,
      estimated_remaining_documents: estimatedRemaining,
      shortfall_documents: shortfall,
      capacity_status: status,
      notes,
    };
  },
};
