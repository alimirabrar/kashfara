import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo — Document Proofing & Extraction Workstation",
  description:
    "Test Kashfara Vision live: upload any Arabic, English, or bilingual PDF, image, or Office document to inspect extracted fields, tables, bounding-box proof of evidence, digital forms, and grounded Q&A.",
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: "Live Demo | KASHFARA VISION",
    description:
      "Upload any Arabic or English PDF, image, or Office document for instant OCR + Vision extraction with proof of evidence.",
    url: "https://kashfara.com/demo",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
