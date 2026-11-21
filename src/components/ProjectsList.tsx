"use client";

import { useEffect, useState } from "react";
import { Project } from "@/lib/types";
import { useKpisRefresh } from "@/components/DashboardShell";

export default function ProjectsList({ team }: { team: { id: number; name: string }[] }) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [form, setForm] = useState({ name: "", client: "", dueDate: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refreshKpis = useKpisRefresh();

  async function load() {
    const d = await fetch("/api/projects").then((r) => r.json());
    setProjects(d.projects ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, dueDate: form.dueDate || undefined }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Could not add project"); return; }
    setForm({ name: "", client: "", dueDate: "" });
    await load(); refreshKpis();
  }

  async function setStatus(p: Project, status: string) {
    setProjects((prev) => prev ? prev.map((x) => (x.id === p.id ? { ...x, status } : x)) : prev);
    await fetch("/api/projects", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status }) });
    refreshKpis();
  }

  return (
    <section className="card p-4 lg:p-6">
      <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>Current projects</h2>
      <form onSubmit={add} className="mt-4 grid sm:grid-cols-[2fr_2fr_auto] gap-2">
        <input className="input" placeholder="Project name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} aria-label="Project name" />
        <input className="input" placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} aria-label="Client" />
        <button className="btn btn-primary" disabled={busy}>Open project</button>
      </form>
      {error && <p className="text-sm font-semibold mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      {projects === null ? (
        <div className="mt-4 space-y-2">{[0, 1].map((i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : projects.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>No projects yet. Open your first project above.</p>
      ) : (
        <ul className="mt-4 divide-y" style={{ borderColor: "var(--border)" }}>
          {projects.map((p) => (
            <li key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--heading)" }}>{p.name}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {p.client ?? "Internal"} · {p.ownerId ? (team.find((m) => m.id === p.ownerId)?.name ?? "—") : "—"}
                  {p.dueDate ? ` · due ${p.dueDate}` : ""}
                </p>
              </div>
              <select className="input sm:w-32" value={p.status} onChange={(e) => setStatus(p, e.target.value)} aria-label={`Status of ${p.name}`}>
                <option value="active">active</option>
                <option value="on_hold">on hold</option>
                <option value="done">done</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
