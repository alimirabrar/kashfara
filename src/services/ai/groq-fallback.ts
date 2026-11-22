import { getConfig } from "@/lib/config";
import { ProviderRequestError, type ChatMessage, type InferenceResponse } from "./gemini-provider";

export const GROQ_FALLBACK_MODELS = [
  "llama-3.3-70b-versatile",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

let cachedGroqModels: { ids: string[]; at: number } | null = null;

function rankGroqModel(id: string): number {
  if (/llama-3\.3-70b-versatile/i.test(id)) return 500;
  if (/llama-4-maverick/i.test(id)) return 450;
  if (/llama-4-scout/i.test(id)) return 420;
  if (/qwen/i.test(id)) return 380;
  if (/70b/i.test(id)) return 350;
  if (/8b|instant/i.test(id)) return 250;
  return 150;
}

export function sanitizeGroqLabel(modelId: string): string {
  if (/70b/i.test(modelId)) return "kashfara-4b-turbo";
  if (/llama-4/i.test(modelId)) return "kashfara-4b-multimodal";
  return "kashfara-4b-fast";
}

function sanitizeGroqError(text: string): string {
  return text
    .replace(/`?[a-z0-9_./-]*llama[a-z0-9_./-]*`?/gi, "kashfara-4b-turbo")
    .replace(/groq/gi, "Kashfara");
}

export const GroqFallback = {
  isConfigured(): boolean {
    return Boolean(getConfig().groqApiKey);
  },

  async getAvailableModels(): Promise<string[]> {
    if (cachedGroqModels && Date.now() - cachedGroqModels.at < 15 * 60_000) {
      return cachedGroqModels.ids;
    }
    const cfg = getConfig();
    if (!cfg.groqApiKey) return [];

    try {
      const res = await fetch(`${cfg.groqBaseUrl}/models`, {
        headers: { Authorization: `Bearer ${cfg.groqApiKey}` },
        signal: AbortSignal.timeout(6_000),
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: Array<{ id: string; active?: boolean }> };
        const ids = (json.data || [])
          .filter((m) => m.active !== false)
          .map((m) => m.id)
          .filter(
            (id) =>
              !/(whisper|tts|guard|safeguard|orpheus|embedding|compound)/i.test(id)
          )
          .sort((a, b) => rankGroqModel(b) - rankGroqModel(a))
          .slice(0, 3);

        if (ids.length > 0) {
          cachedGroqModels = { ids, at: Date.now() };
          return ids;
        }
      }
    } catch {
      // fall back to static list
    }
    return GROQ_FALLBACK_MODELS;
  },

  async chatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
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
          max_tokens: Math.min(params.max_tokens ?? 3500, 6000),
          ...(params.json_mode ? { response_format: { type: "json_object" } } : {}),
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
        `[${sanitizeGroqLabel(params.model)}] HTTP ${res.status}: ${sanitizeGroqError(errText.slice(0, 200))}`,
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
