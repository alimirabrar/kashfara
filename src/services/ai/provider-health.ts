import type { HealthStatus } from "@/types/kashfara";

interface HealthRecord {
  status: HealthStatus;
  avg_latency_ms: number | null;
  consecutive_failures: number;
  last_rate_limit_at: number | null;
  last_checked_at: string;
  last_error?: string;
}

const healthMap = new Map<string, HealthRecord>();

export const ProviderHealthMonitor = {
  recordSuccess(providerKey: string, latencyMs: number): void {
    const prev = healthMap.get(providerKey);
    const avg =
      prev?.avg_latency_ms != null
        ? Math.round(prev.avg_latency_ms * 0.7 + latencyMs * 0.3)
        : Math.round(latencyMs);

    healthMap.set(providerKey, {
      status: "healthy",
      avg_latency_ms: avg,
      consecutive_failures: 0,
      last_rate_limit_at: prev?.last_rate_limit_at ?? null,
      last_checked_at: new Date().toISOString(),
    });
  },

  recordRateLimit(providerKey: string, errorMsg: string): void {
    const prev = healthMap.get(providerKey);
    healthMap.set(providerKey, {
      status: "rate_limited",
      avg_latency_ms: prev?.avg_latency_ms ?? null,
      consecutive_failures: (prev?.consecutive_failures ?? 0) + 1,
      last_rate_limit_at: Date.now(),
      last_checked_at: new Date().toISOString(),
      last_error: errorMsg,
    });
  },

  recordFailure(providerKey: string, errorMsg: string): void {
    const prev = healthMap.get(providerKey);
    const failures = (prev?.consecutive_failures ?? 0) + 1;
    healthMap.set(providerKey, {
      status: failures >= 3 ? "unavailable" : "degraded",
      avg_latency_ms: prev?.avg_latency_ms ?? null,
      consecutive_failures: failures,
      last_rate_limit_at: prev?.last_rate_limit_at ?? null,
      last_checked_at: new Date().toISOString(),
      last_error: errorMsg,
    });
  },

  getHealth(providerKey: string): HealthRecord {
    const rec = healthMap.get(providerKey);
    if (!rec) {
      return {
        status: "unknown",
        avg_latency_ms: null,
        consecutive_failures: 0,
        last_rate_limit_at: null,
        last_checked_at: new Date().toISOString(),
      };
    }
    // Cool down rate_limited status after 60s so it can be re-evaluated
    if (
      rec.status === "rate_limited" &&
      rec.last_rate_limit_at &&
      Date.now() - rec.last_rate_limit_at > 60_000
    ) {
      return { ...rec, status: "degraded" };
    }
    return rec;
  },
};
