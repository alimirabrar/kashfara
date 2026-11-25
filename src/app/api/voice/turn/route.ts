import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { GeminiProvider } from "@/services/ai/gemini-provider";

export const maxDuration = 30;

interface VoiceTurnRequest {
  companyName?: string;
  useCase?: string;
  audioBase64?: string; // 16kHz 16-bit little-endian mono PCM
  textInput?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}

const LIVE_MODELS = [
  "models/gemini-2.5-flash-native-audio-preview-12-2025",
  "models/gemini-live-2.5-flash-native-audio",
  "models/gemini-2.0-flash-live-001",
];

function sanitizeOutput(text: string): string {
  return text
    .replace(/gemini/gi, "Kashfara Voice")
    .replace(/google/gi, "Kashfara")
    .trim();
}

function pcm16ToWavBase64(pcmBytes: Uint8Array, sampleRate = 24000): string {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBytes.length;

  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  Buffer.from(pcmBytes).copy(buffer, 44);

  return buffer.toString("base64");
}

function buildSystemPrompt(companyName: string, useCase: string): string {
  return [
    `You are Kashfara Voice Studio, an enterprise voice AI assistant deployed for ${companyName}.`,
    `Your configured purpose is: ${useCase}.`,
    `Speak naturally, concisely, and professionally in 1 to 3 short sentences per turn so the conversation feels like a real-time phone or interview call.`,
    `If the purpose involves recruitment or candidate screening, ask focused interview questions and subtly evaluate clarity and English communication skills.`,
    `If the purpose involves sales, qualify the caller's needs and guide them helpfully.`,
    `If asked what technology powers you, say you are Kashfara Voice Studio, a low-computing on-premise TTS and STT enterprise voice model.`,
  ].join(" ");
}

