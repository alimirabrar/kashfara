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
      operatingSystem: "Web",
      url: SITE_URL,
      description:
        "4-billion-parameter OCR + Vision document intelligence platform for Arabic RTL, English, and bilingual documents. Features proof-of-evidence bounding boxes, table extraction, automatic form digitalisation, and grounded document Q&A.",
      featureList: [
        "Arabic RTL and English bilingual OCR + Vision understanding",
        "Low-compute, high-accuracy hybrid structural parsing",
        "Normalized bounding-box proof of evidence and visual verification",
        "Automatic digital form generation with RTL support, JSON, and CSV export",
        "Document-grounded Q&A with exact page citations",
        "Supports PDF, PNG, JPG, WEBP, TIFF, DOCX, PPTX, and XLSX",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What makes Kashfara Vision different from standard OCR?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kashfara combines fast structural OCR parsing with a 4-billion-parameter multimodal vision model, understanding layout, tables, stamps, signatures, and mixed Arabic-English context together.",
          },
        },
        {
          "@type": "Question",
          name: "Does it support Arabic RTL and bilingual documents?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Kashfara preserves right-to-left Arabic script, English LTR text, and mixed Arabic-English tables in invoices, contracts, leases, and forms.",
          },
        },
        {
          "@type": "Question",
          name: "How does Proof-of-Evidence verification work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Every extracted field includes its original label, normalized value, page number, verbatim source quote, and normalized bounding-box coordinates so teams can audit results in one click.",
          },
        },
        {
          "@type": "Question",
          name: "What file formats can I test in the Live Demo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You can upload PDF, PNG, JPG, WEBP, TIFF, DOCX, PPTX, and XLSX files directly in the Live Demo at kashfara.com/demo.",
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
