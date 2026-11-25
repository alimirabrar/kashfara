"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  AudioWaveform,
  Clock,
  Mail,
  Mic,
  MicOff,
  PhoneOff,
  Send,
  Sparkles,
} from "lucide-react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SESSION_DURATION_SECONDS = 300;
const BASE_SPEECH_THRESHOLD = 0.045;
const BARGE_IN_THRESHOLD = 0.14;
const CONSECUTIVE_SPEECH_FRAMES = 3;
const BARGE_IN_FRAMES = 4;
const SILENCE_HANGOVER_MS = 750;
const MIN_UTTERANCE_MS = 500;
const POST_AI_COOLDOWN_MS = 450;

function downsampleTo16kPcm(float32Data: Float32Array, inputSampleRate: number): Int16Array {
  const targetRate = 16000;
  if (inputSampleRate === targetRate) {
    const out = new Int16Array(float32Data.length);
    for (let i = 0; i < float32Data.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Data[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputSampleRate / targetRate;
  const newLength = Math.round(float32Data.length / ratio);
  const out = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < out.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < float32Data.length; i++) {
      accum += float32Data[i];
      count++;
    }
    const sample = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return out;
}

function int16ToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export default function VoiceStudioDemo() {
  const [step, setStep] = useState<"setup" | "live" | "ended">("setup");
  const [companyName, setCompanyName] = useState("");
  const [useCase, setUseCase] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<"recruitment" | "sales" | null>(null);
  const [isRequestingMic, setIsRequestingMic] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(SESSION_DURATION_SECONDS);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [textDraft, setTextDraft] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const sessionEndedRef = useRef(false);
  const isMutedRef = useRef(false);
  const voiceStateRef = useRef<VoiceState>("idle");
  const isSendingRef = useRef(false);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; text: string }>>([]);

  // Continuous VAD buffers
  const isSpeakingRef = useRef(false);
  const consecutiveSpeechFramesRef = useRef(0);
  const noiseFloorRef = useRef(0.01);
  const peakUtteranceRmsRef = useRef(0);
  const aiEndedAtRef = useRef(0);
  const lastVoiceTimeRef = useRef(0);
  const utteranceChunksRef = useRef<Float32Array[]>([]);
  const preRollChunksRef = useRef<Float32Array[]>([]);
  const inputSampleRateRef = useRef<number>(16000);

  const setSyncedVoiceState = useCallback((next: VoiceState) => {
    voiceStateRef.current = next;
    setVoiceState(next);
  }, []);

  const stopAiPlayback = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const stopAllMedia = useCallback(() => {
    stopAiPlayback();
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        // ignore
      }
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    isSpeakingRef.current = false;
    consecutiveSpeechFramesRef.current = 0;
    peakUtteranceRmsRef.current = 0;
    utteranceChunksRef.current = [];
    preRollChunksRef.current = [];
    setAudioLevel(0);
  }, [stopAiPlayback]);

  const endSession = useCallback(() => {
    sessionEndedRef.current = true;
    stopAllMedia();
    setSyncedVoiceState("idle");
    setStep("ended");
  }, [stopAllMedia, setSyncedVoiceState]);

  // 1-minute countdown timer (only runs once mic permission succeeded and step === "live")
  useEffect(() => {
    if (step !== "live") return;
    sessionEndedRef.current = false;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [step, endSession]);

  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, [stopAllMedia]);

  const speakResponse = useCallback(
    async (data: {
      audioBase64?: string | null;
      mimeType?: string | null;
      aiTranscript?: string;
    }) => {
      if (sessionEndedRef.current) return;

      if (data.audioBase64 && data.mimeType) {
        setSyncedVoiceState("speaking");
        const audio = new Audio(`data:${data.mimeType};base64,${data.audioBase64}`);
        activeAudioRef.current = audio;
        audio.onended = () => {
          aiEndedAtRef.current = Date.now();
          if (!sessionEndedRef.current && voiceStateRef.current === "speaking") {
            setSyncedVoiceState("idle");
          }
        };
        audio.onerror = () => {
          aiEndedAtRef.current = Date.now();
          if (!sessionEndedRef.current && voiceStateRef.current === "speaking") {
            setSyncedVoiceState("idle");
          }
        };
        try {
          await audio.play();
          return;
        } catch {
          // fall back to speechSynthesis if browser blocks audio element
        }
      }

      if (data.aiTranscript && typeof window !== "undefined" && "speechSynthesis" in window) {
        setSyncedVoiceState("speaking");
        const utter = new SpeechSynthesisUtterance(data.aiTranscript);
        utter.rate = 1.02;
        utter.onend = () => {
          aiEndedAtRef.current = Date.now();
          if (!sessionEndedRef.current && voiceStateRef.current === "speaking") {
            setSyncedVoiceState("idle");
          }
        };
        utter.onerror = () => {
          aiEndedAtRef.current = Date.now();
          if (!sessionEndedRef.current && voiceStateRef.current === "speaking") {
            setSyncedVoiceState("idle");
          }
        };
        window.speechSynthesis.speak(utter);
      } else {
        setSyncedVoiceState("idle");
      }
    },
    [setSyncedVoiceState]
  );

  const sendTurn = useCallback(
    async (payload: { audioBase64?: string; textInput?: string }) => {
      if (sessionEndedRef.current || isSendingRef.current) return;
      isSendingRef.current = true;
      setErrorMsg(null);
      setSyncedVoiceState("thinking");

      try {
        const res = await fetch("/api/voice/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: companyName.trim(),
            useCase: useCase.trim(),
            audioBase64: payload.audioBase64,
            textInput: payload.textInput,
            history: historyRef.current,
          }),
        });

        const data = await res.json();
        if (sessionEndedRef.current) return;

        if (!res.ok) {
          setErrorMsg(data.error || "Unable to process voice turn.");
          setSyncedVoiceState("idle");
          return;
        }

        const newEntries: TranscriptEntry[] = [];
        if (data.userTranscript && data.userTranscript !== "(Voice input)") {
          newEntries.push({
            id: `u-${Date.now()}`,
            role: "user",
            text: data.userTranscript,
          });
          historyRef.current.push({ role: "user", text: data.userTranscript });
        }
        if (data.aiTranscript) {
          newEntries.push({
            id: `a-${Date.now() + 1}`,
            role: "assistant",
            text: data.aiTranscript,
          });
          historyRef.current.push({ role: "assistant", text: data.aiTranscript });
        }

        if (newEntries.length > 0) {
          setTranscripts((prev) => [...prev, ...newEntries]);
        }

        await speakResponse(data);
      } catch {
        if (!sessionEndedRef.current) {
          setErrorMsg("Connection interrupted. Keep speaking whenever you're ready.");
          setSyncedVoiceState("idle");
        }
      } finally {
        isSendingRef.current = false;
      }
    },
    [companyName, useCase, speakResponse, setSyncedVoiceState]
  );

  const flushUtterance = useCallback(() => {
    const chunks = utteranceChunksRef.current;
    const sampleRate = inputSampleRateRef.current;
    const peakRms = peakUtteranceRmsRef.current;
    utteranceChunksRef.current = [];
    isSpeakingRef.current = false;
    consecutiveSpeechFramesRef.current = 0;
    peakUtteranceRmsRef.current = 0;

    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    if (
      totalLen < (sampleRate * MIN_UTTERANCE_MS) / 1000 ||
      peakRms < BASE_SPEECH_THRESHOLD * 1.15
    ) {
      if (voiceStateRef.current === "listening") {
        setSyncedVoiceState("idle");
      }
      return;
    }

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    const pcm16 = downsampleTo16kPcm(merged, sampleRate);
    const audioBase64 = int16ToBase64(pcm16);
    void sendTurn({ audioBase64 });
  }, [sendTurn, setSyncedVoiceState]);

  const startLiveMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access is not supported in this browser.");
    }

    // Request mic permission directly inside user click gesture (critical for iOS/Android)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    streamRef.current = stream;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    audioCtxRef.current = ctx;
    inputSampleRateRef.current = ctx.sampleRate;

    // Unlock HTMLAudioElement playback inside the same user gesture for mobile Safari/Chrome
    if (!activeAudioRef.current) {
      activeAudioRef.current = new Audio();
    }

    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (ev) => {
      if (sessionEndedRef.current || isMutedRef.current) {
        setAudioLevel(0);
        return;
      }

      const input = ev.inputBuffer.getChannelData(0);
      const copy = new Float32Array(input);
      let sum = 0;
      for (let i = 0; i < copy.length; i++) {
        sum += copy[i] * copy[i];
      }
      const rms = Math.sqrt(sum / copy.length);
      setAudioLevel(Math.min(1, rms * 5));

      const now = Date.now();

      // Ignore speaker tail/echo right after AI finishes speaking or while thinking
      if (
        isSendingRef.current ||
        voiceStateRef.current === "thinking" ||
        now - aiEndedAtRef.current < POST_AI_COOLDOWN_MS
      ) {
        consecutiveSpeechFramesRef.current = 0;
        return;
      }

      // Keep short pre-roll (~250ms) so start of words isn't clipped
      preRollChunksRef.current.push(copy);
      if (preRollChunksRef.current.length > 3) {
        preRollChunksRef.current.shift();
      }

      const isAiSpeaking = voiceStateRef.current === "speaking";
      const adaptiveThreshold = Math.max(BASE_SPEECH_THRESHOLD, noiseFloorRef.current * 2.8);
      const threshold = isAiSpeaking ? BARGE_IN_THRESHOLD : adaptiveThreshold;
      const requiredFrames = isAiSpeaking ? BARGE_IN_FRAMES : CONSECUTIVE_SPEECH_FRAMES;

      if (!isSpeakingRef.current && !isAiSpeaking && rms < adaptiveThreshold) {
        // Slowly adapt to ambient room noise floor
        noiseFloorRef.current = noiseFloorRef.current * 0.95 + rms * 0.05;
      }

      if (rms > threshold) {
        consecutiveSpeechFramesRef.current += 1;
        if (rms > peakUtteranceRmsRef.current) {
          peakUtteranceRmsRef.current = rms;
        }

        if (!isSpeakingRef.current) {
          if (consecutiveSpeechFramesRef.current >= requiredFrames) {
            // Confirmed sustained human speech
            if (isAiSpeaking) {
              stopAiPlayback();
            }
            isSpeakingRef.current = true;
            utteranceChunksRef.current = [...preRollChunksRef.current];
            lastVoiceTimeRef.current = now;
            setSyncedVoiceState("listening");
          }
        } else {
          utteranceChunksRef.current.push(copy);
          lastVoiceTimeRef.current = now;
        }
      } else {
        consecutiveSpeechFramesRef.current = 0;
        if (isSpeakingRef.current) {
          utteranceChunksRef.current.push(copy);
          if (now - lastVoiceTimeRef.current >= SILENCE_HANGOVER_MS) {
            flushUtterance();
          }
        }
      }
    };

    source.connect(processor);
    processor.connect(ctx.destination);
  }, [flushUtterance, setSyncedVoiceState, stopAiPlayback]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !useCase.trim() || isRequestingMic) return;

    setErrorMsg(null);
    setIsRequestingMic(true);

    try {
      // 1. Ask/verify microphone permission FIRST before starting the timer or session
      await startLiveMicrophone();
    } catch {
      setIsRequestingMic(false);
      setErrorMsg(
        "Microphone permission is required for live hands-free voice. Please allow microphone access in your browser prompt and try again."
      );
      return;
    }

    setIsRequestingMic(false);
    setTranscripts([]);
    setSecondsLeft(SESSION_DURATION_SECONDS);
    historyRef.current = [];
    sessionEndedRef.current = false;
    isMutedRef.current = false;
    setIsMuted(false);

    // 2. Only now enter live mode & start the 1-minute timer
    setStep("live");

    // 3. Trigger opening AI greeting
    await sendTurn({
      textInput: `Start the live voice session for ${companyName.trim()}. Greet the user briefly and begin based on the configured purpose: ${useCase.trim()}.`,
    });
  };

  const toggleMute = () => {
    const next = !isMuted;
    isMutedRef.current = next;
    setIsMuted(next);
    if (next && isSpeakingRef.current) {
      flushUtterance();
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = textDraft.trim();
    if (!text || voiceState === "thinking") return;
    setTextDraft("");
    stopAiPlayback();
    await sendTurn({ textInput: text });
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTimer = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // 5 animated round dots (Gemini Live / ChatGPT Live style)
  const dots = [
    { size: 22, delay: 0, baseX: -52, baseY: -8 },
    { size: 30, delay: 0.12, baseX: -24, baseY: 10 },
    { size: 38, delay: 0.24, baseX: 0, baseY: -6 },
    { size: 30, delay: 0.36, baseX: 26, baseY: 12 },
    { size: 22, delay: 0.48, baseX: 52, baseY: -8 },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1D1D1F] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 apple-glass border-b border-black/8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/voice-studio"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E6E73] hover:text-black"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voice Studio</span>
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

          {step === "live" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black text-white text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span>{formattedTimer}</span>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        {/* STEP 1: Setup Form */}
        {step === "setup" && (
          <div className="w-full max-w-xl apple-card rounded-3xl p-7 sm:p-10 space-y-6">
            <div className="space-y-2 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F5F7] text-[11px] font-mono uppercase tracking-widest text-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>5-Minute Hands-Free Live Voice Preview</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black">
                Configure Your Voice Studio
              </h1>
              <p className="text-sm text-[#6E6E73]">
                Tell us your company name and what your voice AI is for in plain language. We&apos;ll request microphone access and start your live 5-minute call.
              </p>
            </div>

            {errorMsg && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLaunch} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6E6E73]">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., jobshop.ai, Gulf Logistics, Emirates FinTech"
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5F5F7] border border-black/10 text-sm text-black placeholder:text-[#6E6E73]/70 focus:outline-none focus:ring-2 focus:ring-black/20"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#6E6E73]">
                  What is your Voice Studio for? (Recruitment, Sales, or plain language)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset("recruitment");
                      setUseCase(
                        "Recruitment & BPO candidate screening: interview candidates and evaluate their English speaking fluency, clarity, and communication skills."
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedPreset === "recruitment"
                        ? "bg-black text-white border-black"
                        : "bg-[#F5F5F7] text-black border-black/10 hover:bg-black/5"
                    }`}
                  >
                    Recruitment &amp; BPO Screening
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPreset("sales");
                      setUseCase(
                        "Enterprise sales qualification: greet inbound prospects, understand their requirements, and qualify them for a product demo."
                      );
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedPreset === "sales"
                        ? "bg-black text-white border-black"
                        : "bg-[#F5F5F7] text-black border-black/10 hover:bg-black/5"
                    }`}
                  >
                    Sales &amp; Lead Qualification
                  </button>
                </div>

                <textarea
                  required
                  rows={3}
                  value={useCase}
                  onChange={(e) => {
                    setSelectedPreset(null);
                    setUseCase(e.target.value);
                  }}
                  placeholder="Describe in plain language what you want your Voice Studio AI to do..."
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5F5F7] border border-black/10 text-sm text-black placeholder:text-[#6E6E73]/70 focus:outline-none focus:ring-2 focus:ring-black/20 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isRequestingMic}
                className="w-full py-3.5 rounded-full bg-black hover:bg-[#1D1D1F] disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" />
                <span>
                  {isRequestingMic
                    ? "Requesting Microphone Access..."
                    : "Allow Mic & Start Live Voice Studio"}
                </span>
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Hands-Free Live Voice Session with Moving Round Dots */}
        {step === "live" && (
          <div className="w-full max-w-2xl apple-card rounded-3xl p-6 sm:p-10 space-y-7 text-center">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-mono uppercase tracking-wider text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Your Voice Studio is Ready · Talk Live Now</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-black">
                {companyName}
              </h2>
              <p className="text-xs text-[#6E6E73] max-w-md mx-auto line-clamp-2">
                {useCase}
              </p>
            </div>

            {/* Moving Round Dots Orb (Gemini Live / ChatGPT Live style) */}
            <div className="relative h-52 flex items-center justify-center rounded-3xl bg-[#F5F5F7] border border-black/8 overflow-hidden">
              <div className="relative flex items-center justify-center w-64 h-36">
                {dots.map((dot, idx) => {
                  const amp =
                    voiceState === "listening"
                      ? 1 + audioLevel * 0.9
                      : voiceState === "speaking"
                      ? 1.25
                      : voiceState === "thinking"
                      ? 1.1
                      : 1 + audioLevel * 0.35;

                  const yTravel =
                    voiceState === "speaking"
                      ? [dot.baseY, dot.baseY - 22, dot.baseY + 18, dot.baseY]
                      : voiceState === "listening"
                      ? [dot.baseY, dot.baseY - 14 * amp, dot.baseY + 12 * amp, dot.baseY]
                      : voiceState === "thinking"
                      ? [dot.baseY, dot.baseY - 10, dot.baseY + 10, dot.baseY]
                      : [dot.baseY, dot.baseY - 5, dot.baseY + 5, dot.baseY];

                  const xTravel =
                    voiceState === "speaking" || voiceState === "thinking"
                      ? [dot.baseX, dot.baseX + (idx % 2 === 0 ? 10 : -10), dot.baseX]
                      : [dot.baseX, dot.baseX + (idx % 2 === 0 ? 4 : -4), dot.baseX];

                  return (
                    <motion.div
                      key={idx}
                      style={{
                        width: dot.size,
                        height: dot.size,
                      }}
                      animate={{
                        x: xTravel,
                        y: yTravel,
                        scale:
                          voiceState === "speaking"
                            ? [1, 1.32, 0.9, 1.2, 1]
                            : voiceState === "listening"
                            ? [1, 1 + audioLevel * 0.7, 1]
                            : voiceState === "thinking"
                            ? [0.85, 1.18, 0.85]
                            : [1, 1.06, 1],
                      }}
                      transition={{
                        duration:
                          voiceState === "speaking"
                            ? 0.9
                            : voiceState === "listening"
                            ? 0.45
                            : voiceState === "thinking"
                            ? 1.1
                            : 2.6,
                        repeat: Infinity,
                        delay: dot.delay,
                        ease: "easeInOut",
                      }}
                      className="absolute rounded-full bg-black shadow-[0_6px_20px_rgba(0,0,0,0.18)]"
                    />
                  );
                })}
              </div>

              <div className="absolute bottom-3 left-0 right-0 text-[11px] font-mono uppercase tracking-widest text-[#6E6E73]">
                {isMuted
                  ? "Microphone muted"
                  : voiceState === "listening"
                  ? "Hearing you live..."
                  : voiceState === "thinking"
                  ? "Kashfara Voice processing..."
                  : voiceState === "speaking"
                  ? "AI Speaking (speak anytime to interrupt)"
                  : "Live · Just speak naturally"}
              </div>
            </div>

            {errorMsg && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {errorMsg}
              </div>
            )}

            {/* Simple Hands-Free Controls: Mute & End */}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleMute}
                className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-semibold transition-all ${
                  isMuted
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-[#F5F5F7] text-black hover:bg-black/10"
                }`}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMuted ? "Unmute Mic" : "Mic Live (Mute)"}</span>
              </button>

              <button
                type="button"
                onClick={endSession}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-black text-white hover:bg-[#1D1D1F] text-xs font-semibold transition-all"
              >
                <PhoneOff className="w-4 h-4" />
                <span>Stop Call</span>
              </button>
            </div>

            {/* Optional Text Fallback */}
            <form onSubmit={handleTextSubmit} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder="Or type a message anytime..."
                className="flex-1 px-4 py-2.5 rounded-full bg-[#F5F5F7] border border-black/10 text-xs text-black focus:outline-none"
              />
              <button
                type="submit"
                disabled={!textDraft.trim() || voiceState === "thinking"}
                className="p-2.5 rounded-full bg-black text-white disabled:opacity-40"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Live Transcript */}
            {transcripts.length > 0 && (
              <div className="text-left max-h-40 overflow-y-auto space-y-2 pt-3 border-t border-black/8">
                {transcripts.map((t) => (
                  <div
                    key={t.id}
                    className={`text-xs px-3 py-2 rounded-xl ${
                      t.role === "assistant"
                        ? "bg-[#F5F5F7] text-black"
                        : "bg-black text-white ml-8"
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase opacity-60 mr-2">
                      {t.role === "assistant" ? "AI" : "You"}:
                    </span>
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: 1-Minute Timer Expired */}
        {step === "ended" && (
          <div className="w-full max-w-xl apple-card rounded-3xl p-8 sm:p-12 text-center space-y-6">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto">
              <MicOff className="w-5 h-5" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase tracking-widest text-[#6E6E73]">
                5-MINUTE PREVIEW COMPLETE
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-black">
                Ready to Deploy On-Premise Forever?
              </h2>
              <p className="text-sm text-[#6E6E73] leading-relaxed">
                Your 5-minute live preview for <strong className="text-black">{companyName}</strong> has automatically ended. For full enterprise deployment, unlimited voice minutes, and zero vendor lock-in, mail us at{" "}
                <a href="mailto:enquiry@kashfara.com" className="text-black font-semibold underline">
                  enquiry@kashfara.com
                </a>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="mailto:enquiry@kashfara.com?subject=Kashfara%20Voice%20Studio%20Enterprise%20Deployment"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-black text-white hover:bg-[#1D1D1F] text-sm font-semibold shadow-sm"
              >
                <Mail className="w-4 h-4" />
                <span>Mail enquiry@kashfara.com</span>
              </a>
              <button
                type="button"
                onClick={() => setStep("setup")}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full apple-glass text-black hover:bg-[#F5F5F7] text-sm font-medium"
              >
                <span>Try Another Setup</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
