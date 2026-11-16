import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getConfig } from "@/lib/config";
import type {
  DailyUsageLedgerState,
  DocumentRecord,
  ProcessingJob,
  ProviderEligibility,
} from "@/types/kashfara";

function getDataRoot(): string {
  const cfg = getConfig();
  if (cfg.isVercel) {
    return path.join("/tmp", "kashfara-data");
  }
  return path.join(process.cwd(), ".kashfara-data");
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmpPath, filePath);
}

export const store = {
  getRoot: getDataRoot,

  async readPageImageBase64(imagePath: string): Promise<string | null> {
    try {
      const buf = await fs.readFile(imagePath);
      return buf.toString("base64");
    } catch {
      return null;
    }
  },

  async readPageImageBuffer(imagePath: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(imagePath);
    } catch {
      return null;
    }
  },

  async saveDocument(_doc: DocumentRecord): Promise<void> {
    // Stateless one-time upload mode: documents live in client session state
  },

  async getDocument(docId: string): Promise<DocumentRecord | null> {
    const safeId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
    const docPath = path.join(getDataRoot(), "documents", safeId, "record.json");
    return readJsonFile<DocumentRecord>(docPath);
  },

  async listDocuments(): Promise<DocumentRecord[]> {
    return [];
  },

  async deleteDocument(_docId: string): Promise<boolean> {
    return true;
  },

  async saveJob(_job: ProcessingJob): Promise<void> {
    // Stateless mode
  },

  async getJob(_jobId: string): Promise<ProcessingJob | null> {
    return null;
  },

  async getLedger(dateStr: string): Promise<DailyUsageLedgerState> {
    const ledgerPath = path.join(getDataRoot(), "ledger", `${dateStr}.json`);
    const existing = await readJsonFile<DailyUsageLedgerState>(ledgerPath);
    if (existing) return existing;
    return {
      date: dateStr,
      requests_today: 0,
      documents_processed_today: 0,
      pages_processed_today: 0,
      input_tokens_today: 0,
      output_tokens_today: 0,
      rate_limit_events_today: 0,
      provider_failures_today: 0,
      successful_extractions_today: 0,
      total_latency_ms_today: 0,
      avg_processing_time_ms: 0,
      events: [],
    };
  },

  async saveLedger(ledger: DailyUsageLedgerState): Promise<void> {
    try {
      const ledgerPath = path.join(getDataRoot(), "ledger", `${ledger.date}.json`);
      await writeJsonFile(ledgerPath, ledger);
    } catch {
      // Best-effort telemetry in serverless
    }
  },

  async saveProviderCache(providers: ProviderEligibility[]): Promise<void> {
    try {
      const cachePath = path.join(getDataRoot(), "providers_cache.json");
      await writeJsonFile(cachePath, {
        updated_at: new Date().toISOString(),
        providers,
      });
    } catch {
      // Best-effort cache
    }
  },

  async getProviderCache(): Promise<{
    updated_at: string;
    providers: ProviderEligibility[];
  } | null> {
    const cachePath = path.join(getDataRoot(), "providers_cache.json");
    return readJsonFile<{ updated_at: string; providers: ProviderEligibility[] }>(cachePath);
  },
};
