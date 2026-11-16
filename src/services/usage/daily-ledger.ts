import crypto from "node:crypto";
import { store } from "@/services/storage/store";
import type { DailyUsageLedgerState, TaskCategory, UsageEvent } from "@/types/kashfara";

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DailyUsageLedger = {
  async getToday(): Promise<DailyUsageLedgerState> {
    return store.getLedger(todayDateStr());
  },

  async recordInference(params: {
    provider: string;
    model: string;
    shared_quota_pool: string;
    task: TaskCategory;
    document_id?: string;
    pages_count: number;
    input_tokens: number;
    output_tokens: number;
    latency_ms: number;
    success: boolean;
    rate_limited: boolean;
    error_message?: string;
  }): Promise<DailyUsageLedgerState> {
    const ledger = await this.getToday();
    const evt: UsageEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...params,
    };

    ledger.requests_today += 1;
    ledger.input_tokens_today += params.input_tokens;
    ledger.output_tokens_today += params.output_tokens;
    if (params.rate_limited) ledger.rate_limit_events_today += 1;
    if (!params.success) ledger.provider_failures_today += 1;
    if (params.success) {
      ledger.total_latency_ms_today += params.latency_ms;
    }

    const totalSuccessReqs = Math.max(
      1,
      ledger.requests_today - ledger.provider_failures_today
    );
    ledger.avg_processing_time_ms = Math.round(
      ledger.total_latency_ms_today / totalSuccessReqs
    );

    ledger.events = [evt, ...ledger.events].slice(0, 200);
    await store.saveLedger(ledger);
    return ledger;
  },

  async recordDocumentCompleted(pagesCount: number, success: boolean): Promise<void> {
    const ledger = await this.getToday();
    if (success) {
      ledger.documents_processed_today += 1;
      ledger.pages_processed_today += pagesCount;
      ledger.successful_extractions_today += 1;
    }
    await store.saveLedger(ledger);
  },
};
