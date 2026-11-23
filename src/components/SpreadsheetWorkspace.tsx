"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
  Undo2,
  Upload,
} from "lucide-react";
import { parseApiResponse } from "@/lib/api-response";
import { cn } from "@/lib/utils";

interface SheetData {
  name: string;
  grid: string[][];
}

interface CellStyle {
  bg_color?: string;
  text_color?: string;
  bold?: boolean;
}

interface SelectionRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

interface ChartSpec {
  type: "bar" | "pie";
  title: string;
  data: Array<{ label: string; value: number }>;
}

interface AnalysisReport {
  title: string;
  summary: string;
  metrics: Array<{ label: string; value: string }>;
  insights: string[];
  anomalies: string[];
}

interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  chart?: ChartSpec | null;
  report?: AnalysisReport | null;
  engine?: string;
}

const INITIAL_GRID: string[][] = [
  ["Vendor / Entity", "Category", "Currency", "Net Amount", "VAT (5%)", "Status", "Notes"],
  ["Emirates Logistics LLC", "Supply Chain", "AED", "120000", "6000", "Cleared", "Q4 Port Settlement"],
  ["شركة المدار للتجارة", "Procurement", "SAR", "85500", "4275", "Pending", "Riyadh Branch Invoice"],
  ["Gulf Clearing House", "Treasury", "USD", "42000", "2100", "Cleared", "Wire Ref #99412"],
  ["Al Noor Medical Supplies", "Healthcare", "AED", "31800", "1590", "Review", "Duplicate check needed"],
  ["Desert Cloud Systems", "IT & Infra", "AED", "19400", "970", "Cleared", "Annual License"],
  ["", "", "", "", "", "", ""],
  ["", "", "", "", "", "", ""],
  ["", "", "", "", "", "", ""],
  ["", "", "", "", "", "", ""],
];

const CHART_PALETTE = ["#111827", "#374151", "#059669", "#D97706", "#2563EB", "#7C3AED", "#DC2626"];

function padGrid(raw: string[][], minRows = 16, minCols = 10): string[][] {
  const rows = Math.max(minRows, raw.length);
  const cols = Math.max(minCols, ...raw.map((r) => r.length));
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => String(raw[r]?.[c] ?? ""))
  );
}

function colLetter(col: number): string {
  let s = "";
  let n = col;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function letterToCol(letters: string): number {
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  return col - 1;
}

function evalBasicFormula(expr: string, grid: string[][]): string | null {
  const m = expr.trim().match(/^=(SUM|AVG|AVERAGE|COUNT|MIN|MAX)\(([A-Z]+\d+):([A-Z]+\d+)\)$/i);
  if (!m) return null;
  const fn = m[1].toUpperCase();
  const parseRef = (ref: string) => {
    const rm = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!rm) return null;
    return { col: letterToCol(rm[1].toUpperCase()), row: Number(rm[2]) - 1 };
  };
  const a = parseRef(m[2]);
  const b = parseRef(m[3]);
  if (!a || !b) return null;

  const nums: number[] = [];
  for (let r = Math.min(a.row, b.row); r <= Math.max(a.row, b.row); r++) {
    for (let c = Math.min(a.col, b.col); c <= Math.max(a.col, b.col); c++) {
      const n = Number(String(grid[r]?.[c] ?? "").replace(/,/g, ""));
      if (Number.isFinite(n) && String(grid[r]?.[c] ?? "").trim() !== "") nums.push(n);
    }
  }
  if (nums.length === 0) return "0";
  if (fn === "SUM") return String(nums.reduce((s, v) => s + v, 0));
  if (fn === "AVG" || fn === "AVERAGE") return (nums.reduce((s, v) => s + v, 0) / nums.length).toFixed(2);
  if (fn === "COUNT") return String(nums.length);
  if (fn === "MIN") return String(Math.min(...nums));
  if (fn === "MAX") return String(Math.max(...nums));
  return null;
}

