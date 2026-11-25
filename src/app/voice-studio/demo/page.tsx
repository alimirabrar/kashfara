import type { Metadata } from "next";
import VoiceStudioDemo from "@/components/VoiceStudioDemo";

export const metadata: Metadata = {
  title: {
    absolute: "Live Demo — KASHFARA VOICE STUDIO | 5-Minute Enterprise Voice AI",
  },
  description:
    "Test Kashfara Voice Studio live for 5 minutes. Configure your company name and use case (recruitment, BPO screening, or sales) in plain language and talk with your enterprise voice AI.",
  alternates: { canonical: "/voice-studio/demo" },
  openGraph: {
    type: "website",
    siteName: "KASHFARA VOICE STUDIO",
    title: "Live Demo — KASHFARA VOICE STUDIO | 5-Minute Enterprise Voice AI",
    description:
      "Configure your company name and use case in plain language and talk live with Kashfara Voice Studio for 5 minutes.",
    url: "https://kashfara.com/voice-studio/demo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Demo — KASHFARA VOICE STUDIO",
    description:
      "Configure your company name and purpose in plain language and talk live with your enterprise voice AI.",
  },
};

export default function VoiceStudioDemoPage() {
  return <VoiceStudioDemo />;
}
