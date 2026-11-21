"use client";

import { useEffect, useState } from "react";
import { Lead } from "@/lib/types";
import { useKpisRefresh } from "@/components/DashboardShell";

const STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [form, setForm] = useState({ name: "", company: "", value: "", status: "new" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refreshKpis = useKpisRefresh();

  async function load() {
    const d = await fetch("/api/leads").then((r) => r.json());
    setLeads(d.leads ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, value: form.value ? Number(form.value) : undefined }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Could not add lead"); return; }
    setForm({ name: "", company: "", value: "", status: "new" });
    await load(); refreshKpis();
  }

  async function setStatus(lead: Lead, status: string) {
    setLeads((prev) => prev ? prev.map((l) => (l.id === lead.id ? { ...l, status } : l)) : prev);
    await fetch("/api/leads", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: lead.id, status }) });
    refreshKpis();
  }

  return (
    <section className="card p-4 lg:p-6">
      <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>Current leads</h2>
      <form onSubmit={add} className="mt-4 grid sm:grid-cols-[2fr_2fr_1fr_auto] gap-2">
        <input className="input" placeholder="Lead name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} aria-label="Lead name" />
        <input className="input" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} aria-label="Company" />
        <input className="input tnum" placeholder="Value ($)" inputMode="numeric" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value.replace(/[^\d.]/g, "") })} aria-label="Value" />
        <button className="btn btn-primary" disabled={busy}>Add lead</button>
      </form>
      {error && <p className="text-sm font-semibold mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      {leads === null ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : leads.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>No leads yet — add one above or let the AI assistant create it.</p>
      ) : (
        <ul className="mt-4 divide-y" style={{ borderColor: "var(--border)" }}>
          {leads.map((l) => (
            <li key={l.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--heading)" }}>{l.name}{l.company ? ` · ${l.company}` : ""}</p>
                <p className="text-xs tnum" style={{ color: "var(--muted)" }}>${Number(l.value).toLocaleString()} pipeline value</p>
              </div>
              <select className="input sm:w-36" value={l.status} onChange={(e) => setStatus(l, e.target.value)} aria-label={`Status of ${l.name}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
