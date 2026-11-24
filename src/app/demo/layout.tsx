import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Demo — Arabic OCR, Document Intelligence & Document Chatbot",
  description:
    "Try Kashfara Vision's Arabic OCR, Arabic LLM, and Document Chatbot live: upload any Arabic or English PDF, image, resume, invoice, contract, or bank statement for instant extraction and Q&A.",
  keywords: [
    "Arabic document chatbot",
    "document chatbot",
    "Arabic OCR demo",
    "Arabic LLM",
    "document intelligence demo",
    "PDF OCR online",
    "resume ATS scorer",
  ],
  alternates: {
    canonical: "/demo",
  },
  openGraph: {
    title: "Live Demo — Arabic OCR & Document Chatbot | KASHFARA VISION",
    description:
      "Upload any Arabic or English PDF, image, or Office document for instant OCR, smart templates, proof of evidence, and grounded document chatbot Q&A.",
    url: "https://kashfara.com/demo",
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
