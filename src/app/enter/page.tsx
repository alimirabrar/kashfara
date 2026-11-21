"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function EnterPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [membersList, setMembers] = useState<{ id: number; name: string; title: string }[]>([]);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/members-public")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d) => setMembers(d.members ?? []))
      .catch(() => setMembers([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/enter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pin === "1944" && newName.trim() ? { pin, newName } : { pin, memberId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not sign in");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8" style={{ boxShadow: "var(--shadow-2)" }}>
        <p className="eyebrow">Kashfara CRM · Control Room</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>
          Today&apos;s tasks, tomorrow&apos;s pipeline
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Pin-secured access keeps your team in one trusted workspace. Enter PIN 1944 and pick your profile.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-semibold mb-1">Secure PIN</label>
            <input
              id="pin"
              className="input tnum text-2xl tracking-[0.4em] text-center"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
            />
          </div>
          <div>
            <span className="block text-sm font-semibold mb-1">Who are you?</span>
            <div className="grid grid-cols-2 gap-2">
              {membersList.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setMemberId(m.id); setNewName(""); }}
                  className={`btn ${memberId === m.id ? "btn-primary" : "btn-ghost"} border`}
                  style={{ borderColor: "var(--border)", justifyContent: "flex-start" }}
                >
                  <span className="truncate">{m.name}</span>
                </button>
              ))}
            </div>
            <input
              className="input mt-2"
              placeholder="Or type your name to create a profile"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setMemberId(null); }}
            />
          </div>
          {error && <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy || pin.length !== 4 || (!memberId && !newName.trim())}>
            {busy ? "Opening…" : "Enter the Control Room"}
          </button>
        </form>
      </div>
    </main>
  );
}
