import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  AudioWaveform,
  Building2,
  CheckCircle2,
  Cpu,
  Headphones,
  Lock,
  Mail,
  Mic,
  Server,
  Sparkles,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "KASHFARA VOICE STUDIO — Low-Compute On-Premise TTS + STT Enterprise Voice AI",
  description:
    "Low-computing enterprise voice model combining TTS and STT engineered for great output and permanent on-premise deployment with zero vendor lock-in. Proven in production with jobshop.ai for BPO recruitment and English speaking skill analysis.",
  keywords: [
    "Kashfara Voice Studio",
    "on-premise voice AI",
    "low compute TTS STT",
    "enterprise voice model",
    "no vendor lock-in voice AI",
    "BPO candidate voice screening",
    "English speaking skill assessment AI",
    "jobshop.ai",
  ],
  alternates: { canonical: "/voice-studio" },
  openGraph: {
    title: "KASHFARA VOICE STUDIO — On-Premise Low-Compute TTS + STT",
    description:
      "Deploy our low-computing TTS + STT voice model on-premise forever with zero vendor lock-in. Trusted by jobshop.ai for BPO hiring and English speaking evaluation.",
    url: "https://kashfara.com/voice-studio",
  },
};

const VOICE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "KASHFARA VOICE STUDIO",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Linux, On-Premise Air-Gapped, Web",
      url: "https://kashfara.com/voice-studio",
      description:
        "Enterprise low-computing voice model combining Text-to-Speech (TTS) and Speech-to-Text (STT) engineered for high-clarity output and permanent on-premise deployment with zero vendor lock-in. Proven in production by jobshop.ai for automated BPO recruitment and candidate English speaking skill analysis.",
      featureList: [
        "Unified low-computing TTS + STT voice architecture engineered for great output",
        "Permanent on-premise and air-gapped deployment with zero vendor lock-in",
        "Automated BPO candidate screening and English speaking fluency analysis",
        "Structured candidate inputs and evaluation outputs for recruitment and sales",
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is Kashfara Voice Studio?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Kashfara Voice Studio is a low-computing enterprise voice AI model combining Text-to-Speech (TTS) and Speech-to-Text (STT) engineered for high-clarity output and permanent on-premise deployment with no vendor lock-in.",
          },
        },
        {
          "@type": "Question",
          name: "Who uses Kashfara Voice Studio in production?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "jobshop.ai bought and deployed Kashfara Voice Studio to automate candidate interviews, place candidates in BPO roles, and analyze candidates' English speaking skills by capturing structured candidate inputs and generating evaluation outputs.",
          },
        },
      ],
    },
  ],
};

const VOICE_PILLARS = [
  {
    icon: Cpu,
    tag: "Low-Compute TTS + STT",
    title: "Engineered for Low Computing & Great Output",
    desc: "A unified Text-to-Speech (TTS) and Speech-to-Text (STT) voice model engineered to deliver crisp, natural audio and accurate transcription on modest on-premise hardware—no massive GPU clusters required.",
  },
  {
    icon: Server,
    tag: "On-Premise Forever",
    title: "Deploy On-Premise Forever. Zero Vendor Lock-In.",
    desc: "Own your voice infrastructure outright inside your data center or air-gapped network. Never pay recurring per-minute cloud voice taxes or risk external API deprecation.",
  },
  {
    icon: Users,
    tag: "Recruitment & Sales",
    title: "Plain-Language Setup for Any Workflow",
    desc: "Configure your Voice Studio in plain language for BPO candidate screening, English speaking skill evaluation, or enterprise sales qualification in seconds.",
  },
  {
    icon: Lock,
    tag: "Data Sovereignty",
    title: "Zero Audio Leakage Outside Your Firewall",
    desc: "Candidate interviews, customer calls, and proprietary scripts never leave your enterprise servers.",
  },
];