async function runLiveTurn(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  audioBase64?: string;
  textInput?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}): Promise<{
  audioBase64: string | null;
  aiTranscript: string;
  userTranscript: string;
}> {
  return new Promise((resolve, reject) => {
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
      params.apiKey
    )}`;

    const ws = new WebSocket(url);
    const pcmChunks: Buffer[] = [];
    let aiTranscript = "";
    let userTranscript = "";
    let setupSent = false;
    let turnSent = false;
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          ws.close();
        } catch {
          // ignore
        }
        if (pcmChunks.length > 0 || aiTranscript.trim()) {
          const combined = Buffer.concat(pcmChunks);
          resolve({
            audioBase64: combined.length > 0 ? pcm16ToWavBase64(combined, 24000) : null,
            aiTranscript: sanitizeOutput(aiTranscript),
            userTranscript: sanitizeOutput(userTranscript),
          });
        } else {
          reject(new Error("Voice session timed out"));
        }
      }
    }, 15000);

    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        ws.close();
      } catch {
        // ignore
      }
      if (err) {
        reject(err);
      } else {
        const combined = Buffer.concat(pcmChunks);
        resolve({
          audioBase64: combined.length > 0 ? pcm16ToWavBase64(combined, 24000) : null,
          aiTranscript: sanitizeOutput(aiTranscript),
          userTranscript: sanitizeOutput(userTranscript),
        });
      }
    };

    ws.onopen = () => {
      if (setupSent) return;
      setupSent = true;
      const setupMsg = {
        setup: {
          model: params.model,
          generationConfig: {
            responseModalities: ["AUDIO"],
          },
          systemInstruction: {
            parts: [{ text: params.systemPrompt }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };
      ws.send(JSON.stringify(setupMsg));
    };

    ws.onmessage = async (event) => {
      try {
        const raw =
          typeof event.data === "string"
            ? event.data
            : event.data instanceof Blob
            ? await event.data.text()
            : Buffer.from(event.data as ArrayBuffer).toString("utf8");
        const msg = JSON.parse(raw);

        if (msg.setupComplete && !turnSent) {
          turnSent = true;

          // Replay brief prior context if any
          if (params.history && params.history.length > 0) {
            const turns = params.history.slice(-6).map((h) => ({
              role: h.role === "assistant" ? "model" : "user",
              parts: [{ text: h.text }],
            }));
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns,
                  turnComplete: false,
                },
              })
            );
          }

          if (params.audioBase64) {
            // Send audio in chunks of ~32KB base64 for smooth streaming
            const chunkSize = 32768;
            for (let i = 0; i < params.audioBase64.length; i += chunkSize) {
              const slice = params.audioBase64.slice(i, i + chunkSize);
              ws.send(
                JSON.stringify({
                  realtimeInput: {
                    mediaChunks: [
                      {
                        mimeType: "audio/pcm;rate=16000",
                        data: slice,
                      },
                    ],
                  },
                })
              );
            }
            ws.send(
              JSON.stringify({
                realtimeInput: {
                  audioStreamEnd: true,
                },
              })
            );
          } else if (params.textInput) {
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [{ role: "user", parts: [{ text: params.textInput }] }],
                  turnComplete: true,
                },
              })
            );
          }
          return;
        }

        const sc = msg.serverContent;
        if (sc) {
          if (sc.inputTranscription?.text) {
            userTranscript += sc.inputTranscription.text;
          }
          if (sc.outputTranscription?.text) {
            aiTranscript += sc.outputTranscription.text;
          }
          if (sc.modelTurn?.parts && Array.isArray(sc.modelTurn.parts)) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData?.data) {
                pcmChunks.push(Buffer.from(part.inlineData.data, "base64"));
              }
              if (part.text) {
                aiTranscript += part.text;
              }
            }
          }
          if (sc.turnComplete) {
            finish();
          }
        }
      } catch {
        // ignore parse issues on partial frames
      }
    };

    ws.onerror = () => {
      finish(new Error("Voice Live connection error"));
    };

    ws.onclose = (ev) => {
      if (!settled) {
        if (pcmChunks.length > 0 || aiTranscript.trim()) {
          finish();
        } else {
          finish(new Error(`Voice Live closed (${ev.code})`));
        }
      }
    };
  });
}

async function runRestFallback(params: {
  apiKey: string;
  baseUrl: string;
  systemPrompt: string;
  audioBase64?: string;
  textInput?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}): Promise<{ aiTranscript: string; userTranscript: string }> {
  const models = await GeminiProvider.getAvailableModels();
  const model = models[0] || "gemini-2.5-flash";

  const contents: Array<{ role: "user" | "model"; parts: Array<Record<string, unknown>> }> = [];
  if (params.history) {
    for (const h of params.history.slice(-6)) {
      contents.push({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.text }],
      });
    }
  }

  const userParts: Array<Record<string, unknown>> = [];
  if (params.audioBase64) {
    const pcmBytes = Buffer.from(params.audioBase64, "base64");
    const wavBase64 = pcm16ToWavBase64(pcmBytes, 16000);
    userParts.push({
      inline_data: {
        mime_type: "audio/wav",
        data: wavBase64,
      },
    });
    userParts.push({
      text: "Listen to the user's voice message and respond naturally in 1-3 short spoken sentences.",
    });
  } else if (params.textInput) {
    userParts.push({ text: params.textInput });
  }

  contents.push({ role: "user", parts: userParts });

  const url = `${params.baseUrl}/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Kashfara Voice engine unavailable (${res.status})`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((p: { text?: string }) => p.text || "").join("")
    : "";

  return {
    aiTranscript: sanitizeOutput(text || "I heard you clearly. Please continue."),
    userTranscript: params.textInput || "(Voice input)",
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VoiceTurnRequest;
    const companyName = (body.companyName || "Enterprise Client").trim().slice(0, 120);
    const useCase = (body.useCase || "Enterprise voice assistant").trim().slice(0, 400);

    if (!body.audioBase64 && !body.textInput) {
      return NextResponse.json(
        { error: "Audio or text input is required." },
        { status: 400 }
      );
    }

    const cfg = getConfig();
    if (!cfg.geminiApiKey) {
      return NextResponse.json(
        { error: "Kashfara Voice engine is not configured." },
        { status: 503 }
      );
    }

    const systemPrompt = buildSystemPrompt(companyName, useCase);

    // 1. Primary: Live bidirectional audio session on server
    for (const model of LIVE_MODELS) {
      try {
        const liveRes = await runLiveTurn({
          apiKey: cfg.geminiApiKey,
          model,
          systemPrompt,
          audioBase64: body.audioBase64,
          textInput: body.textInput,
          history: body.history,
        });
        if (liveRes.audioBase64 || liveRes.aiTranscript) {
          return NextResponse.json({
            audioBase64: liveRes.audioBase64,
            mimeType: liveRes.audioBase64 ? "audio/wav" : null,
            aiTranscript: liveRes.aiTranscript || "Response ready.",
            userTranscript: liveRes.userTranscript || body.textInput || "(Voice message)",
            useBrowserTts: !liveRes.audioBase64,
            engine: "kashfara-voice-1.0",
          });
        }
      } catch {
        // Try next live model or fall back to REST audio
      }
    }

    // 2. Fallback: Multimodal REST audio -> text + client TTS
    const restRes = await runRestFallback({
      apiKey: cfg.geminiApiKey,
      baseUrl: cfg.geminiBaseUrl,
      systemPrompt,
      audioBase64: body.audioBase64,
      textInput: body.textInput,
      history: body.history,
    });

    return NextResponse.json({
      audioBase64: null,
      mimeType: null,
      aiTranscript: restRes.aiTranscript,
      userTranscript: restRes.userTranscript,
      useBrowserTts: true,
      engine: "kashfara-voice-1.0",
    });
  } catch (err) {
    const msg = err instanceof Error ? sanitizeOutput(err.message) : "Voice processing failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
