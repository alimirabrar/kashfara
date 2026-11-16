import { NextResponse } from "next/server";
import { ProviderHealthMonitor } from "@/services/ai/provider-health";
import { GroqProvider } from "@/services/ai/groq-provider";
import { OmniRouteProvider } from "@/services/ai/omniroute-provider";

export async function GET() {
  return NextResponse.json({
    groq_direct: {
      configured: GroqProvider.isConfigured(),
      ...ProviderHealthMonitor.getHealth("groq"),
    },
    omniroute: {
      configured: OmniRouteProvider.isConfigured(),
      ...ProviderHealthMonitor.getHealth("omniroute"),
    },
  });
}
