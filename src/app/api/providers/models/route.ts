import { NextResponse } from "next/server";
import { ProviderDiscovery } from "@/services/ai/provider-discovery";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const visionOnly = url.searchParams.get("vision") === "true";
  const discovery = await ProviderDiscovery.discoverAll(false);

  const models = visionOnly
    ? discovery.providers.filter((p) => p.supports_vision && p.supports_document_images)
    : discovery.providers;

  return NextResponse.json({
    models,
    errors: discovery.errors,
  });
}
