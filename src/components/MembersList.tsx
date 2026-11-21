"use client";

import { useEffect, useState } from "react";
import { Member } from "@/lib/types";

export default function MembersList({ meId, isAdmin }: { meId: number; isAdmin: boolean }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [form, setForm] = useState({ name: "", title: "", email: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await fetch("/api/members").then((r) => r.json());
    setMembers(d.members ?? []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Could not add member"); return; }
    setForm({ name: "", title: "", email: "", phone: "" });
    await load();
  }

  return (
    <section className="card p-4 lg:p-6">
      <h2 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>Onboarded members</h2>
      <p className="text-xs" style={{ color: "var(--muted)" }}>Every member signs in with the secured PIN 1944.</p>
      {isAdmin && (
        <form onSubmit={add} className="mt-4 grid sm:grid-cols-[2fr_2fr_2fr_auto] gap-2">
          <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} aria-label="Full name" />
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-label="Title" />
          <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
          <button className="btn btn-primary" disabled={busy}>Add member</button>
        </form>
      )}
      {error && <p className="text-sm font-semibold mt-2" style={{ color: "var(--danger)" }}>{error}</p>}
      {members === null ? (
        <div className="mt-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>
      ) : (
        <ul className="mt-4 grid sm:grid-cols-2 gap-3">
          {members.map((m) => (
            <li key={m.id} className="rounded-[10px] p-4" style={{ border: "1px solid var(--border)", background: m.id === meId ? "var(--accent-soft)" : "var(--surface)" }}>
              <p className="text-sm font-bold" style={{ color: "var(--heading)" }}>{m.name}{m.id === meId ? " (you)" : ""}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{m.title}{m.role === "admin" ? " · Super Admin" : ""}</p>
              <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>{m.email ?? "No email"} · {m.phone ?? "No phone"}</p>
              <p className="text-xs mt-1" style={{ color: "var(--accent-strong)" }}>Point of contact: {m.pointOfContact ?? "—"}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
