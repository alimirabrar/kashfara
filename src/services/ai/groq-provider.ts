import { getConfig } from "@/lib/config";
import { ProviderQuotaManager } from "./quota-manager";
import { ProviderHealthMonitor } from "./provider-health";

export interface GroqRawModel {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  active?: boolean;
  context_window?: number;
  max_completion_tokens?: number;
}

export interface ChatContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

export interface InferenceResponse {
  content: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
  raw_finish_reason?: string;
}

export class ProviderRequestError extends Error {
  status: number;
  retryable: boolean;
  isRateLimit: boolean;
  provider: string;

  constructor(
    message: string,
    opts: { status: number; retryable: boolean; isRateLimit: boolean; provider: string }
  ) {
    super(message);
    this.name = "ProviderRequestError";
    this.status = opts.status;
    this.retryable = opts.retryable;
    this.isRateLimit = opts.isRateLimit;
    this.provider = opts.provider;
  }
}

export const GroqProvider = {
  poolId: "groq-direct-account",

  isConfigured(): boolean {
    return Boolean(getConfig().groqApiKey);
  },

  async listModels(): Promise<GroqRawModel[]> {
    const cfg = getConfig();
    if (!cfg.groqApiKey) return [];

    const start = Date.now();
    const res = await fetch(`${cfg.groqBaseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cfg.groqApiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });

    ProviderQuotaManager.recordResponseHeaders(this.poolId, res.headers);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429) {
        ProviderQuotaManager.recordRateLimit(this.poolId, res.headers.get("retry-after"));
        ProviderHealthMonitor.recordRateLimit("groq", errText || "429 Rate Limited");
      } else {
        ProviderHealthMonitor.recordFailure("groq", `HTTP ${res.status}: ${errText}`);
      }
      throw new ProviderRequestError(`Groq /models failed (${res.status}): ${errText}`, {
        status: res.status,
        retryable: res.status === 429 || res.status >= 500,
        isRateLimit: res.status === 429,
        provider: "groq",
      });
    }

    ProviderHealthMonitor.recordSuccess("groq", Date.now() - start);
    const json = (await res.json()) as { data?: GroqRawModel[] };
    return (json.data || []).filter((m) => m.active !== false);
  },

  async chatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  }): Promise<InferenceResponse> {
    const cfg = getConfig();
    if (!cfg.groqApiKey) {
      throw new ProviderRequestError("GROQ_API_KEY is not configured", {
        status: 401,
        retryable: false,
        isRateLimit: false,
        provider: "groq",
      });
    }

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
      res = await fetch(`${cfg.groqBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network timeout";
      ProviderHealthMonitor.recordFailure("groq", msg);
      throw new ProviderRequestError(`Groq network/timeout error: ${msg}`, {
        status: 504,
        retryable: true,
        isRateLimit: false,
        provider: "groq",
      });
    }

    const latencyMs = Date.now() - start;
    ProviderQuotaManager.recordResponseHeaders(this.poolId, res.headers);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const isRateLimit = res.status === 429;
      if (isRateLimit) {
        ProviderQuotaManager.recordRateLimit(this.poolId, res.headers.get("retry-after"));
        ProviderHealthMonitor.recordRateLimit("groq", errText);
      } else {
        ProviderHealthMonitor.recordFailure("groq", `HTTP ${res.status}: ${errText}`);
      }
      throw new ProviderRequestError(`Groq inference failed (${res.status}): ${errText}`, {
        status: res.status,
        retryable:
          isRateLimit ||
          res.status >= 500 ||
          res.status === 400 ||
          res.status === 404 ||
          res.status === 422,
        isRateLimit,
        provider: "groq",
      });
    }

    ProviderHealthMonitor.recordSuccess("groq", latencyMs);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    return {
      content,
      provider: "groq",
      model: data.model || params.model,
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
      latency_ms: latencyMs,
      raw_finish_reason: data.choices?.[0]?.finish_reason,
    };
  },
};
