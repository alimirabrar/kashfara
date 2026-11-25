import type { Metadata } from "next";
import { SpreadsheetWorkspace } from "@/components/SpreadsheetWorkspace";

export const metadata: Metadata = {
  title: {
    absolute: "Live Demo — KASHFARA SPREADSHEET | Agentic AI Excel & CSV",
  },
  description:
    "Interactive agentic spreadsheet live demo: import Excel/CSV, type k= AI prompts in any cell, color-code anomalies, generate pie/bar charts, and export.",
  alternates: { canonical: "/spreadsheet/demo" },
  openGraph: {
    type: "website",
    siteName: "KASHFARA SPREADSHEET",
    title: "Live Demo — KASHFARA SPREADSHEET | Agentic AI Excel & CSV",
    description:
      "Test Kashfara Spreadsheet live: import Excel/CSV, run k= AI prompts in any cell, and generate charts & financial analysis.",
    url: "https://kashfara.com/spreadsheet/demo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Demo — KASHFARA SPREADSHEET",
    description:
      "Import Excel/CSV, type k= AI prompts in any cell, generate pie/bar charts, and export.",
  },
};

export default function SpreadsheetDemoPage() {
  return <SpreadsheetWorkspace />;
}
