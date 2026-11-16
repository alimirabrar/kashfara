import { NextResponse } from "next/server";
import { ProviderDiscovery } from "@/services/ai/provider-discovery";
import { ProviderQuotaManager } from "@/services/ai/quota-manager";
import { QuotaMonitor } from "@/services/usage/quota-monitor";

export async function GET() {
  const discovery = await ProviderDiscovery.discoverAll(false);
  const pools = ProviderQuotaManager.listAllPools();
  const capacity = QuotaMonitor.estimateDailyCapacity(discovery.providers);

  return NextResponse.json({
    pools,
    capacity,
    discovered_at: discovery.discovered_at,
  });
}
