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

  async saveUploadedFile(
    docId: string,
    filename: string,
    buffer: Buffer
  ): Promise<{ localPath: string; blobUrl?: string }> {
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const docDir = path.join(getDataRoot(), "documents", docId);
    await ensureDir(docDir);
    const localPath = path.join(docDir, `original_${safeName}`);
    await fs.writeFile(localPath, buffer);

    const cfg = getConfig();
    let blobUrl: string | undefined;
    if (cfg.blobReadWriteToken) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(`kashfara/${docId}/${safeName}`, buffer, {
          access: "private",
          token: cfg.blobReadWriteToken,
        });
        blobUrl = blob.url;
      } catch {
        // Fallback to local/tmp path if blob upload fails
      }
    }
    return { localPath, blobUrl };
  },

  async savePageImage(
    docId: string,
    pageNumber: number,
    buffer: Buffer,
    ext: "png" | "jpg" | "webp" = "png"
  ): Promise<string> {
    const pagesDir = path.join(getDataRoot(), "documents", docId, "pages");
    await ensureDir(pagesDir);
    const filePath = path.join(pagesDir, `page_${pageNumber}.${ext}`);
    await fs.writeFile(filePath, buffer);
    return filePath;
  },

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

  async saveDocument(doc: DocumentRecord): Promise<void> {
    const docPath = path.join(getDataRoot(), "documents", doc.id, "record.json");
    await writeJsonFile(docPath, doc);
  },

  async getDocument(docId: string): Promise<DocumentRecord | null> {
    const safeId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
    const docPath = path.join(getDataRoot(), "documents", safeId, "record.json");
    return readJsonFile<DocumentRecord>(docPath);
  },

  async listDocuments(): Promise<DocumentRecord[]> {
    const docsDir = path.join(getDataRoot(), "documents");
    try {
      const entries = await fs.readdir(docsDir, { withFileTypes: true });
      const results: DocumentRecord[] = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const rec = await readJsonFile<DocumentRecord>(
          path.join(docsDir, entry.name, "record.json")
        );
        if (rec) results.push(rec);
      }
      return results.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch {
      return [];
    }
  },

  async deleteDocument(docId: string): Promise<boolean> {
    const safeId = docId.replace(/[^a-zA-Z0-9_-]/g, "");
    const doc = await this.getDocument(safeId);
    if (!doc) return false;

    const cfg = getConfig();
    if (doc.blob_url && cfg.blobReadWriteToken) {
      try {
        const { del } = await import("@vercel/blob");
        await del(doc.blob_url, { token: cfg.blobReadWriteToken });
      } catch {
        // Continue local deletion even if remote blob deletion fails
      }
    }

    const docDir = path.join(getDataRoot(), "documents", safeId);
    await fs.rm(docDir, { recursive: true, force: true });
    return true;
  },

  async saveJob(job: ProcessingJob): Promise<void> {
    const jobPath = path.join(getDataRoot(), "jobs", `${job.job_id}.json`);
    await writeJsonFile(jobPath, job);
  },

  async getJob(jobId: string): Promise<ProcessingJob | null> {
    const safeId = jobId.replace(/[^a-zA-Z0-9_-]/g, "");
    const jobPath = path.join(getDataRoot(), "jobs", `${safeId}.json`);
    return readJsonFile<ProcessingJob>(jobPath);
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
    const ledgerPath = path.join(getDataRoot(), "ledger", `${ledger.date}.json`);
    await writeJsonFile(ledgerPath, ledger);
  },

  async saveProviderCache(providers: ProviderEligibility[]): Promise<void> {
    const cachePath = path.join(getDataRoot(), "providers_cache.json");
    await writeJsonFile(cachePath, {
      updated_at: new Date().toISOString(),
      providers,
    });
  },

  async getProviderCache(): Promise<{
    updated_at: string;
    providers: ProviderEligibility[];
  } | null> {
    const cachePath = path.join(getDataRoot(), "providers_cache.json");
    return readJsonFile<{ updated_at: string; providers: ProviderEligibility[] }>(cachePath);
  },
};
