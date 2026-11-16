import { getConfig } from "@/lib/config";
import { ProviderHealthMonitor } from "./provider-health";

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
  fatal: boolean;
  provider: string;

  constructor(
    message: string,
    opts: {
      status: number;
      retryable: boolean;
      isRateLimit: boolean;
      provider: string;
      fatal?: boolean;
    }
  ) {
    super(message);
    this.name = "ProviderRequestError";
    this.status = opts.status;
    this.retryable = opts.retryable;
    this.isRateLimit = opts.isRateLimit;
    this.fatal = Boolean(opts.fatal);
    this.provider = opts.provider;
  }
}

/** Static fallback list, used only if live model listing fails. */
export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", context_window: 1_000_000 },
  { id: "gemini-2.5-flash-lite", context_window: 1_000_000 },
  { id: "gemini-2.0-flash", context_window: 1_000_000 },
];

let cachedModels: { ids: string[]; at: number } | null = null;

function rankModel(id: string): number {
  // Higher = better. Prefer newest Flash (fast + strong multimodal), then Pro, then Lite.
  const ver = Number(id.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  let score = ver * 100;
  if (/flash/.test(id) && !/lite/.test(id)) score += 50;
  else if (/pro/.test(id)) score += 30;
  else if (/lite/.test(id)) score += 20;
  if (/preview|exp/.test(id)) score -= 15;
  return score;
}

function extractGeminiError(raw: string): string {
  try {
    const j = JSON.parse(raw) as { error?: { message?: string; status?: string } };
    if (j.error?.message) return `${j.error.status ?? ""} ${j.error.message}`.trim();
  } catch {
    // not json
  }
  return raw.slice(0, 300);
}

export const GeminiProvider = {
  poolId: "kashfara-gemini-core",

  isConfigured(): boolean {
    return Boolean(getConfig().geminiApiKey);
  },

  /** Discover models actually available to this API key (cached 15 min). */
  async getAvailableModels(): Promise<string[]> {
    if (cachedModels && Date.now() - cachedModels.at < 15 * 60_000) {
      return cachedModels.ids;
    }
    const cfg = getConfig();
    try {
      const res = await fetch(`${cfg.geminiBaseUrl}/models?pageSize=1000`, {
        headers: { "x-goog-api-key": cfg.geminiApiKey },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        if (res.status === 400 || res.status === 401 || res.status === 403) {
          throw new ProviderRequestError(
            `Kashfara engine credential rejected: ${extractGeminiError(t)}`,
            { status: res.status, retryable: false, isRateLimit: false, fatal: true, provider: "gemini" }
          );
        }
        throw new Error(`list models HTTP ${res.status}`);
      }
      const json = (await res.json()) as {
        models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
      };
      const ids = (json.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
        .filter(
          (id) =>
            /^gemini-/.test(id) &&
            /(flash|pro)/.test(id) &&
            !/(image|tts|audio|live|embedding|vision-|thinking-exp|learnlm|robotics|computer-use|native)/.test(id)
        )
        .sort((a, b) => rankModel(b) - rankModel(a))
        .slice(0, 4);

      if (ids.length > 0) {
        cachedModels = { ids, at: Date.now() };
        return ids;
      }
    } catch (err) {
      if (err instanceof ProviderRequestError && err.fatal) throw err;
      // fall through to static list
    }
    return GEMINI_MODELS.map((m) => m.id);
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
      throw new ProviderRequestError("GEMINI_API_KEY is not configured in environment.", {
        status: 500,
        retryable: false,
        isRateLimit: false,
        fatal: true,
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
              parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
            }
          }
        }
      }
      return { role: m.role === "assistant" ? "model" : "user", parts };
    });

    const generationConfig: Record<string, unknown> = {
      temperature: params.temperature ?? 0.1,
      // Generous output budget: thinking tokens count against this limit on 2.5+ models,
      // and truncated output produces broken JSON.
      maxOutputTokens: Math.max(params.max_tokens ?? 0, 16384),
      ...(params.json_mode ? { responseMimeType: "application/json" } : {}),
    };

    // Disable / minimise "thinking" for speed and to keep the full budget for JSON output.
    if (/2\.5-flash/.test(params.model)) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    } else if (/gemini-3/.test(params.model)) {
      generationConfig.thinkingConfig = { thinkingLevel: "low" };
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    };

    if (systemMsg && typeof systemMsg.content === "string") {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const url = `${cfg.geminiBaseUrl}/models/${encodeURIComponent(params.model)}:generateContent`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": cfg.geminiApiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(50_000),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network timeout";
      ProviderHealthMonitor.recordFailure("gemini", msg);
      throw new ProviderRequestError(`Engine network/timeout error: ${msg}`, {
        status: 504,
        retryable: true,
        isRateLimit: false,
        provider: "gemini",
      });
    }

    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      const detail = extractGeminiError(errText);
      const isRateLimit = res.status === 429;
      const isAuth =
        res.status === 401 ||
        res.status === 403 ||
        (res.status === 400 && /api key|API_KEY_INVALID|permission/i.test(errText));

      if (isRateLimit) ProviderHealthMonitor.recordRateLimit("gemini", detail);
      else ProviderHealthMonitor.recordFailure("gemini", `HTTP ${res.status}: ${detail}`);

      throw new ProviderRequestError(`[${params.model}] HTTP ${res.status}: ${detail}`, {
        status: res.status,
        retryable: isRateLimit || res.status >= 500,
        isRateLimit,
        fatal: isAuth,
        provider: "gemini",
      });
    }

    ProviderHealthMonitor.recordSuccess("gemini", latencyMs);
    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string; thought?: boolean }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    if (data.promptFeedback?.blockReason) {
      throw new ProviderRequestError(
        `[${params.model}] Request blocked: ${data.promptFeedback.blockReason}`,
        { status: 422, retryable: false, isRateLimit: false, provider: "gemini" }
      );
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("") ?? "";

    return {
      content: text,
      provider: "Kashfara Vision",
      model: params.model,
      input_tokens: data.usageMetadata?.promptTokenCount ?? 0,
      output_tokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      latency_ms: latencyMs,
      raw_finish_reason: data.candidates?.[0]?.finishReason,
    };
  },
};
