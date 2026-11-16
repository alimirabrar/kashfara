export interface KashfaraConfig {
  geminiApiKey: string;
  geminiBaseUrl: string;
  dailyDocumentTarget: number;
  maxUploadSizeMb: number;
  maxDocumentPages: number;
  defaultWorkloadPages: number;
  isVercel: boolean;
}

export function getConfig(): KashfaraConfig {
  return {
    geminiApiKey: (process.env.GEMINI_API_KEY || "").trim(),
    geminiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    dailyDocumentTarget: 30,
    maxUploadSizeMb: 20,
    maxDocumentPages: 10,
    defaultWorkloadPages: 5,
    isVercel: Boolean(process.env.VERCEL),
  };
}
