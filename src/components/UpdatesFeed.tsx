"use client";

import { useEffect, useState } from "react";
import { DailyUpdate } from "@/lib/types";
import { useKpisRefresh } from "@/components/DashboardShell";

export default function UpdatesFeed({ meName }: { meName: string }) {
  const [updates, setUpdates] = useState<DailyUpdate[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refreshKpis = useKpisRefresh();

  async function load() {
    const res = await fetch("/api/updates");
    const d = await res.json();
    setUpdates(d.updates ?? []);
  }
  useEffect(() => { load(); }, []);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Could not post update"); return; }
    setBody("");
    await load(); refreshKpis();
  }

  return (
    <section aria-label="Daily updates" className="card p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>Daily updates</h2>
        <span className="text-xs" style={{ color: "var(--muted)" }}>What the team shipped today</span>
      </div>
      <form onSubmit={post} className="mt-4 flex gap-2">
        <input className="input flex-1" placeholder={`Log an update as ${meName}…`} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Your update" required minLength={3} />
        <button className="btn btn-primary" disabled={busy || body.trim().length < 3}>Log</button>
      </form>
      {error && <p className="text-sm font-semibold mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      {updates === null ? (
        <div className="mt-4 space-y-2">{[0, 1].map((i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : updates.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>No updates logged today. Be the first to post one.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {updates.map((u) => (
            <li key={u.id} className="rounded-[10px] p-3" style={{ background: "var(--accent-soft)" }}>
              <p className="text-xs font-bold" style={{ color: "var(--accent-strong)" }}>
                {u.memberName ?? "Team"} · <span className="tnum font-normal" style={{ color: "var(--muted)" }}>{u.loggedDate}</span>
              </p>
              <p className="text-sm mt-1">{u.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
