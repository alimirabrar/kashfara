import type { QuotaSource } from "@/types/kashfara";

export interface PoolQuotaSnapshot {
  shared_quota_pool: string;
  requests_per_minute: number | null;
  requests_per_day: number | null;
  tokens_per_minute: number | null;
  tokens_per_day: number | null;
  remaining_daily_requests: number | null;
  remaining_daily_tokens: number | null;
  remaining_minute_requests: number | null;
  remaining_minute_tokens: number | null;
  quota_reset_at: string | null;
  quota_source: QuotaSource;
  last_observed_at: string;
}

const poolSnapshots = new Map<string, PoolQuotaSnapshot>();

function parseHeaderInt(headers: Headers, ...names: string[]): number | null {
  for (const name of names) {
    const val = headers.get(name);
    if (val !== null && val !== "") {
      const n = Number(val);
      if (Number.isFinite(n) && n >= 0) return Math.floor(n);
    }
  }
  return null;
}

function parseResetTimestamp(resetHeader: string | null): string | null {
  if (!resetHeader) return null;
  // Groq uses durations like "2m30s", "1s", or "12h5m"
  const match = resetHeader.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?/);
  if (match && (match[1] || match[2] || match[3])) {
    const hours = Number(match[1] || 0);
    const mins = Number(match[2] || 0);
    const secs = Number(match[3] || 0);
    const ms = ((hours * 3600) + (mins * 60) + secs) * 1000;
    if (ms > 0) {
      return new Date(Date.now() + ms).toISOString();
    }
  }
  const asEpoch = Number(resetHeader);
  if (Number.isFinite(asEpoch) && asEpoch > 1_000_000_000) {
    return new Date(asEpoch * 1000).toISOString();
  }
  return null;
}

export const ProviderQuotaManager = {
  recordResponseHeaders(poolId: string, headers: Headers): PoolQuotaSnapshot {
    const existing = poolSnapshots.get(poolId);
    const limitReq = parseHeaderInt(headers, "x-ratelimit-limit-requests");
    const limitTok = parseHeaderInt(headers, "x-ratelimit-limit-tokens");
    const remReq = parseHeaderInt(headers, "x-ratelimit-remaining-requests");
    const remTok = parseHeaderInt(headers, "x-ratelimit-remaining-tokens");
    const resetReq = headers.get("x-ratelimit-reset-requests");
    const resetTok = headers.get("x-ratelimit-reset-tokens");

    const hasVerifiedHeader =
      limitReq !== null || limitTok !== null || remReq !== null || remTok !== null;

    // Groq's x-ratelimit-limit-requests is typically RPD (requests per day) on free tier,
    // while x-ratelimit-limit-tokens is TPM (tokens per minute).
    // We only record what is actually observed in headers; unknown fields stay null.
    const snapshot: PoolQuotaSnapshot = {
      shared_quota_pool: poolId,
      requests_per_minute: existing?.requests_per_minute ?? null,
      requests_per_day: limitReq ?? existing?.requests_per_day ?? null,
      tokens_per_minute: limitTok ?? existing?.tokens_per_minute ?? null,
      tokens_per_day: existing?.tokens_per_day ?? null,
      remaining_daily_requests: remReq ?? existing?.remaining_daily_requests ?? null,
      remaining_daily_tokens: existing?.remaining_daily_tokens ?? null,
      remaining_minute_requests: existing?.remaining_minute_requests ?? null,
      remaining_minute_tokens: remTok ?? existing?.remaining_minute_tokens ?? null,
      quota_reset_at:
        parseResetTimestamp(resetReq) ??
        parseResetTimestamp(resetTok) ??
        existing?.quota_reset_at ??
        null,
      quota_source: hasVerifiedHeader ? "verified" : existing?.quota_source ?? "unknown",
      last_observed_at: new Date().toISOString(),
    };

    poolSnapshots.set(poolId, snapshot);
    return snapshot;
  },

  recordRateLimit(poolId: string, retryAfterHeader: string | null): void {
    const existing = poolSnapshots.get(poolId);
    const retrySecs = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const resetAt = Number.isFinite(retrySecs)
      ? new Date(Date.now() + retrySecs * 1000).toISOString()
      : existing?.quota_reset_at ?? null;

    poolSnapshots.set(poolId, {
      shared_quota_pool: poolId,
      requests_per_minute: existing?.requests_per_minute ?? null,
      requests_per_day: existing?.requests_per_day ?? null,
      tokens_per_minute: existing?.tokens_per_minute ?? null,
      tokens_per_day: existing?.tokens_per_day ?? null,
      remaining_daily_requests: existing?.remaining_daily_requests ?? null,
      remaining_daily_tokens: existing?.remaining_daily_tokens ?? null,
      remaining_minute_requests: 0,
      remaining_minute_tokens: 0,
      quota_reset_at: resetAt,
      quota_source: existing?.quota_source ?? "verified",
      last_observed_at: new Date().toISOString(),
    });
  },

  getPoolSnapshot(poolId: string): PoolQuotaSnapshot | null {
    return poolSnapshots.get(poolId) ?? null;
  },

  listAllPools(): PoolQuotaSnapshot[] {
    return Array.from(poolSnapshots.values());
  },
};
