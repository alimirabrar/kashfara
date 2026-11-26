import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono, Noto_Sans_Arabic } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://kashfara.com";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "KASHFARA — Enterprise AI Suite: Vision OCR, Agentic Spreadsheet & Voice Studio",
    template: "%s | KASHFARA",
  },
  description:
    "Kashfara is an enterprise AI suite powered by our proprietary 4B LLM & Vision LLM trained on 20M+ Arabic & English documents: Kashfara Vision (Arabic OCR & Document Intelligence), Kashfara Spreadsheet (Air-Gapped Agentic Excel with k= AI), and Kashfara Voice Studio (On-Premise TTS + STT).",
  keywords: [
    "Arabic OCR",
    "Arabic LLM",
    "Arabic document chatbot",
    "document intelligence",
    "document chatbot",
    "OCR",
    "Arabic PDF OCR",
    "bilingual Arabic English OCR",
    "Kashfara",
    "Kashfara Vision",
    "Kashfara Spreadsheet",
    "Kashfara Voice Studio",
    "agentic spreadsheet",
    "on-premise voice AI",
    "low compute TTS STT",
    "invoice OCR Middle East",
    "ZATCA invoice OCR",
    "UAE VAT invoice extraction",
    "air-gapped document AI",
    "form digitalisation",
    "proof of evidence OCR",
    "4B parameter vision model",
  ],
  authors: [{ name: "Kashfara Vision", url: SITE_URL }],
  creator: "Kashfara Vision",
  publisher: "Kashfara Vision",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ar_AE", "ar_SA"],
    url: SITE_URL,
    siteName: "KASHFARA",
    title: "KASHFARA — Vision OCR, Agentic Spreadsheet & On-Premise Voice Studio",
    description:
      "Enterprise AI suite powered by Kashfara's 4B LLM & Vision LLM: Kashfara Vision (Arabic OCR & Document Intelligence), Kashfara Spreadsheet (Air-Gapped Agentic Excel), and Kashfara Voice Studio (On-Premise TTS + STT).",
  },
  twitter: {
    card: "summary_large_image",
    title: "KASHFARA VISION — Arabic OCR, Arabic LLM & Document Chatbot",
    description:
      "4B parameter Arabic OCR & Document Intelligence Chatbot. Extract fields, tables, entities, and digital forms with proof of evidence.",
  },
  appleWebApp: {
    capable: true,
    title: "KASHFARA VISION",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  category: "technology",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "KASHFARA",
      url: SITE_URL,
      description:
        "Enterprise AI software company building Kashfara Vision (Arabic & English 4B LLM Document Intelligence), Kashfara Spreadsheet (Air-Gapped Agentic Excel), and Kashfara Voice Studio (Low-Compute On-Premise TTS + STT).",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "KASHFARA",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: ["en", "ar"],
    },
    {
      "@type": "SoftwareApplication",
      name: "KASHFARA VISION",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Linux, On-Premise Air-Gapped",
      url: `${SITE_URL}/demo`,
      description:
        "Complete proprietary enterprise software powered by Kashfara's own 4-billion-parameter (4B) LLM and Vision LLM (VLM) trained on 20M+ Arabic and English documents. Combines sparse-PDF OCR fallback, deterministic bounding-box proof of evidence, 5 smart templates, automatic RTL form digitalisation, and grounded document chatbot Q&A.",
      audience: {
        "@type": "BusinessAudience",
        audienceType: "Enterprise Finance, Banking, Legal, Logistics, Real Estate, and Healthcare Teams",
      },
      featureList: [
        "Proprietary 4B LLM & Vision LLM (VLM) trained on 20M+ Arabic & English documents",
        "Hybrid sparse-PDF detection with automatic dual-script (eng+ara) OCR fallback",
        "Deterministic SourceMatcher and [0..1] bounding-box proof-of-evidence verification",
        "5 smart templates (Resume + ATS Scorer, Invoice, Bank Statement, Contract, Receipt) plus unstructured entity and clause extraction",
        "Automatic digital form generation with Arabic RTL support, JSON, and CSV export",
        "Document-grounded chatbot Q&A with clickable page citations",
        "Air-gapped on-premise deployment with zero external data leakage",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "KASHFARA SPREADSHEET",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Linux, On-Premise Air-Gapped",
      url: `${SITE_URL}/spreadsheet`,
      description:
        "Air-gapped agentic financial spreadsheet powered by Kashfara's 4B LLM trained on 20M+ Arabic and English documents and ledgers. Supports k= in-cell AI prompts, range-aware copilot editing, cell coloring, pie/bar charts, and Middle East banking ledger reconciliation.",
      featureList: [
        "k= in-cell AI prompts replacing complex Excel formulas",
        "Range-aware AI copilot for banking ledger reconciliation and VAT/ZATCA calculations",
        "Automated cell coloring, pie/bar chart generation, and executive reports",
        "Air-gapped on-premise deployment with zero token limits and zero data leakage",
      ],
    },
    {
      "@type": "SoftwareApplication",
      name: "KASHFARA VOICE STUDIO",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Linux, On-Premise Air-Gapped",
      url: `${SITE_URL}/voice-studio`,
      description:
        "Low-computing enterprise voice AI model combining Text-to-Speech (TTS) and Speech-to-Text (STT) engineered for great output and permanent on-premise deployment with zero vendor lock-in. Proven in production by jobshop.ai for BPO hiring and English speaking skill evaluation.",
      featureList: [
        "Unified low-compute TTS + STT voice architecture",
        "Permanent on-premise deployment with zero vendor lock-in",
        "Automated BPO candidate interviews and English speaking skill analysis (proven by jobshop.ai)",
        "Plain-language configuration for recruitment and enterprise sales",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Does Kashfara have its own proprietary LLM and Vision LLM?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Kashfara is a complete proprietary enterprise software platform powered by our own 4-billion-parameter (4B) LLM and Vision LLM (VLM) trained on over 20 million Arabic and English documents—not a thin wrapper around third-party chat APIs.",
          },
        },
        {
          "@type": "Question",
          name: "How is Kashfara different from Azure Document Intelligence, Google Document AI, or building in-house?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Azure DI and major cloud APIs charge per-page cloud fees, require external data egress, and lack built-in Document Q&A, RTL Digital Forms, and Agentic Spreadsheets. Naive in-house builds break on sparse vector PDFs and Arabic RTL tables. Kashfara ships our proprietary 4B LLM + VLM, hybrid sparse-PDF OCR fallback, deterministic SourceMatcher evidence verification, and air-gapped on-premise deployment out of the box.",
          },
        },
        {
          "@type": "Question",
          name: "What technical edge cases and production risks does Kashfara solve?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kashfara solves partially rasterized PDFs (auto-triggering dual-script Arabic and English OCR when native text is sparse), mixed RTL/LTR bidirectional layouts, unverified AI coordinates (never auto-verifying model-proposed boxes without SourceMatcher confirmation), serverless timeouts, and truncated JSON responses.",
          },
        },
        {
          "@type": "Question",
          name: "How is data security, compliance, and air-gapped deployment handled?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kashfara enforces magic-byte file signature validation, treats all extracted document text as untrusted data to block prompt injections, runs statelessly without persistent server file storage in the web demo, and deploys inside air-gapped enterprise or banking networks with zero external API calls and zero data leakage.",
          },
        },
        {
          "@type": "Question",
          name: "What is the time-to-value and total cost of ownership compared to in-house development?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Instead of spending months of senior engineering time building, debugging, and maintaining OCR pipelines, coordinate alignment, model failover, and air-gapped packaging, teams deploy Kashfara immediately with a compact 4B parameter footprint and predictable total cost of ownership.",
          },
        },
        {
          "@type": "Question",
          name: "Does Kashfara support Arabic RTL and bilingual documents?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Kashfara preserves right-to-left Arabic script, English LTR text, and mixed Arabic-English tables in invoices, bank statements, contracts, leases, and forms, and provides English translations for non-English documents.",
          },
        },
        {
          "@type": "Question",
          name: "What file formats can I test in the Live Demo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can upload PDF, PNG, JPG, WEBP, TIFF, DOCX, PPTX, and XLSX files in the Document Intelligence Live Demo at kashfara.com/demo, and Excel/CSV workbooks in Kashfara Spreadsheet at kashfara.com/spreadsheet/demo.",
          },
        },
        {
          "@type": "Question",
          name: "What is Kashfara Spreadsheet and how does k= work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kashfara Spreadsheet (kashfara.com/spreadsheet) is an air-gapped agentic financial spreadsheet powered by Kashfara's 4B LLM trained on 20M+ Arabic and English documents and ledgers. Users type k= directly inside any cell instead of complex Excel formulas, color-code anomalies, generate pie/bar charts, and reconcile GCC banking ledgers with zero data leakage.",
          },
        },
        {
          "@type": "Question",
          name: "What is Kashfara Voice Studio and who uses it in production?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kashfara Voice Studio (kashfara.com/voice-studio) is a low-computing enterprise voice model combining TTS and STT engineered for great output and permanent on-premise deployment with zero vendor lock-in. It is deployed in production by jobshop.ai to automate BPO recruitment interviews and analyze candidates' English speaking skills.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: SITE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Document Intelligence Live Demo",
          item: `${SITE_URL}/demo`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Kashfara Spreadsheet",
          item: `${SITE_URL}/spreadsheet`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "Kashfara Voice Studio",
          item: `${SITE_URL}/voice-studio`,
        },
      ],
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-[#1D1D1F] font-sans selection:bg-black selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
