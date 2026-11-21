"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string; actions?: string[] };

const SUGGESTIONS = [
  "Create a lead Acme Corp worth 5000",
  "What are today's KPIs?",
  "Mark the proposal task done",
];

export default function AiRail({ me, refreshKpis }: { me: { name: string }; team: { id: number; name: string }[]; refreshKpis: () => void }) {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Hi ${me.name.split(" ")[0]} — I'm your control-room assistant. Ask me to create a lead, open a project, update a task or log your daily update.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyMissing, setKeyMissing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setBusy(true);
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (data.keyMissing) setKeyMissing(true);
    setMessages([...next, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong.", actions: data.actions }]);
    if (data.actions?.length) refreshKpis();
  }

  return (
    <aside
      aria-label="AI assistant"
      className="shrink-0 border-t lg:border-t-0 lg:border-l flex flex-col lg:w-80 xl:w-96"
      style={{ borderColor: "var(--border)", background: "var(--surface)", maxHeight: "100dvh" }}
    >
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
        <div>
          <p className="eyebrow">Groq-powered</p>
          <p className="font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>AI command rail</p>
        </div>
        <button className="btn btn-ghost text-xs" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <>
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 220 }}>
            {messages.map((m, i) => (
              <div key={i} className={`text-sm rounded-[10px] p-3 ${m.role === "user" ? "ml-6" : ""}`}
                style={{ background: m.role === "user" ? "var(--accent)" : "var(--accent-soft)", color: m.role === "user" ? "var(--on-accent)" : "var(--text)" }}>
                {m.content}
                {m.actions?.length ? (
                  <ul className="mt-2 text-xs font-semibold" style={{ color: "var(--accent-strong)" }}>
                    {m.actions.map((a, j) => <li key={j}>✓ {a}</li>)}
                  </ul>
                ) : null}
              </div>
            ))}
            {busy && <div className="skeleton h-10" />}
            {keyMissing && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                Add <code>GROQ_API_KEY</code> to activate live AI actions. Every other screen works now.
              </p>
            )}
          </div>
          <div className="p-3 flex flex-wrap gap-1" style={{ borderTop: "1px solid var(--border)" }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="btn btn-ghost text-xs" disabled={busy}>{s}</button>
            ))}
          </div>
          <form className="p-3 pt-0 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input className="input flex-1" placeholder="Tell the AI what to do…" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Message the AI assistant" />
            <button className="btn btn-primary" disabled={busy || !input.trim()}>Send</button>
          </form>
        </>
      )}
    </aside>
  );
}
