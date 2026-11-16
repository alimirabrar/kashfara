import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { GeminiProvider } from "@/services/ai/gemini-provider";

export async function GET() {
  const cfg = getConfig();
  return NextResponse.json({
    status: "ok",
    service: "KASHFARA VISION",
    engine_ready: GeminiProvider.isConfigured(),
    daily_document_target: cfg.dailyDocumentTarget,
    max_upload_size_mb: cfg.maxUploadSizeMb,
    max_document_pages: cfg.maxDocumentPages,
    default_workload_pages: cfg.defaultWorkloadPages,
    timestamp: new Date().toISOString(),
  });
}
