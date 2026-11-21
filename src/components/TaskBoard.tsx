"use client";

import { useEffect, useState } from "react";
import type { Task } from "@/lib/types";
import { useKpisRefresh } from "@/components/DashboardShell";

const STATUS_ORDER = ["open", "in_progress", "done"] as const;
const STATUS_LABEL: Record<string, string> = { open: "Open", in_progress: "In progress", done: "Done" };
const PRIORITY_CLASS: Record<string, string> = {
  high: "chip-high",
  medium: "chip-medium",
  low: "chip-low",
};

export default function TaskBoard({ team }: { team: { id: number; name: string }[] }) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [title, setTitle] = useState("");
  const [assigneeId, setAssignee] = useState("");
  const [priority, setPriority] = useState("medium");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refreshKpis = useKpisRefresh();

  async function load() {
    const res = await fetch("/api/tasks");
    const d = await res.json();
    setTasks(d.tasks ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority, assigneeId: assigneeId ? Number(assigneeId) : undefined, dueDate: new Date().toISOString().slice(0, 10) }),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Could not add task"); return; }
    setTitle("");
    await load(); refreshKpis();
  }

  async function setStatus(task: Task, status: string) {
    if (task.status === status) return;
    setTasks((prev) => prev ? prev.map((t) => (t.id === task.id ? { ...t, status } : t)) : prev);
    const res = await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, status }),
    });
    if (!res.ok) { await load(); return; }
    refreshKpis();
  }

  return (
    <section aria-label="Daily task board" className="card p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>Daily task board</h2>
        <span className="text-xs" style={{ color: "var(--muted)" }}>Owner, status and priority</span>
      </div>

      <form onSubmit={addTask} className="mt-4 flex flex-col sm:flex-row gap-2">
        <input className="input flex-1" placeholder="Add a task for today — e.g. Call Coast Logistics" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Task title" required minLength={2} />
        <select className="input sm:w-44" value={assigneeId} onChange={(e) => setAssignee(e.target.value)} aria-label="Assignee">
          <option value="">Unassigned</option>
          {team.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className="input sm:w-32" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Priority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button className="btn btn-primary" disabled={busy || title.trim().length < 2}>Add task</button>
      </form>
      {error && <p className="text-sm font-semibold mt-2" style={{ color: "var(--danger)" }}>{error}</p>}

      {tasks === null ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
      ) : tasks.length === 0 ? (
        <p className="mt-6 text-sm" style={{ color: "var(--muted)" }}>No tasks yet. Add the first task for today above.</p>
      ) : (
        <ul className="mt-4 divide-y" style={{ borderColor: "var(--border)" }}>
          {tasks.map((t) => (
            <li key={t.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${t.status === "done" ? "line-through" : ""}`} style={{ color: "var(--heading)" }}>{t.title}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className={`badge ${PRIORITY_CLASS[t.priority] ?? "chip-low"}`}>{t.priority.toUpperCase()}</span>
                  <span className="text-xs tnum" style={{ color: "var(--muted)" }}>
                    {t.assigneeId ? (team.find((m) => m.id === t.assigneeId)?.name ?? "Unknown") : "Unassigned"}
                    {t.dueDate ? ` · due ${t.dueDate}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0" role="group" aria-label={`Change status of ${t.title}`}>
                {STATUS_ORDER.map((s) => (
                  <button key={s} onClick={() => setStatus(t, s)}
                    className="btn text-xs"
                    style={{
                      minHeight: 36,
                      background: t.status === s ? "var(--accent)" : "transparent",
                      color: t.status === s ? "var(--on-accent)" : "var(--muted)",
                      border: "1px solid var(--border)",
                    }}>
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
