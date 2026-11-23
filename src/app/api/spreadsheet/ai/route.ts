import { NextResponse } from "next/server";
import { GroqFallback, sanitizeGroqLabel } from "@/services/ai/groq-fallback";
import { extractJsonFromText } from "@/services/ai/inference-orchestrator";

export const maxDuration = 60;

interface CellUpdate {
  row: number; // 0-based
  col: number; // 0-based
  value: string;
}

interface SpreadsheetAiPayload {
  reply?: string;
  cell_value?: string;
  updates?: CellUpdate[];
  new_columns?: Array<{ header: string; values: string[] }>;
  new_rows?: string[][];
  analysis_report?: {
    title: string;
    summary: string;
    metrics: Array<{ label: string; value: string }>;
    insights: string[];
    anomalies: string[];
  };
}

function colIndexToLetter(col: number): string {
  let s = "";
  let n = col;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function formatGridContext(
  sheetName: string,
  grid: string[][],
  selection?: { startRow: number; startCol: number; endRow: number; endCol: number }
): string {
  const maxRows = Math.min(grid.length, 60);
  const maxCols = Math.min(grid[0]?.length || 0, 20);
  const lines: string[] = [`Sheet: ${sheetName} (${grid.length} rows x ${grid[0]?.length || 0} cols)`];

  if (selection) {
    const r1 = `${colIndexToLetter(selection.startCol)}${selection.startRow + 1}`;
    const r2 = `${colIndexToLetter(selection.endCol)}${selection.endRow + 1}`;
    lines.push(`Active Selection: ${r1}:${r2} (0-based rows ${selection.startRow}..${selection.endRow}, cols ${selection.startCol}..${selection.endCol})`);
  }

  const colHeaders = Array.from({ length: maxCols }, (_, c) => `${c}:${colIndexToLetter(c)}`).join(" | ");
  lines.push(`Columns (index:letter): ${colHeaders}`);

  for (let r = 0; r < maxRows; r++) {
    const rowVals = grid[r].slice(0, maxCols).map((v) => String(v ?? "").replace(/\n/g, " "));
    if (rowVals.some((v) => v !== "")) {
      lines.push(`R${r} (${r + 1}): ${JSON.stringify(rowVals)}`);
    }
  }

  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    if (!GroqFallback.isConfigured()) {
      return NextResponse.json(
        { error: "Kashfara Spreadsheet Engine is not configured (missing GROQ_API_KEY)." },
        { status: 503 }
      );
    }

    const body = (await req.json()) as {
      mode: "cell_formula" | "agent_chat";
      prompt: string;
      sheet_name: string;
      grid: string[][];
      target_cell?: { row: number; col: number };
      selection?: { startRow: number; startCol: number; endRow: number; endCol: number };
    };

    const gridContext = formatGridContext(body.sheet_name || "Sheet1", body.grid || [], body.selection);
    const models = await GroqFallback.getAvailableModels();

    const systemPrompt =
      body.mode === "cell_formula"
        ? `You are KASHFARA SPREADSHEET AI. The user typed an in-cell AI formula "k= ..." at 0-based cell (row=${body.target_cell?.row ?? 0}, col=${body.target_cell?.col ?? 0}, ref=${colIndexToLetter(body.target_cell?.col ?? 0)}${(body.target_cell?.row ?? 0) + 1}).
Evaluate the prompt using the spreadsheet data provided.
Return ONLY valid JSON:
{
  "cell_value": "exact computed string/number result for this cell",
  "reply": "brief 1-line explanation"
}`
        : `You are KASHFARA SPREADSHEET AGENT, an enterprise financial, banking, and data analysis spreadsheet copilot.
You can:
1. Edit existing cells via "updates": [{"row": 0-based, "col": 0-based, "value": "string"}].
2. Add computed columns via "new_columns": [{"header": "Column Name", "values": ["row1_val", "row2_val", ...]}] (values align starting from row index 1 if row 0 is header, or specify exact updates).
3. Add rows via "new_rows": [["c0", "c1", ...]].
4. Generate a structured "analysis_report" when the user asks for data analysis, audit, summary, or insights.
Always use 0-based row and col indices matching the grid provided. Preserve Arabic and English text faithfully.

Return ONLY valid JSON:
{
  "reply": "Clear summary of actions taken or answer",
  "updates": [{"row": 1, "col": 2, "value": "123.45"}],
  "new_columns": [],
  "new_rows": [],
  "analysis_report": {
    "title": "Report Title",
    "summary": "Executive summary",
    "metrics": [{"label": "Metric", "value": "Value"}],
    "insights": ["Insight 1"],
    "anomalies": ["Anomaly 1"]
  }
}
(Omit "analysis_report" if the user only asked for a cell/column edit.)`;

    let lastErr = "Kashfara Spreadsheet Engine failed.";
    for (const model of models) {
      try {
        const res = await GroqFallback.chatCompletion({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `USER REQUEST:\n${body.prompt}\n\nSPREADSHEET DATA:\n${gridContext}` },
          ],
          temperature: 0.1,
          max_tokens: 4000,
          json_mode: true,
          timeoutMs: 25_000,
        });

        const parsed = extractJsonFromText<SpreadsheetAiPayload>(res.content);
        if (!parsed) {
          lastErr = `[${sanitizeGroqLabel(model)}] Invalid structured response`;
          continue;
        }

        return NextResponse.json({
          ...parsed,
          engine: sanitizeGroqLabel(model),
          latency_ms: res.latency_ms,
        });
      } catch (err) {
        lastErr = err instanceof Error ? err.message : String(err);
      }
    }

    return NextResponse.json({ error: lastErr }, { status: 503 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Spreadsheet AI error." },
      { status: 500 }
    );
  }
}
