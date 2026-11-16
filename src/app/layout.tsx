import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "KASHFARA VISION — Enterprise Multimodal Document Intelligence",
  description:
    "Evidence-backed multimodal document understanding, OCR, classification, extraction, form digitalisation, and grounded Q&A.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} ${notoSansArabic.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#080D15] text-[#E8F0F7] font-sans selection:bg-[#40E9E1]/25 selection:text-[#40E9E1]">
        {children}
      </body>
    </html>
  );
}
