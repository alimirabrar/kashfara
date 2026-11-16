import { NextResponse } from "next/server";
import { AnswerGenerator } from "@/services/qa/answer-generator";
import { NoEligibleProviderError } from "@/services/ai/inference-orchestrator";
import type { DocumentRecord } from "@/types/kashfara";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { question?: string; document?: DocumentRecord };
    const doc = body.document;
    if (!doc) {
      return NextResponse.json({ error: "Missing document payload." }, { status: 400 });
    }

    const question = (body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
    }

    const { userMessage, assistantMessage } = await AnswerGenerator.answerQuestion(
      doc,
      question
    );

    const updatedHistory = [...(doc.qa_history || []), userMessage, assistantMessage];

    return NextResponse.json({
      userMessage,
      assistantMessage,
      qa_history: updatedHistory,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Q&A failed.";
    return NextResponse.json(
      { error: message, reasons: err instanceof NoEligibleProviderError ? err.reasons : undefined },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}
