import { NextResponse } from "next/server";
import { ProviderHealthMonitor } from "@/services/ai/provider-health";
import { GroqProvider } from "@/services/ai/groq-provider";
import { OpenRouterProvider } from "@/services/ai/openrouter-provider";
import { GeminiProvider } from "@/services/ai/gemini-provider";

export async function GET() {
  return NextResponse.json({
    engine_primary_a: {
      configured: GroqProvider.isConfigured(),
      ...ProviderHealthMonitor.getHealth("groq"),
    },
    engine_primary_b: {
      configured: OpenRouterProvider.isConfigured(),
      ...ProviderHealthMonitor.getHealth("openrouter"),
    },
    engine_fallback: {
      configured: GeminiProvider.isConfigured(),
      ...ProviderHealthMonitor.getHealth("gemini"),
    },
  });
}
