import type { Metadata } from "next";
import { SpreadsheetWorkspace } from "@/components/SpreadsheetWorkspace";

export const metadata: Metadata = {
  title: "Live Demo — Kashfara Spreadsheet",
  description:
    "Interactive agentic spreadsheet: import Excel/CSV, type k= AI prompts in any cell, generate data analysis reports, and export.",
  alternates: { canonical: "/spreadsheet/demo" },
};

export default function SpreadsheetDemoPage() {
  return <SpreadsheetWorkspace />;
}
