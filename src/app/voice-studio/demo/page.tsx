import type { Metadata } from "next";
import VoiceStudioDemo from "@/components/VoiceStudioDemo";

export const metadata: Metadata = {
  title: "Live Demo — KASHFARA VOICE STUDIO",
  description:
    "Test Kashfara Voice Studio live for 1 minute. Configure your company name and use case (recruitment, BPO screening, or sales) and talk with your enterprise voice AI.",
  alternates: { canonical: "/voice-studio/demo" },
};

export default function VoiceStudioDemoPage() {
  return <VoiceStudioDemo />;
}
