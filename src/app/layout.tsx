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
    default: "KASHFARA VISION — Arabic OCR, Arabic LLM & Document Intelligence Chatbot",
    template: "%s | KASHFARA VISION",
  },
  description:
    "Kashfara Vision is a 4B parameter Arabic LLM & OCR Document Intelligence platform and Arabic Document Chatbot. Extract fields, tables, entities, and digital forms from Arabic & English PDFs with proof of evidence.",
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
    "agentic spreadsheet",
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
    siteName: "KASHFARA VISION",
    title: "KASHFARA VISION — Arabic OCR, Arabic LLM & Document Intelligence Chatbot",
    description:
      "4B parameter Arabic LLM, Arabic OCR & Document Chatbot for Arabic RTL, English, and bilingual documents. Extract fields, tables, and digital forms with proof of evidence.",
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
      name: "KASHFARA VISION",
      url: SITE_URL,
      description:
        "Enterprise multimodal document intelligence platform specializing in Arabic and English OCR + Vision understanding.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "KASHFARA VISION",
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: ["en", "ar"],
    },
    {
      "@type": "SoftwareApplication",
      name: "KASHFARA VISION",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, Linux, On-Premise Air-Gapped",
      url: SITE_URL,
      description:
        "Complete proprietary enterprise software powered by Kashfara's own 4-billion-parameter (4B) LLM and Vision LLM (VLM) trained on 20M+ Arabic and English documents. Combines sparse-PDF OCR fallback, deterministic bounding-box proof of evidence, 5 smart templates, automatic RTL form digitalisation, grounded document chatbot Q&A, and an air-gapped agentic spreadsheet.",
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
          name: "Live Demo",
          item: `${SITE_URL}/demo`,
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
