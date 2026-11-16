export interface ProviderTermsRecord {
  provider_id: string;
  terms_approved: boolean;
  poc_permitted: boolean;
  commercial_permitted: boolean;
  proxy_permitted: boolean;
  data_retention_note: string;
  notes: string;
}

const DEFAULT_TERMS_DB: Record<string, ProviderTermsRecord> = {
  groq: {
    provider_id: "groq",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: true,
    proxy_permitted: false,
    data_retention_note: "Groq API standard terms; zero data retention option available on paid plans; free tier subject to Groq Terms of Service.",
    notes: "Direct API integration for Kashfara Vision POC. Do not resell or proxy raw API access.",
  },
  omniroute: {
    provider_id: "omniroute",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: true,
    proxy_permitted: true,
    data_retention_note: "Local/private OmniRoute gateway; upstream provider terms apply per routed provider.",
    notes: "Self-hosted or configured OmniRoute gateway.",
  },
  google: {
    provider_id: "google",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: false,
    proxy_permitted: false,
    data_retention_note: "Google AI Studio free tier prompts may be used for product improvement per Google terms.",
    notes: "Approved for private POC evaluation only unless upgraded to paid Gemini API terms.",
  },
  gemini: {
    provider_id: "gemini",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: false,
    proxy_permitted: false,
    data_retention_note: "Google AI Studio free tier prompts may be used for product improvement per Google terms.",
    notes: "Approved for private POC evaluation only.",
  },
  mistral: {
    provider_id: "mistral",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: true,
    proxy_permitted: false,
    data_retention_note: "Mistral API terms apply; verify free tier training opt-out in console.",
    notes: "Approved for POC.",
  },
  cloudflare: {
    provider_id: "cloudflare",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: true,
    proxy_permitted: false,
    data_retention_note: "Cloudflare Workers AI daily free neuron allocation.",
    notes: "Approved for POC.",
  },
  nvidia: {
    provider_id: "nvidia",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: false,
    proxy_permitted: false,
    data_retention_note: "NVIDIA NIM free developer credits/rate-limited trial.",
    notes: "POC evaluation only; monitor trial credit expiry.",
  },
  openrouter: {
    provider_id: "openrouter",
    terms_approved: true,
    poc_permitted: true,
    commercial_permitted: true,
    proxy_permitted: false,
    data_retention_note: "Upstream provider data retention varies per `:free` route.",
    notes: "Only `:free` zero-cost models permitted under FREE_ONLY_MODE.",
  },
};

export const ProviderTermsRegistry = {
  evaluate(providerId: string, upstreamProvider?: string): ProviderTermsRecord {
    const key = (upstreamProvider || providerId).toLowerCase();
    for (const [knownKey, record] of Object.entries(DEFAULT_TERMS_DB)) {
      if (key.includes(knownKey)) {
        return record;
      }
    }
    // Unknown upstream providers discovered via OmniRoute are marked unapproved until verified
    // unless they are local runtimes (ollama, lmstudio, vllm)
    if (key.includes("ollama") || key.includes("lmstudio") || key.includes("vllm") || key.includes("local")) {
      return {
        provider_id: key,
        terms_approved: true,
        poc_permitted: true,
        commercial_permitted: true,
        proxy_permitted: true,
        data_retention_note: "Local runtime; data never leaves host.",
        notes: "Local inference runtime.",
      };
    }

    return {
      provider_id: key,
      terms_approved: false,
      poc_permitted: false,
      commercial_permitted: false,
      proxy_permitted: false,
      data_retention_note: "Unverified upstream provider terms.",
      notes: "Excluded under strict compliance until provider terms and data retention are verified.",
    };
  },
};
