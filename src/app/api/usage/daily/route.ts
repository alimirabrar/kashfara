import { NextResponse } from "next/server";
import { DailyUsageLedger } from "@/services/usage/daily-ledger";
import { ProviderDiscovery } from "@/services/ai/provider-discovery";
import { QuotaMonitor } from "@/services/usage/quota-monitor";

export async function GET() {
  const [ledger, discovery] = await Promise.all([
    DailyUsageLedger.getToday(),
    ProviderDiscovery.discoverAll(false),
  ]);
  const capacity = QuotaMonitor.estimateDailyCapacity(discovery.providers);

  return NextResponse.json({
    ledger,
    capacity,
    providers_errors: discovery.errors,
  });
}
