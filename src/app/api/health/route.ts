import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { GroqProvider } from "@/services/ai/groq-provider";
import { OmniRouteProvider } from "@/services/ai/omniroute-provider";

export async function GET() {
  const cfg = getConfig();
  return NextResponse.json({
    status: "ok",
    service: "KASHFARA VISION",
    free_only_mode: cfg.freeOnlyMode,
    daily_document_target: cfg.dailyDocumentTarget,
    max_upload_size_mb: cfg.maxUploadSizeMb,
    max_document_pages: cfg.maxDocumentPages,
    default_workload_pages: cfg.defaultWorkloadPages,
    providers_configured: {
      groq_direct: GroqProvider.isConfigured(),
      omniroute: OmniRouteProvider.isConfigured(),
      vercel_blob: Boolean(cfg.blobReadWriteToken),
    },
    timestamp: new Date().toISOString(),
  });
}
