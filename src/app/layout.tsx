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
  title: "KASHFARA VISION — Arabic & English Document Intelligence",
  description:
    "OCR + Vision multimodal intelligence built for Arabic and English documents. Low-compute, high-accuracy extraction with proof of evidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-[#1D1D1F] font-sans selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}
