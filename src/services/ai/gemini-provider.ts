import { getConfig } from "@/lib/config";
import { ProviderHealthMonitor } from "./provider-health";
import {
  ProviderRequestError,
  type ChatMessage,
  type InferenceResponse,
} from "./groq-provider";

export const GEMINI_FALLBACK_MODELS = [
  { id: "gemini-2.5-flash", context_window: 1_000_000 },
  { id: "gemini-2.0-flash", context_window: 1_000_000 },
];

export const GeminiProvider = {
  poolId: "gemini-fallback-account",

  isConfigured(): boolean {
    return Boolean(getConfig().geminiApiKey);
  },

  async chatCompletion(params: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    json_mode?: boolean;
  }): Promise<InferenceResponse> {
    const cfg = getConfig();
    if (!cfg.geminiApiKey) {
      throw new ProviderRequestError("GEMINI_API_KEY is not configured", {
        status: 401,
        retryable: false,
        isRateLimit: false,
        provider: "gemini",
      });
    }

    const start = Date.now();
    const systemMsg = params.messages.find((m) => m.role === "system");
    const userMsgs = params.messages.filter((m) => m.role !== "system");

    const contents = userMsgs.map((m) => {
      const parts: Array<Record<string, unknown>> = [];
      if (typeof m.content === "string") {
        parts.push({ text: m.content });
      } else {
        for (const p of m.content) {
          if (p.type === "text" && p.text) {
            parts.push({ text: p.text });
          } else if (p.type === "image_url" && p.image_url?.url) {
            const match = p.image_url.url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }
        }
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts,
      };
    });

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: params.temperature ?? 0.1,
        maxOutputTokens: params.max_tokens ?? 2500,
        ...(params.json_mode ? { responseMimeType: "application/json" } : {}),
      },
    };

    if (systemMsg && typeof systemMsg.content === "string") {
      body.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    const url = `${cfg.geminiBaseUrl}/models/${encodeURIComponent(
      params.model
    )}:generateContent?key=${encodeURIComponent(cfg.geminiApiKey)}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(50_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network timeout";
      ProviderHealthMonitor.recordFailure("gemini", msg);
      throw new ProviderRequestError(`Gemini network/timeout error: ${msg}`, {
        status: 504,
        retryable: true,
        isRateLimit: false,
        provider: "gemini",
      });
    }

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const isRateLimit = res.status === 429;
      if (isRateLimit) {
        ProviderHealthMonitor.recordRateLimit("gemini", errText);
      } else {
        ProviderHealthMonitor.recordFailure("gemini", `HTTP ${res.status}: ${errText}`);
      }
      throw new ProviderRequestError(`Gemini inference failed (${res.status}): ${errText}`, {
        status: res.status,
        retryable: isRateLimit || res.status >= 500 || res.status === 404,
        isRateLimit,
        provider: "gemini",
      });
    }

    ProviderHealthMonitor.recordSuccess("gemini", latencyMs);
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text || "")
        .join("") ?? "";

    return {
      content: text,
      provider: "gemini",
      model: params.model,
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      latency_ms: latencyMs,
      raw_finish_reason: data.candidates?.[0]?.finishReason,
    };
  },
};
