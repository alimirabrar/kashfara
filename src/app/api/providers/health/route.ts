import { NextResponse } from "next/server";
import { ProviderHealthMonitor } from "@/services/ai/provider-health";
import { GeminiProvider } from "@/services/ai/gemini-provider";

export async function GET() {
  return NextResponse.json({
    kashfara_engine: {
      configured: GeminiProvider.isConfigured(),
      ...ProviderHealthMonitor.getHealth("gemini"),
    },
  });
}
