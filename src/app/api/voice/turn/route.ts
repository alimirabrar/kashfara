import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { GeminiProvider } from "@/services/ai/gemini-provider";
import { GroqFallback } from "@/services/ai/groq-fallback";

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
];

function sanitizeOutput(text: string): string {
  return text
    .replace(/gemini/gi, "Kashfara Voice")
    .replace(/google/gi, "Kashfara")
    .replace(/groq/gi, "Kashfara")
    .replace(/llama/gi, "Kashfara")
    .trim();
}

function pcm16ToWavBuffer(pcmBytes: Uint8Array, sampleRate = 24000): Buffer {
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
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  Buffer.from(pcmBytes).copy(buffer, 44);

  return buffer;
}

function pcm16ToWavBase64(pcmBytes: Uint8Array, sampleRate = 24000): string {
  return pcm16ToWavBuffer(pcmBytes, sampleRate).toString("base64");
}

function buildSystemPrompt(companyName: string, useCase: string): string {
  return [
    `You are Kashfara Voice Studio, an enterprise voice AI assistant deployed for ${companyName}.`,
    `Your configured purpose is: ${useCase}.`,
    `Speak naturally, concisely, and professionally in 1 to 2 short sentences per turn so the conversation feels like a real-time phone or interview call.`,
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
    let receivedFirstOutput = false;
    let settled = false;

    // Fast 4.5s timeout if handshake/first response stalls
    const firstByteTimeout = setTimeout(() => {
      if (!settled && !receivedFirstOutput) {
        settled = true;
        try {
          ws.close();
        } catch {
          // ignore
        }
        reject(new Error("Voice Live handshake timed out"));
      }
    }, 4500);

    // Generous 15s total timeout once streaming has started so audio isn't cut at 5s
    const totalTimeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        clearTimeout(firstByteTimeout);
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
      clearTimeout(firstByteTimeout);
      clearTimeout(totalTimeout);
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
      ws.send(
        JSON.stringify({
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
        })
      );
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
            receivedFirstOutput = true;
            clearTimeout(firstByteTimeout);
            aiTranscript += sc.outputTranscription.text;
          }
          if (sc.modelTurn?.parts && Array.isArray(sc.modelTurn.parts)) {
            for (const part of sc.modelTurn.parts) {
              if (part.inlineData?.data) {
                receivedFirstOutput = true;
                clearTimeout(firstByteTimeout);
                pcmChunks.push(Buffer.from(part.inlineData.data, "base64"));
              }
              if (part.text) {
                receivedFirstOutput = true;
                clearTimeout(firstByteTimeout);
                aiTranscript += part.text;
              }
            }
          }
          if (sc.turnComplete) {
            finish();
          }
        }
      } catch {
        // ignore partial frame parse errors
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
      text: "Respond naturally and concisely to the user's voice message in 1-2 short spoken sentences.",
    });
  } else if (params.textInput) {
    userParts.push({ text: params.textInput });
  }

  contents.push({ role: "user", parts: userParts });

  const candidateModels = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  for (const model of candidateModels) {
    try {
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
            maxOutputTokens: 180,
          },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts;
        const text = Array.isArray(parts)
          ? parts.map((p: { text?: string }) => p.text || "").join("")
          : "";
        if (text.trim()) {
          return {
            aiTranscript: sanitizeOutput(text),
            userTranscript: params.textInput || "(Voice input)",
          };
        }
      }
    } catch {
      // try next candidate
    }
  }

  // Last-resort discovered model
  const models = await GeminiProvider.getAvailableModels();
  for (const model of models.slice(0, 2)) {
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
        generationConfig: { temperature: 0.5, maxOutputTokens: 180 },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.map((p: { text?: string }) => p.text || "").join("")
        : "";
      if (text.trim()) {
        return {
          aiTranscript: sanitizeOutput(text),
          userTranscript: params.textInput || "(Voice input)",
        };
      }
    }
  }

  throw new Error("Kashfara Voice REST engine unavailable");
}

async function runGroqVoiceFallback(params: {
  systemPrompt: string;
  audioBase64?: string;
  textInput?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
}): Promise<{ aiTranscript: string; userTranscript: string }> {
  const cfg = getConfig();
  if (!cfg.groqApiKey) {
    throw new Error("Secondary voice engine not configured");
  }

  let userText = params.textInput || "";

  if (params.audioBase64 && !userText) {
    const pcmBytes = Buffer.from(params.audioBase64, "base64");
    const wavBuffer = pcm16ToWavBuffer(pcmBytes, 16000);
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" }),
      "audio.wav"
    );
    form.append("model", "whisper-large-v3-turbo");

    const sttRes = await fetch(`${cfg.groqBaseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.groqApiKey}` },
      body: form,
      signal: AbortSignal.timeout(10000),
    });
    if (sttRes.ok) {
      const sttData = (await sttRes.json()) as { text?: string };
      userText = (sttData.text || "").trim();
    }
  }

  if (!userText) {
    return {
      aiTranscript: "I didn't catch that clearly. Could you please repeat?",
      userTranscript: "(Audio unclear)",
    };
  }

  const messages = [
    { role: "system" as const, content: params.systemPrompt },
    ...(params.history || []).slice(-6).map((h) => ({
      role: h.role,
      content: h.text,
    })),
    { role: "user" as const, content: userText },
  ];

  const chatRes = await GroqFallback.chatCompletion({
    model: "llama-3.3-70b-versatile",
    messages,
    temperature: 0.5,
    max_tokens: 180,
    timeoutMs: 10000,
  });

  return {
    aiTranscript: sanitizeOutput(chatRes.content || "Please continue."),
    userTranscript: sanitizeOutput(userText),
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
    if (!cfg.geminiApiKey && !cfg.groqApiKey) {
      return NextResponse.json(
        { error: "Kashfara Voice engine is not configured." },
        { status: 503 }
      );
    }

    const systemPrompt = buildSystemPrompt(companyName, useCase);

    // 1. Primary: Live bidirectional audio session on server
    if (cfg.geminiApiKey) {
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
      try {
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
      } catch {
        // Fall through to secondary STT+LLM engine
      }
    }

    // 3. Secondary Fallback: Whisper STT + Fast Chat
    const groqRes = await runGroqVoiceFallback({
      systemPrompt,
      audioBase64: body.audioBase64,
      textInput: body.textInput,
      history: body.history,
    });

    return NextResponse.json({
      audioBase64: null,
      mimeType: null,
      aiTranscript: groqRes.aiTranscript,
      userTranscript: groqRes.userTranscript,
      useBrowserTts: true,
      engine: "kashfara-voice-1.0",
    });
  } catch (err) {
    const msg = err instanceof Error ? sanitizeOutput(err.message) : "Voice processing failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
