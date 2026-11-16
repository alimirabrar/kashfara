import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { GroqProvider } from "@/services/ai/groq-provider";
import { OpenRouterProvider } from "@/services/ai/openrouter-provider";
import { GeminiProvider } from "@/services/ai/gemini-provider";

export async function GET() {
  const cfg = getConfig();
  const enginesOnline =
    GroqProvider.isConfigured() ||
    OpenRouterProvider.isConfigured() ||
    GeminiProvider.isConfigured();

  return NextResponse.json({
    status: "ok",
    service: "KASHFARA VISION",
    engine_ready: enginesOnline,
    daily_document_target: cfg.dailyDocumentTarget,
    max_upload_size_mb: cfg.maxUploadSizeMb,
    max_document_pages: cfg.maxDocumentPages,
    default_workload_pages: cfg.defaultWorkloadPages,
    timestamp: new Date().toISOString(),
  });
}
