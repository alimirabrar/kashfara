import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono, Noto_Sans_Arabic } from "next/font/google";
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
    default: "KASHFARA VISION — 4B Parameter Arabic & English Document Intelligence",
    template: "%s | KASHFARA VISION",
  },
  description:
    "Kashfara Vision is a 4-billion-parameter OCR + Vision intelligence platform built for Arabic RTL, English, and bilingual enterprise documents. Extract fields, tables, and digital forms with source-level proof of evidence.",
  keywords: [
    "Kashfara",
    "Kashfara Vision",
    "Arabic OCR",
    "Arabic document intelligence",
    "bilingual OCR",
    "Arabic English document extraction",
    "invoice OCR Middle East",
    "ZATCA invoice extraction",
    "UAE VAT invoice OCR",
    "multimodal document AI",
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
    title: "KASHFARA VISION — 4B Parameter Arabic & English Document Intelligence",
    description:
      "Low-compute, high-accuracy OCR + Vision for Arabic RTL, English, and bilingual documents. Extract fields, tables, and editable digital forms with bounding-box proof of evidence.",
  },
  twitter: {
    card: "summary_large_image",
    title: "KASHFARA VISION — Arabic & English Document Intelligence",
    description:
      "4B parameter OCR + Vision model for Arabic & English documents. Extract fields, tables, and digital forms with proof of evidence.",
  },
  appleWebApp: {
    capable: true,
    title: "KASHFARA VISION",
    statusBarStyle: "default",
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
      </body>
    </html>
  );
}
