import { NextResponse } from "next/server";
import { ProviderDiscovery } from "@/services/ai/provider-discovery";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const refresh = url.searchParams.get("refresh") === "true";
  const discovery = await ProviderDiscovery.discoverAll(refresh);

  const eligibleVision = discovery.providers.filter(
    (p) => p.eligible_for_routing && p.supports_vision && p.supports_document_images
  );
  const eligibleReasoning = discovery.providers.filter(
    (p) => p.eligible_for_routing && p.supports_structured_output
  );

  return NextResponse.json({
    discovered_at: discovery.discovered_at,
    summary: {
      total_models: discovery.providers.length,
      eligible_vision_models: eligibleVision.length,
      eligible_reasoning_models: eligibleReasoning.length,
      excluded_models: discovery.providers.filter((p) => !p.eligible_for_routing).length,
    },
    providers: discovery.providers,
    errors: discovery.errors,
  });
}
