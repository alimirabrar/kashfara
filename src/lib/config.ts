export interface KashfaraConfig {
  groqApiKey: string;
  groqBaseUrl: string;
  openrouterApiKey: string;
  openrouterBaseUrl: string;
  geminiApiKey: string;
  geminiBaseUrl: string;
  freeOnlyMode: boolean;
  dailyDocumentTarget: number;
  maxUploadSizeMb: number;
  maxDocumentPages: number;
  defaultWorkloadPages: number;
  isVercel: boolean;
}

export function getConfig(): KashfaraConfig {
  return {
    groqApiKey: (process.env.GROQ_API_KEY || "").trim(),
    groqBaseUrl: "https://api.groq.com/openai/v1",
    openrouterApiKey: (process.env.OPENROUTER_API_KEY || "").trim(),
    openrouterBaseUrl: "https://openrouter.ai/api/v1",
    geminiApiKey: (process.env.GEMINI_API_KEY || "").trim(),
    geminiBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    freeOnlyMode: true,
    dailyDocumentTarget: 30,
    maxUploadSizeMb: 20,
    maxDocumentPages: 10,
    defaultWorkloadPages: 5,
    isVercel: Boolean(process.env.VERCEL),
  };
}
