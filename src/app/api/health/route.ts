import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { GeminiProvider } from "@/services/ai/gemini-provider";

export async function GET(req: Request) {
  const cfg = getConfig();
  const url = new URL(req.url);
  const result: Record<string, unknown> = {
    status: "ok",
    service: "KASHFARA VISION",
    engine_key_present: GeminiProvider.isConfigured(),
    max_upload_size_mb: cfg.maxUploadSizeMb,
    max_document_pages: cfg.maxDocumentPages,
    timestamp: new Date().toISOString(),
  };

  // /api/health?check=1 performs a live engine test
  if (url.searchParams.get("check") === "1" && GeminiProvider.isConfigured()) {
    try {
      const models = await GeminiProvider.getAvailableModels();
      result.engine_models = models;
      const res = await GeminiProvider.chatCompletion({
        model: models[0],
        messages: [{ role: "user", content: 'Reply with JSON {"ok":true}' }],
        json_mode: true,
      });
      result.engine_live = true;
      result.engine_reply = res.content.slice(0, 100);
      result.engine_latency_ms = res.latency_ms;
    } catch (err) {
      result.engine_live = false;
      result.engine_error = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json(result);
}