function ChartCard({ chart }: { chart: ChartSpec }) {
  const items = (chart.data || []).filter((d) => Number.isFinite(Number(d.value)) && Number(d.value) > 0);
  if (items.length === 0) return null;
  const total = items.reduce((s, d) => s + Number(d.value), 0);
  const maxVal = Math.max(...items.map((d) => Number(d.value)));

  if (chart.type === "pie") {
    const segments = items.map((d, idx) => {
      const val = Number(d.value);
      const pct = (val / total) * 100;
      const start = items
        .slice(0, idx)
        .reduce((acc, prev) => acc + (Number(prev.value) / total) * 100, 0);
      return {
        ...d,
        val,
        pct,
        color: CHART_PALETTE[idx % CHART_PALETTE.length],
        start,
      };
    });

    const gradientStops = segments
      .map((s) => `${s.color} ${s.start.toFixed(2)}% ${(s.start + s.pct).toFixed(2)}%`)
      .join(", ");

    return (
      <div className="mt-2 p-3 rounded-xl bg-[#F5F5F7] border border-black/10 space-y-3">
        <div className="text-[11px] font-semibold text-black">{chart.title}</div>
        <div className="flex items-center gap-4">
          <div
            className="w-24 h-24 rounded-full shrink-0 border border-black/10 shadow-inner"
            style={{ background: `conic-gradient(${gradientStops})` }}
          />
          <div className="flex-1 space-y-1 text-[10px] min-w-0">
            {segments.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate text-black">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate">{s.label}</span>
                </span>
                <span className="font-mono text-[#6E6E73] shrink-0">
                  {s.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-xl bg-[#F5F5F7] border border-black/10 space-y-2">
      <div className="text-[11px] font-semibold text-black">{chart.title}</div>
      <div className="space-y-1.5">
        {items.map((d, i) => {
          const wPct = Math.max(4, Math.round((Number(d.value) / maxVal) * 100));
          return (
            <div key={i} className="space-y-0.5 text-[10px]">
              <div className="flex justify-between text-black">
                <span className="truncate pr-2">{d.label}</span>
                <span className="font-mono text-[#6E6E73]">{Number(d.value).toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${wPct}%`,
                    backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const QUICK_PROMPTS = [
  "Generate a pie chart & data analysis report on Net Amounts",
  "Color Status column green for Cleared, amber for Pending, red for Review",
  "Add a Gross Total column (Net Amount + VAT) for all rows",
  "Translate Arabic text in column A to English in a new column",
];

export function SpreadsheetWorkspace() {
  const [sheets, setSheets] = useState<SheetData[]>([
    { name: "GCC_Ledger", grid: padGrid(INITIAL_GRID) },
  ]);
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [cellStyles, setCellStyles] = useState<Record<string, CellStyle>>({});
  const [undoStack, setUndoStack] = useState<string[][][]>([]);

  const [selection, setSelection] = useState<SelectionRange>({
    startRow: 0,
    startCol: 0,
    endRow: 0,
    endCol: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [cellBusyKey, setCellBusyKey] = useState<string | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFull, setSidebarFull] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const resizingRef = useRef(false);

  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        'Select any cells or type `k= <prompt>` directly inside any cell (e.g. `k= sum D2:D6`). Ask me to color cells, build bar/pie charts, edit rows, or generate a data analysis report.',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const activeSheet = sheets[activeSheetIdx] || sheets[0];
  const grid = activeSheet.grid;

  const normSel = useMemo(
    () => ({
      startRow: Math.min(selection.startRow, selection.endRow),
      endRow: Math.max(selection.startRow, selection.endRow),
      startCol: Math.min(selection.startCol, selection.endCol),
      endCol: Math.max(selection.startCol, selection.endCol),
    }),
    [selection]
  );

  const selectionLabel =
    normSel.startRow === normSel.endRow && normSel.startCol === normSel.endCol
      ? `${colLetter(normSel.startCol)}${normSel.startRow + 1}`
      : `${colLetter(normSel.startCol)}${normSel.startRow + 1}:${colLetter(normSel.endCol)}${normSel.endRow + 1}`;

  const activeCellValue = grid[selection.startRow]?.[selection.startCol] ?? "";

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      void rootRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  function updateGrid(mutator: (prev: string[][]) => string[][]) {
    setUndoStack((u) => [...u.slice(-19), grid.map((r) => [...r])]);
    setSheets((prev) =>
      prev.map((s, idx) => (idx === activeSheetIdx ? { ...s, grid: mutator(s.grid) } : s))
    );
  }

  function handleUndo() {
    if (undoStack.length === 0) return;
    const last = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setSheets((prev) =>
      prev.map((s, idx) => (idx === activeSheetIdx ? { ...s, grid: last } : s))
    );
  }

  async function commitCellValue(row: number, col: number, rawVal: string) {
    const trimmed = rawVal.trim();

    if (trimmed.startsWith("=")) {
      const computed = evalBasicFormula(trimmed, grid);
      updateGrid((g) => {
        const next = g.map((r) => [...r]);
        next[row][col] = computed !== null ? computed : rawVal;
        return next;
      });
      return;
    }

    if (/^k\s*=/i.test(trimmed)) {
      const aiPrompt = trimmed.replace(/^k\s*=/i, "").trim();
      if (!aiPrompt) return;
      const key = `${row}:${col}`;
      setCellBusyKey(key);
      try {
        const res = await fetch("/api/spreadsheet/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "cell_formula",
            prompt: aiPrompt,
            sheet_name: activeSheet.name,
            grid,
            target_cell: { row, col },
            selection: normSel,
          }),
        });
        const json = await parseApiResponse(res);
        updateGrid((g) => {
          const next = g.map((r) => [...r]);
          next[row][col] =
            res.ok && json.cell_value !== undefined
              ? String(json.cell_value)
              : `ERR: ${json.error || "Failed"}`;
          return next;
        });
      } finally {
        setCellBusyKey(null);
      }
      return;
    }

    updateGrid((g) => {
      const next = g.map((r) => [...r]);
      next[row][col] = rawVal;
      return next;
    });
  }

  async function handleImportFile(file: File) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const imported: SheetData[] = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name];
      const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false });
      const strRows = rows.map((r) => r.map((c) => (c == null ? "" : String(c))));
      return { name, grid: padGrid(strRows) };
    });
    if (imported.length > 0) {
      setSheets(imported);
      setActiveSheetIdx(0);
      setCellStyles({});
      setUndoStack([]);
      setSelection({ startRow: 0, startCol: 0, endRow: 0, endCol: 0 });
    }
  }

  function handleExport(format: "xlsx" | "csv") {
    const trimRows = (g: string[][]) => {
      let lastR = 0;
      let lastC = 0;
      g.forEach((row, r) =>
        row.forEach((val, c) => {
          if (val !== "") {
            lastR = Math.max(lastR, r);
            lastC = Math.max(lastC, c);
          }
        })
      );
      return g.slice(0, lastR + 1).map((r) => r.slice(0, lastC + 1));
    };

    const wb = XLSX.utils.book_new();
    sheets.forEach((s) => {
      const ws = XLSX.utils.aoa_to_sheet(trimRows(s.grid));
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
    });

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]]);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeSheet.name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      XLSX.writeFile(wb, `${activeSheet.name}.xlsx`);
    }
  }

  async function sendAgentPrompt(promptText: string) {
    const clean = promptText.trim();
    if (!clean || chatBusy) return;
    setChatInput("");
    setChatBusy(true);

    const userMsg: ChatItem = { id: `u_${Date.now()}`, role: "user", content: clean };
    setChatHistory((h) => [...h, userMsg]);

    try {
      const res = await fetch("/api/spreadsheet/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "agent_chat",
          prompt: clean,
          sheet_name: activeSheet.name,
          grid,
          selection: normSel,
        }),
      });
      const json = await parseApiResponse(res);
      if (!res.ok) throw new Error(json.error || "Spreadsheet AI failed.");

      if (Array.isArray(json.cell_styles) && json.cell_styles.length > 0) {
        setCellStyles((prev) => {
          const next = { ...prev };
          for (const st of json.cell_styles as Array<{
            row: number;
            col: number;
            bg_color?: string;
            text_color?: string;
            bold?: boolean;
          }>) {
            if (st.row >= 0 && st.col >= 0) {
              next[`${activeSheetIdx}:${st.row}:${st.col}`] = {
                bg_color: st.bg_color,
                text_color: st.text_color,
                bold: st.bold,
              };
            }
          }
          return next;
        });
      }

      const hasUpdates =
        (Array.isArray(json.updates) && json.updates.length > 0) ||
        (Array.isArray(json.new_columns) && json.new_columns.length > 0) ||
        (Array.isArray(json.new_rows) && json.new_rows.length > 0);

      if (hasUpdates) {
        updateGrid((prev) => {
          let next = prev.map((r) => [...r]);

          if (Array.isArray(json.updates)) {
            for (const u of json.updates as Array<{ row: number; col: number; value: string }>) {
              if (u.row >= 0 && u.col >= 0) {
                if (u.row >= next.length || u.col >= (next[0]?.length || 0)) {
                  next = padGrid(next, u.row + 1, u.col + 1);
                }
                next[u.row][u.col] = String(u.value ?? "");
              }
            }
          }

          if (Array.isArray(json.new_columns)) {
            for (const nc of json.new_columns as Array<{ header: string; values: string[] }>) {
              const cols = next[0]?.length || 0;
              let targetCol = cols;
              for (let c = 0; c < cols; c++) {
                if (next.every((r) => !r[c])) {
                  targetCol = c;
                  break;
                }
              }
              if (targetCol >= cols) next = padGrid(next, next.length, targetCol + 1);
              next[0][targetCol] = String(nc.header || "New Column");
              (nc.values || []).forEach((val, idx) => {
                const rIdx = idx + 1;
                if (rIdx >= next.length) next = padGrid(next, rIdx + 1, next[0].length);
                next[rIdx][targetCol] = String(val ?? "");
              });
            }
          }

          if (Array.isArray(json.new_rows)) {
            let insertRow = next.findIndex((r) => r.every((c) => !c));
            if (insertRow === -1) insertRow = next.length;
            for (const nr of json.new_rows as string[][]) {
              if (insertRow >= next.length) {
                next = padGrid(next, insertRow + 1, Math.max(next[0].length, nr.length));
              }
              nr.forEach((v, cIdx) => {
                next[insertRow][cIdx] = String(v ?? "");
              });
              insertRow += 1;
            }
          }

          return next;
        });
      }

      setChatHistory((h) => [
        ...h,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: json.reply || "Completed.",
          chart: json.chart,
          report: json.analysis_report,
          engine: json.engine,
        },
      ]);
    } catch (err) {
      setChatHistory((h) => [
        ...h,
        {
          id: `e_${Date.now()}`,
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Failed"}`,
        },
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  return (
    <div
      ref={rootRef}
      className="h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F] select-none"
      onMouseMove={(e) => {
        if (resizingRef.current) {
          const nextW = Math.max(280, Math.min(760, window.innerWidth - e.clientX));
          setSidebarWidth(nextW);
        }
      }}
      onMouseUp={() => {
        setIsDragging(false);
        resizingRef.current = false;
      }}
    >
      {/* Development Warning Banner with Blinking Red Light */}
      <div className="bg-black text-white px-4 py-2 flex items-center justify-center gap-2.5 text-[11px] font-mono tracking-wide border-b border-white/15">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
        <span className="text-center">
          KASHFARA SPREADSHEET IS STILL IN DEVELOPMENT — SOME FEATURES MAY CAUSE ERRORS
        </span>
      </div>

      {/* Top Toolbar */}
      <header className="h-14 px-4 bg-white border-b border-black/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/spreadsheet"
            className="p-1.5 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-black"
            title="Back to Kashfara Spreadsheet"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center">
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold text-black truncate">
              KASHFARA SPREADSHEET
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImportFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-black hover:text-white text-xs font-medium text-black flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Upload className="w-3.5 h-3.5" /> Import Excel/CSV
          </button>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-black hover:text-white text-xs font-medium text-black flex items-center gap-1.5 transition-colors shrink-0"
            title="Toggle Full Screen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? "Exit Full" : "Full Screen"}</span>
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-black hover:text-white text-xs font-medium text-black flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> .XLSX
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-black hover:text-white text-xs font-medium text-black flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> .CSV
          </button>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-full bg-[#F5F5F7] hover:bg-black hover:text-white disabled:opacity-40 text-black transition-colors"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setSidebarOpen((v) => !v);
              setSidebarFull(false);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0",
              sidebarOpen
                ? "bg-black text-white"
                : "bg-white border border-black/15 text-black hover:bg-[#F5F5F7]"
            )}
          >
            {sidebarOpen ? (
              <PanelRightClose className="w-3.5 h-3.5" />
            ) : (
              <PanelRightOpen className="w-3.5 h-3.5" />
            )}
            <span>AI Copilot</span>
          </button>
        </div>
      </header>

      {/* Formula Bar */}
      {!sidebarFull && (
        <div className="h-10 px-4 bg-white border-b border-black/10 flex items-center gap-3 text-xs shrink-0">
          <span className="font-mono font-semibold px-2.5 py-0.5 rounded bg-[#F5F5F7] text-black min-w-[64px] text-center">
            {selectionLabel}
          </span>
          <span className="font-mono text-[#6E6E73] italic">fx</span>
          <input
            type="text"
            value={activeCellValue}
            onChange={(e) => {
              const val = e.target.value;
              setSheets((prev) =>
                prev.map((s, idx) => {
                  if (idx !== activeSheetIdx) return s;
                  const next = s.grid.map((r) => [...r]);
                  next[selection.startRow][selection.startCol] = val;
                  return { ...s, grid: next };
                })
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void commitCellValue(
                  selection.startRow,
                  selection.startCol,
                  grid[selection.startRow][selection.startCol]
                );
              }
            }}
            placeholder="Enter value, =SUM(A1:A5), or k= <AI prompt>..."
            className="flex-1 bg-transparent text-xs font-mono text-black focus:outline-none select-text"
          />
          <span className="hidden md:inline text-[11px] font-mono text-[#6E6E73]">
            Tip: Type <strong className="text-black">k=</strong> in any cell for AI
          </span>
        </div>
      )}

      {/* Main Grid + Resizable/Full-Screen Collapsible AI Sidebar */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Spreadsheet Grid */}
        {!sidebarFull && (
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            <div className="flex-1 overflow-auto">
              <table className="border-collapse text-xs table-fixed">
                <thead className="sticky top-0 z-20 bg-[#F5F5F7]">
                  <tr>
                    <th className="w-11 border-b border-r border-black/10 bg-[#F5F5F7] sticky left-0 z-30" />
                    {Array.from({ length: grid[0]?.length || 0 }, (_, c) => (
                      <th
                        key={c}
                        className={cn(
                          "min-w-[130px] w-[140px] h-7 border-b border-r border-black/10 font-mono text-[11px] font-medium text-[#6E6E73]",
                          c >= normSel.startCol && c <= normSel.endCol && "bg-black/10 text-black"
                        )}
                      >
                        {colLetter(c)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.map((row, r) => (
                    <tr key={r}>
                      <td
                        className={cn(
                          "sticky left-0 z-10 w-11 h-8 border-b border-r border-black/10 bg-[#F5F5F7] text-center font-mono text-[11px] text-[#6E6E73]",
                          r >= normSel.startRow && r <= normSel.endRow && "bg-black/10 text-black font-semibold"
                        )}
                      >
                        {r + 1}
                      </td>
                      {row.map((val, c) => {
                        const inSel =
                          r >= normSel.startRow &&
                          r <= normSel.endRow &&
                          c >= normSel.startCol &&
                          c <= normSel.endCol;
                        const isPrimary = r === selection.startRow && c === selection.startCol;
                        const isEditing = editingCell?.row === r && editingCell?.col === c;
                        const isBusy = cellBusyKey === `${r}:${c}`;
                        const customStyle = cellStyles[`${activeSheetIdx}:${r}:${c}`];

                        return (
                          <td
                            key={c}
                            onMouseDown={(e) => {
                              if (e.shiftKey) {
                                setSelection((s) => ({ ...s, endRow: r, endCol: c }));
                              } else {
                                setSelection({ startRow: r, startCol: c, endRow: r, endCol: c });
                                setIsDragging(true);
                              }
                              if (editingCell && (editingCell.row !== r || editingCell.col !== c)) {
                                setEditingCell(null);
                              }
                            }}
                            onMouseEnter={() => {
                              if (isDragging) {
                                setSelection((s) => ({ ...s, endRow: r, endCol: c }));
                              }
                            }}
                            onDoubleClick={() => setEditingCell({ row: r, col: c })}
                            style={{
                              backgroundColor: customStyle?.bg_color,
                              color: customStyle?.text_color,
                              fontWeight: customStyle?.bold ? 600 : undefined,
                            }}
                            className={cn(
                              "h-8 border-b border-r border-black/10 px-2 relative cursor-cell truncate",
                              !customStyle?.bg_color && inSel && "bg-black/[0.04]",
                              isPrimary && "ring-2 ring-inset ring-black z-10",
                              !customStyle?.bg_color && r === 0 && "font-semibold bg-[#F5F5F7]/60"
                            )}
                          >
                            {isBusy ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#6E6E73]">
                                <Loader2 className="w-3 h-3 animate-spin" /> AI...
                              </span>
                            ) : isEditing ? (
                              <input
                                autoFocus
                                defaultValue={val}
                                onBlur={(e) => {
                                  setEditingCell(null);
                                  if (e.target.value !== val) {
                                    void commitCellValue(r, c, e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const v = (e.target as HTMLInputElement).value;
                                    setEditingCell(null);
                                    void commitCellValue(r, c, v);
                                  } else if (e.key === "Escape") {
                                    setEditingCell(null);
                                  }
                                }}
                                className="w-full h-full bg-white text-xs text-black focus:outline-none select-text"
                              />
                            ) : (
                              <span dir="auto" className="text-xs">
                                {val}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Sheet Tabs */}
            <div className="h-9 px-3 bg-[#F5F5F7] border-t border-black/10 flex items-center gap-1.5 overflow-x-auto shrink-0">
              {sheets.map((s, idx) => (
                <button
                  key={s.name + idx}
                  onClick={() => setActiveSheetIdx(idx)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium transition-colors",
                    idx === activeSheetIdx
                      ? "bg-white text-black shadow-sm border border-black/10"
                      : "text-[#6E6E73] hover:text-black"
                  )}
                >
                  {s.name}
                </button>
              ))}
              <button
                onClick={() => {
                  const name = `Sheet${sheets.length + 1}`;
                  setSheets((s) => [...s, { name, grid: padGrid([[]]) }]);
                  setActiveSheetIdx(sheets.length);
                }}
                className="p-1 rounded-lg hover:bg-black/5 text-[#6E6E73] hover:text-black"
                title="Add Sheet"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => updateGrid((g) => [...g, Array(g[0].length).fill("")])}
                className="ml-auto text-[11px] font-mono text-[#6E6E73] hover:text-black px-2"
              >
                + Row
              </button>
              <button
                onClick={() => updateGrid((g) => g.map((r) => [...r, ""]))}
                className="text-[11px] font-mono text-[#6E6E73] hover:text-black px-2"
              >
                + Col
              </button>
            </div>
          </div>
        )}

        {/* Resizable & Full-Screen Collapsible Agentic AI Sidebar */}
        {sidebarOpen && (
          <aside
            style={sidebarFull ? undefined : { width: `${sidebarWidth}px` }}
            className={cn(
              "relative shrink-0 bg-white border-l border-black/10 flex flex-col select-text",
              sidebarFull ? "w-full" : "max-w-[90vw]"
            )}
          >
            {/* Drag Handle to Resize Sidebar */}
            {!sidebarFull && (
              <div
                onMouseDown={() => {
                  resizingRef.current = true;
                }}
                className="hidden sm:block absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-black/20 transition-colors z-30"
                title="Drag to resize AI Copilot"
              />
            )}

            <div className="p-3.5 border-b border-black/8 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-black" />
                <span className="text-xs font-semibold text-black">
                  Kashfara Agentic Copilot
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5F5F7] text-black">
                  Sel: {selectionLabel}
                </span>
                <button
                  onClick={() => setSidebarFull((v) => !v)}
                  className="p-1 rounded-lg hover:bg-[#F5F5F7] text-[#6E6E73] hover:text-black"
                  title={sidebarFull ? "Exit Chatbot Full Screen" : "Chatbot Full Screen"}
                >
                  {sidebarFull ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Prompt Suggestions (disappear automatically after the first user message) */}
            {chatHistory.length <= 1 && (
              <div className="p-2.5 border-b border-black/8 flex flex-wrap gap-1.5 bg-[#F5F5F7]/60">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp}
                    onClick={() => void sendAgentPrompt(qp)}
                    disabled={chatBusy}
                    className="text-[10px] px-2.5 py-1 rounded-full bg-white hover:bg-black hover:text-white border border-black/10 text-black transition-colors text-left"
                  >
                    {qp.length > 38 ? qp.slice(0, 36) + "…" : qp}
                  </button>
                ))}
              </div>
            )}

            {/* Chat, Charts & Reports */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#F5F5F7]/40">
              {chatHistory.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "p-3 rounded-2xl text-xs space-y-2",
                    item.role === "user"
                      ? "bg-black text-white ml-6"
                      : "bg-white border border-black/10 text-black mr-2"
                  )}
                >
                  <div dir="auto" className="leading-relaxed whitespace-pre-wrap">
                    {item.content}
                  </div>

                  {item.chart && <ChartCard chart={item.chart} />}

                  {item.report && (
                    <div className="mt-2 pt-2 border-t border-black/10 space-y-2.5">
                      <div className="flex items-center gap-1.5 font-semibold text-black">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>{item.report.title}</span>
                      </div>
                      <p className="text-[11px] text-[#6E6E73]">{item.report.summary}</p>
                      {item.report.metrics?.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {item.report.metrics.map((m, i) => (
                            <div key={i} className="p-2 rounded-xl bg-[#F5F5F7]">
                              <div className="text-[10px] font-mono text-[#6E6E73]">{m.label}</div>
                              <div className="font-semibold text-black">{m.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.report.insights?.length > 0 && (
                        <div className="text-[11px] space-y-0.5">
                          <div className="font-mono text-[10px] text-[#6E6E73]">INSIGHTS</div>
                          {item.report.insights.map((ins, i) => (
                            <div key={i}>• {ins}</div>
                          ))}
                        </div>
                      )}
                      {item.report.anomalies?.length > 0 && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-xl space-y-0.5">
                          <div className="font-mono text-[10px]">ANOMALIES</div>
                          {item.report.anomalies.map((an, i) => (
                            <div key={i}>• {an}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendAgentPrompt(chatInput);
              }}
              className="p-3 border-t border-black/10 bg-white flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatBusy}
                placeholder={`Command AI on ${selectionLabel}...`}
                className="flex-1 px-3 py-2 rounded-full bg-[#F5F5F7] border border-black/10 text-xs text-black focus:outline-none focus:border-black"
              />
              <button
                type="submit"
                disabled={chatBusy || !chatInput.trim()}
                className="p-2 rounded-full bg-black text-white disabled:opacity-40"
              >
                {chatBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
