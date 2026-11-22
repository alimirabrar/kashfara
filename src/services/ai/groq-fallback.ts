import { getConfig } from "@/lib/config";
import { ProviderRequestError, type ChatMessage, type InferenceResponse } from "./gemini-provider";

export const GROQ_FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "llama-3.1-8b-instant",
];

export function sanitizeGroqLabel(modelId: string): string {
  if (/70b/i.test(modelId)) return "kashfara-4b-turbo";
  if (/120b/i.test(modelId)) return "kashfara-4b-reasoning";
  return "kashfara-4b-instant";
}

export const GroqFallback = {
  isConfigured(): boolean {
    return Boolean(getConfig().groqApiKey);
  },

  async chatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    timeoutMs?: number;
  }): Promise<InferenceResponse> {
    const cfg = getConfig();
    if (!cfg.groqApiKey) {
      throw new ProviderRequestError("Kashfara fallback engine key not configured.", {
        status: 401,
        retryable: false,
        isRateLimit: false,
        provider: "groq",
      });
    }

    const start = Date.now();
    // Convert any multipart messages to plain text since reasoning runs over parsed OCR text
    const textMessages = params.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? m.content
          : m.content
              .filter((p) => p.type === "text" && p.text)
              .map((p) => p.text!)
              .join("\n"),
    }));

    let res: Response;
    try {
      res = await fetch(`${cfg.groqBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: params.model,
          messages: textMessages,
          temperature: params.temperature ?? 0.1,
          max_tokens: Math.min(params.max_tokens ?? 4096, 8000),
        }),
        signal: AbortSignal.timeout(params.timeoutMs ?? 18_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network timeout";
      throw new ProviderRequestError(`[${sanitizeGroqLabel(params.model)}] ${msg}`, {
        status: 504,
        retryable: true,
        isRateLimit: false,
        provider: "groq",
      });
    }

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new ProviderRequestError(
        `[${sanitizeGroqLabel(params.model)}] HTTP ${res.status}: ${errText.slice(0, 200)}`,
        {
          status: res.status,
          retryable: res.status === 429 || res.status >= 500,
          isRateLimit: res.status === 429,
          provider: "groq",
        }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    return {
      content: data.choices?.[0]?.message?.content ?? "",
      provider: "Kashfara Vision",
      model: sanitizeGroqLabel(params.model),
      input_tokens: data.usage?.prompt_tokens ?? 0,
      output_tokens: data.usage?.completion_tokens ?? 0,
      latency_ms: latencyMs,
      raw_finish_reason: data.choices?.[0]?.finish_reason,
    };
  },
};
