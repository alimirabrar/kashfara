import { NextResponse } from "next/server";
import { store } from "@/services/storage/store";
import { AnswerGenerator } from "@/services/qa/answer-generator";
import { NoEligibleProviderError } from "@/services/ai/inference-orchestrator";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const doc = await store.getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const body = (await req.json()) as { question?: string };
    const question = (body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "Question cannot be empty." }, { status: 400 });
    }

    const { userMessage, assistantMessage } = await AnswerGenerator.answerQuestion(
      doc,
      question
    );

    doc.qa_history.push(userMessage, assistantMessage);
    doc.updated_at = new Date().toISOString();
    await store.saveDocument(doc);

    return NextResponse.json({
      userMessage,
      assistantMessage,
      qa_history: doc.qa_history,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Q&A failed.";
    return NextResponse.json(
      { error: message, reasons: err instanceof NoEligibleProviderError ? err.reasons : undefined },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}
