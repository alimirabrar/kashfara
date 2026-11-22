import { NextResponse } from "next/server";
import { InferenceOrchestrator, NoEligibleProviderError } from "@/services/ai/inference-orchestrator";
import { formatPagesForReasoning } from "@/services/documents/page-formatter";
import type { AtsResult, DocumentRecord } from "@/types/kashfara";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      document?: DocumentRecord;
      job_description?: string;
    };

    const doc = body.document;
    const jd = (body.job_description || "").trim();
    if (!doc) {
      return NextResponse.json({ error: "Missing document payload." }, { status: 400 });
    }
    if (!jd) {
      return NextResponse.json({ error: "Please provide a Job Description to score." }, { status: 400 });
    }

    const resumeContext = doc.intelligence?.data
      ? JSON.stringify(doc.intelligence.data, null, 2)
      : formatPagesForReasoning(doc.pages.slice(0, 5));

    const systemPrompt = `You are KASHFARA VISION's ATS (Applicant Tracking System) & Candidate Scoring Engine.
Compare the candidate's parsed resume against the provided Job Description objectively.
Return ONLY valid JSON:
{
  "score": number (0 to 100),
  "verdict": "Strong Match | Good Match | Partial Match | Low Match",
  "matched_skills": ["skill1", "skill2"],
  "missing_skills": ["skill3"],
  "strengths": ["concise strength 1", "concise strength 2"],
  "gaps": ["concise gap 1"],
  "recommendations": ["actionable recommendation 1"],
  "breakdown": {
    "skills_match": 0-100,
    "experience_relevance": 0-100,
    "role_alignment": 0-100
  }
}`;

    const res = await InferenceOrchestrator.runTask<AtsResult>({
      task: "field_normalisation",
      documentId: doc.id,
      systemPrompt,
      userPrompt: `JOB DESCRIPTION:\n${jd.slice(0, 4000)}\n\nPARSED RESUME:\n${resumeContext.slice(0, 6000)}`,
      expectJson: true,
      maxTokens: 2048,
      pagesCount: 1,
    });

    const ats: AtsResult = {
      score: Math.max(0, Math.min(100, Number(res.parsed?.score ?? 0))),
      verdict: res.parsed?.verdict || "Evaluated",
      matched_skills: Array.isArray(res.parsed?.matched_skills) ? res.parsed!.matched_skills.map(String) : [],
      missing_skills: Array.isArray(res.parsed?.missing_skills) ? res.parsed!.missing_skills.map(String) : [],
      strengths: Array.isArray(res.parsed?.strengths) ? res.parsed!.strengths.map(String) : [],
      gaps: Array.isArray(res.parsed?.gaps) ? res.parsed!.gaps.map(String) : [],
      recommendations: Array.isArray(res.parsed?.recommendations) ? res.parsed!.recommendations.map(String) : [],
      breakdown: res.parsed?.breakdown,
    };

    return NextResponse.json({
      ats,
      diagnostics: res.diagnostics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ATS scoring failed.";
    return NextResponse.json(
      {
        error: message,
        reasons: err instanceof NoEligibleProviderError ? err.reasons : undefined,
        diagnostics: err instanceof NoEligibleProviderError ? err.diagnostics : undefined,
      },
      { status: err instanceof NoEligibleProviderError ? 503 : 500 }
    );
  }
}