export default function VoiceStudioPage() {
  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] selection:bg-black selection:text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(VOICE_JSON_LD) }}
      />

      {/* Sticky Glassmorphic Header */}
      <header className="sticky top-0 z-50 apple-glass">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6E73] hover:text-black"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kashfara</span>
            </Link>
            <span className="text-black/20">/</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
                <AudioWaveform className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-black">
                KASHFARA <span className="font-light text-[#6E6E73]">VOICE STUDIO</span>
              </span>
            </div>
          </div>

          <Link
            href="/voice-studio/demo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-black text-white hover:bg-[#1D1D1F] shadow-sm transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Live Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-16 pb-20 sm:pt-24 sm:pb-24 px-4 sm:px-6 text-center relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.05),transparent_70%)]"
          />
          <div className="relative max-w-4xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full apple-surface text-[11px] font-mono uppercase tracking-widest text-black">
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              <span>Low-Compute TTS + STT · On-Premise Forever · No Vendor Lock-In</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight text-black leading-[1.06]">
              Enterprise Voice AI.
              <br />
              <span className="text-[#6E6E73]">Low Compute. Yours Forever.</span>
            </h1>

            <p className="text-base sm:text-xl text-[#6E6E73] max-w-2xl mx-auto leading-relaxed">
              <span className="text-black font-medium">Kashfara Voice Studio</span> is a unified low-computing voice model combining{" "}
              <span className="text-black font-medium">TTS (Text-to-Speech) and STT (Speech-to-Text)</span>{" "}
              engineered for great output—built for enterprises that want to deploy on-premise forever with zero vendor lock-in.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/voice-studio/demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-black hover:bg-[#1D1D1F] text-white text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.16)] transition-all hover:scale-[1.02]"
              >
                <Mic className="w-4 h-4" />
                <span>Try 1-Minute Live Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:enquiry@kashfara.com?subject=Kashfara%20Voice%20Studio%20On-Premise%20Enterprise%20Inquiry"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-full apple-glass text-black text-sm font-semibold hover:bg-[#F5F5F7] transition-all"
              >
                <Mail className="w-4 h-4" />
                <span>enquiry@kashfara.com</span>
              </a>
            </div>
          </div>
        </section>

        {/* Proven Production Client: jobshop.ai */}
        <section className="py-16 px-4 sm:px-6 bg-[#F5F5F7] border-t border-black/8">
          <div className="max-w-5xl mx-auto apple-card rounded-3xl p-8 sm:p-12 bg-white space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F5F7] border border-black/10 text-[11px] font-mono uppercase tracking-wider text-black">
                <Building2 className="w-3.5 h-3.5" />
                <span>Delivered Enterprise Deployment · jobshop.ai</span>
              </div>
              <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                In Production · BPO Recruitment Automation
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black">
                How jobshop.ai Automated BPO Hiring &amp; English Skill Analysis
              </h2>
              <p className="text-sm sm:text-base text-[#6E6E73] leading-relaxed">
                Our existing client <strong className="text-black">jobshop.ai</strong> purchased and deployed Kashfara Voice Studio to automate their end-to-end candidate screening pipeline. Today, they use our low-compute TTS + STT voice model to interview candidates at scale, place qualified talent into <strong className="text-black">BPO roles</strong>, and accurately <strong className="text-black">analyze each candidate&apos;s English speaking skills</strong>—collecting structured voice inputs from candidates and generating actionable evaluation outputs directly through Kashfara Voice Studio.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                {
                  icon: Headphones,
                  title: "Automated BPO Interviews",
                  desc: "Conducts consistent voice interviews without manual recruiter bottlenecks.",
                },
                {
                  icon: AudioWaveform,
                  title: "English Speaking Skill Analysis",
                  desc: "Evaluates fluency, clarity, pronunciation, and comprehension from live voice.",
                },
                {
                  icon: CheckCircle2,
                  title: "Structured Inputs & Outputs",
                  desc: "Captures candidate answers and produces structured hiring scores & reports.",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="p-5 rounded-2xl bg-[#F5F5F7] space-y-2">
                    <Icon className="w-4 h-4 text-black" />
                    <div className="text-sm font-semibold text-black">{item.title}</div>
                    <p className="text-xs text-[#6E6E73] leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Architecture & On-Premise Pillars */}
        <section className="py-20 px-4 sm:px-6 bg-white border-t border-black/8">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="max-w-2xl space-y-3">
              <div className="text-xs font-mono uppercase tracking-widest text-[#6E6E73]">
                ARCHITECTURE &amp; OWNERSHIP
              </div>
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-black">
                Built for Enterprises That Refuse Vendor Lock-In.
              </h2>
              <p className="text-base text-[#6E6E73]">
                Kashfara Voice Studio combines compact STT and natural TTS into one efficient model engineered for permanent on-premise operation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {VOICE_PILLARS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="apple-card rounded-3xl p-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[#6E6E73]">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-black pt-1">{item.title}</h3>
                    <p className="text-sm text-[#6E6E73] leading-relaxed">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16 px-4 sm:px-6 bg-[#F5F5F7]">
          <div className="max-w-4xl mx-auto rounded-3xl bg-black text-white p-8 sm:p-12 text-center space-y-5">
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight">
              Try Kashfara Voice Studio Live (1-Minute Preview)
            </h2>
            <p className="text-sm text-white/70 max-w-xl mx-auto">
              Enter your company name and what your voice AI is for—recruitment, BPO screening, or sales—and talk with your AI agent immediately.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/voice-studio/demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-black hover:bg-white/90 text-sm font-semibold"
              >
                <Mic className="w-4 h-4" />
                <span>Launch Voice Studio Demo</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:enquiry@kashfara.com?subject=Kashfara%20Voice%20Studio%20Enterprise%20Sales"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-full border border-white/25 text-white hover:bg-white/10 text-sm font-semibold"
              >
                <Mail className="w-4 h-4" />
                <span>enquiry@kashfara.com</span>
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
