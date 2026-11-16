import { NextResponse } from "next/server";
import { ProviderDiscovery } from "@/services/ai/provider-discovery";
import { InferenceOrchestrator } from "@/services/ai/inference-orchestrator";

export async function POST() {
  try {
    const discovery = await ProviderDiscovery.discoverAll(true);
    const eligibleVision = discovery.providers.filter(
      (p) => p.eligible_for_routing && p.supports_vision
    );

    if (eligibleVision.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          discovered: discovery.providers.length,
          eligible_vision: 0,
          errors: discovery.errors,
          message: "No eligible free-tier vision models available to test.",
        },
        { status: 503 }
      );
    }

    const res = await InferenceOrchestrator.runTask<{ status?: string }>({
      task: "field_normalisation",
      systemPrompt: 'Respond ONLY with JSON: {"status": "ok"}',
      userPrompt: "Health check ping.",
      expectJson: true,
      maxTokens: 60,
      pagesCount: 0,
    });

    return NextResponse.json({
      ok: true,
      tested_provider: res.provider,
      tested_model: res.model,
      latency_ms: res.latency_ms,
      input_tokens: res.input_tokens,
      output_tokens: res.output_tokens,
      discovered_total: discovery.providers.length,
      eligible_vision_count: eligibleVision.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Provider test failed.",
      },
      { status: 500 }
    );
  }
}
