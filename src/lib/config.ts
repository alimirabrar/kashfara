export interface KashfaraConfig {
  groqApiKey: string;
  groqBaseUrl: string;
  omnirouteBaseUrl: string;
  omnirouteApiKey: string;
  primaryProvider: string;
  secondaryProvider: string;
  freeOnlyMode: boolean;
  dailyDocumentTarget: number;
  maxUploadSizeMb: number;
  maxDocumentPages: number;
  defaultWorkloadPages: number;
  groqVisionModelOverride: string;
  omniroutePreferredVisionModel: string;
  blobReadWriteToken: string;
  isVercel: boolean;
}

export function getConfig(): KashfaraConfig {
  const parseBool = (val: string | undefined, fallback: boolean): boolean => {
    if (val === undefined || val === "") return fallback;
    return val.toLowerCase() === "true" || val === "1";
  };

  const parseNum = (val: string | undefined, fallback: number): number => {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    groqApiKey: (process.env.GROQ_API_KEY || "").trim(),
    groqBaseUrl: "https://api.groq.com/openai/v1",
    omnirouteBaseUrl: (process.env.OMNIROUTE_BASE_URL || "").trim().replace(/\/+$/, ""),
    omnirouteApiKey: (process.env.OMNIROUTE_API_KEY || "").trim(),
    primaryProvider: (process.env.AI_PRIMARY_PROVIDER || "auto").trim(),
    secondaryProvider: (process.env.AI_SECONDARY_PROVIDER || "auto").trim(),
    freeOnlyMode: parseBool(process.env.FREE_ONLY_MODE, true),
    dailyDocumentTarget: parseNum(process.env.DAILY_DOCUMENT_TARGET, 30),
    maxUploadSizeMb: parseNum(process.env.MAX_UPLOAD_SIZE_MB, 20),
    maxDocumentPages: parseNum(process.env.MAX_DOCUMENT_PAGES, 10),
    defaultWorkloadPages: parseNum(process.env.DEFAULT_WORKLOAD_PAGES, 5),
    groqVisionModelOverride: (process.env.GROQ_VISION_MODEL || "").trim(),
    omniroutePreferredVisionModel: (process.env.OMNIROUTE_PREFERRED_VISION_MODEL || "").trim(),
    blobReadWriteToken: (process.env.BLOB_READ_WRITE_TOKEN || "").trim(),
    isVercel: Boolean(process.env.VERCEL),
  };
}
