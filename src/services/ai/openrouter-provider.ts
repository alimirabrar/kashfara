import { getConfig } from "@/lib/config";
import { ProviderQuotaManager } from "./quota-manager";
import { ProviderHealthMonitor } from "./provider-health";
import {
  ProviderRequestError,
  type ChatMessage,
  type InferenceResponse,
} from "./groq-provider";

export interface OpenRouterRawModel {
  id: string;
  name?: string;
  context_length?: number;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
  architecture?: {
    modality?: string;
    input_modalities?: string[];
  };
}

export const OpenRouterProvider = {
  poolId: "openrouter-account",

  isConfigured(): boolean {
    return Boolean(getConfig().openrouterApiKey);
  },

  async listModels(): Promise<OpenRouterRawModel[]> {
    const cfg = getConfig();
    if (!cfg.openrouterApiKey) return [];

    const start = Date.now();
    const res = await fetch(`${cfg.openrouterBaseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cfg.openrouterApiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      ProviderHealthMonitor.recordFailure("openrouter", `HTTP ${res.status}: ${errText}`);
      throw new ProviderRequestError(`OpenRouter /models failed (${res.status}): ${errText}`, {
        status: res.status,
        retryable: res.status === 429 || res.status >= 500,
        isRateLimit: res.status === 429,
        provider: "openrouter",
      });
    }

    ProviderHealthMonitor.recordSuccess("openrouter", Date.now() - start);
    const json = (await res.json()) as { data?: OpenRouterRawModel[] };
    return json.data || [];
  },

  async chatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  }): Promise<InferenceResponse> {
    const cfg = getConfig();
    if (!cfg.openrouterApiKey) {
      throw new ProviderRequestError("OPENROUTER_API_KEY is not configured", {
        status: 401,
        retryable: false,
        isRateLimit: false,
        provider: "openrouter",
      });
    }

    const start = Date.now();
    const body: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.1,
      max_tokens: params.max_tokens ?? 2500,
    };

    if (params.json_mode) {
      body.response_format = { type: "json_object" };
    }

    let res: Response;
    try {
      res = await fetch(`${cfg.openrouterBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.openrouterApiKey}`,
          "Content-Type": "application/json",
          "X-Title": "KASHFARA VISION",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(50_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network timeout";
      ProviderHealthMonitor.recordFailure("openrouter", msg);
      throw new ProviderRequestError(`OpenRouter network/timeout error: ${msg}`, {
        status: 504,
        retryable: true,
        isRateLimit: false,
        provider: "openrouter",
      });
    }

    const latencyMs = Date.now() - start;
    ProviderQuotaManager.recordResponseHeaders(this.poolId, res.headers);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const isRateLimit = res.status === 429;
      if (isRateLimit) {
        ProviderQuotaManager.recordRateLimit(this.poolId, res.headers.get("retry-after"));
        ProviderHealthMonitor.recordRateLimit("openrouter", errText);
      } else {
        ProviderHealthMonitor.recordFailure("openrouter", `HTTP ${res.status}: ${errText}`);
      }
      throw new ProviderRequestError(`OpenRouter inference failed (${res.status}): ${errText}`, {
        status: res.status,
        retryable:
          isRateLimit ||
          res.status >= 500 ||
          res.status === 400 ||
          res.status === 404 ||
          res.status === 422,
        isRateLimit,
        provider: "openrouter",
      });
    }

    ProviderHealthMonitor.recordSuccess("openrouter", latencyMs);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    return {
      content: data.choices?.[0]?.message?.content ?? "",
      provider: "openrouter",
      model: data.model || params.model,
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
      latency_ms: latencyMs,
      raw_finish_reason: data.choices?.[0]?.finish_reason,
    };
  },
};
