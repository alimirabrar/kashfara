import { getConfig } from "@/lib/config";
import { ProviderQuotaManager } from "./quota-manager";
import { ProviderHealthMonitor } from "./provider-health";
import {
  ProviderRequestError,
  type ChatMessage,
  type InferenceResponse,
} from "./groq-provider";

export interface OmniRouteRawModel {
  id: string;
  name?: string;
  provider?: string;
  upstream_provider?: string;
  owned_by?: string;
  is_free?: boolean;
  free?: boolean;
  pricing?: {
    prompt?: number | string;
    completion?: number | string;
  };
  context_length?: number;
  context_window?: number;
  modalities?: string[];
  input_modalities?: string[];
  capabilities?: string[];
  supports_vision?: boolean;
  vision?: boolean;
}

function normalizeOmniRouteBase(rawBase: string): { rootUrl: string; v1Url: string } {
  const clean = rawBase.replace(/\/+$/, "");
  if (clean.endsWith("/v1")) {
    return { rootUrl: clean.slice(0, -3), v1Url: clean };
  }
  return { rootUrl: clean, v1Url: `${clean}/v1` };
}

export const OmniRouteProvider = {
  isConfigured(): boolean {
    return Boolean(getConfig().omnirouteBaseUrl);
  },

  getHeaders(): Record<string, string> {
    const cfg = getConfig();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (cfg.omnirouteApiKey) {
      headers.Authorization = `Bearer ${cfg.omnirouteApiKey}`;
    }
    return headers;
  },

  async listModels(): Promise<OmniRouteRawModel[]> {
    const cfg = getConfig();
    if (!cfg.omnirouteBaseUrl) return [];

    const { rootUrl, v1Url } = normalizeOmniRouteBase(cfg.omnirouteBaseUrl);
    const headers = this.getHeaders();
    const start = Date.now();

    // Try OmniRoute documented management endpoint GET /api/models first, then OpenAI-compatible GET /v1/models
    const candidateUrls = [`${rootUrl}/api/models`, `${v1Url}/models`];
    let lastError = "";

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          method: "GET",
          headers,
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) {
          lastError = `HTTP ${res.status} from ${url}`;
          continue;
        }

        ProviderHealthMonitor.recordSuccess("omniroute", Date.now() - start);
        const json = (await res.json()) as
          | OmniRouteRawModel[]
          | { data?: OmniRouteRawModel[]; models?: OmniRouteRawModel[] };

        if (Array.isArray(json)) return json;
        if (Array.isArray(json.data)) return json.data;
        if (Array.isArray(json.models)) return json.models;
        return [];
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    ProviderHealthMonitor.recordFailure("omniroute", lastError || "Failed to query OmniRoute models");
    throw new ProviderRequestError(`OmniRoute model discovery failed: ${lastError}`, {
      status: 503,
      retryable: true,
      isRateLimit: false,
      provider: "omniroute",
    });
  },

  async chatCompletion(params: {
    model: string;
    upstreamProvider?: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  }): Promise<InferenceResponse> {
    const cfg = getConfig();
    if (!cfg.omnirouteBaseUrl) {
      throw new ProviderRequestError("OMNIROUTE_BASE_URL is not configured", {
        status: 401,
        retryable: false,
        isRateLimit: false,
        provider: "omniroute",
      });
    }

    const { v1Url } = normalizeOmniRouteBase(cfg.omnirouteBaseUrl);
    const poolId = `omniroute:${params.upstreamProvider || "gateway"}`;
    const start = Date.now();

    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.1,
      max_tokens: params.max_tokens ?? 2048,
    };

    if (params.json_mode) {
      body.response_format = { type: "json_object" };
    }

    let res: Response;
    try {
      res = await fetch(`${v1Url}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(50_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network timeout";
      ProviderHealthMonitor.recordFailure("omniroute", msg);
      throw new ProviderRequestError(`OmniRoute network/timeout error: ${msg}`, {
        status: 504,
        retryable: true,
        isRateLimit: false,
        provider: "omniroute",
      });
    }

    const latencyMs = Date.now() - start;
    ProviderQuotaManager.recordResponseHeaders(poolId, res.headers);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const isRateLimit = res.status === 429;
      if (isRateLimit) {
        ProviderQuotaManager.recordRateLimit(poolId, res.headers.get("retry-after"));
        ProviderHealthMonitor.recordRateLimit("omniroute", errText);
      } else {
        ProviderHealthMonitor.recordFailure("omniroute", `HTTP ${res.status}: ${errText}`);
      }
      throw new ProviderRequestError(`OmniRoute inference failed (${res.status}): ${errText}`, {
        status: res.status,
        retryable:
          isRateLimit ||
          res.status >= 500 ||
          res.status === 400 ||
          res.status === 404 ||
          res.status === 422,
        isRateLimit,
        provider: "omniroute",
      });
    }

    ProviderHealthMonitor.recordSuccess("omniroute", latencyMs);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    return {
      content: data.choices?.[0]?.message?.content ?? "",
      provider: params.upstreamProvider ? `omniroute/${params.upstreamProvider}` : "omniroute",
      model: data.model || params.model,
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
      latency_ms: latencyMs,
      raw_finish_reason: data.choices?.[0]?.finish_reason,
    };
  },
};
