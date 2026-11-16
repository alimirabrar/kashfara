"use client";

import React, { useState } from "react";
import { Play, Loader2 } from "lucide-react";

const ENDPOINTS = [
  { label: "GET /api/health", method: "GET", path: "/api/health" },
  { label: "GET /api/providers?refresh=true", method: "GET", path: "/api/providers?refresh=true" },
  { label: "GET /api/providers/quotas", method: "GET", path: "/api/providers/quotas" },
  { label: "GET /api/providers/health", method: "GET", path: "/api/providers/health" },
  { label: "POST /api/providers/test", method: "POST", path: "/api/providers/test" },
  { label: "GET /api/usage/daily", method: "GET", path: "/api/usage/daily" },
  { label: "GET /api/documents", method: "GET", path: "/api/documents" },
];

export function ApiPlaygroundView() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [output, setOutput] = useState<string>("");

  async function runEndpoint() {
    const ep = ENDPOINTS[selectedIdx];
    setLoading(true);
    try {
      const res = await fetch(ep.path, { method: ep.method });
      setStatus(res.status);
      const json = await res.json();
      setOutput(JSON.stringify(json, null, 2));
    } catch (err) {
      setStatus(500);
      setOutput(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="kv-panel rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#E8F0F7]">API Playground</h2>
          <p className="text-xs text-[#91A3B6]">
            Inspect live Kashfara Vision serverless endpoints, provider discovery, and quota headers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-[#080D15] border border-[#91A3B6]/25 text-xs font-mono text-[#E8F0F7]"
          >
            {ENDPOINTS.map((ep, i) => (
              <option key={ep.path} value={i}>
                {ep.label}
              </option>
            ))}
          </select>
          <button
            onClick={runEndpoint}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-[#40E9E1] hover:bg-[#1FBFCA] text-[#080D15] text-xs font-semibold flex items-center gap-1.5"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Execute
          </button>
        </div>
      </div>

      <div className="kv-panel rounded-xl overflow-hidden">
        <div className="px-4 py-2 bg-[#0B121D] border-b border-[#91A3B6]/15 flex items-center justify-between text-xs font-mono">
          <span className="text-[#91A3B6]">Response Payload</span>
          {status !== null && (
            <span className={status < 400 ? "text-[#32D6A0]" : "text-[#F87171]"}>
              HTTP {status}
            </span>
          )}
        </div>
        <pre className="p-4 text-xs font-mono text-[#E8F0F7] overflow-auto max-h-[65vh]">
          {output || 'Click "Execute" to inspect the live response.'}
        </pre>
      </div>
    </div>
  );
}
