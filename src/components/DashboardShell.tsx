"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AiRail from "@/components/AiRail";
import ThemeToggle from "@/components/ThemeToggle";
import type { Member } from "@/lib/types";

type Kpis = {
  activeLeads: number; activeProjects: number; openTasks: number;
  doneTasks: number; teamSize: number; updatesToday: number; pipelineValue: number;
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/projects", label: "Projects" },
  { href: "/members", label: "Members" },
];

export default function DashboardShell({ me, team, children }: { me: Member; team: { id: number; name: string }[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const refreshKpis = useCallback(() => {
    fetch("/api/kpis").then((r) => r.json()).then((d) => setKpis(d.kpis)).catch(() => {});
  }, []);
  const firstRun = useRef(true);
  useEffect(() => { if (firstRun.current) { firstRun.current = false; refreshKpis(); } }, [refreshKpis, pathname]);

  async function logout() {
    await fetch("/api/auth/me", { method: "DELETE" });
    router.push("/enter");
    router.refresh();
  }

  const tiles: { label: string; value: string; hint: string }[] = kpis
    ? [
        { label: "Active leads", value: String(kpis.activeLeads), hint: `$${kpis.pipelineValue.toLocaleString()} pipeline` },
        { label: "Active projects", value: String(kpis.activeProjects), hint: "in delivery" },
        { label: "Open tasks", value: String(kpis.openTasks), hint: `${kpis.doneTasks} done` },
        { label: "Updates today", value: String(kpis.updatesToday), hint: `${kpis.teamSize} on the team` },
      ]
    : [
        { label: "Active leads", value: "—", hint: "loading" },
        { label: "Active projects", value: "—", hint: "loading" },
        { label: "Open tasks", value: "—", hint: "loading" },
        { label: "Updates today", value: "—", hint: "loading" },
      ];

  return (
    <div className="min-h-dvh flex flex-col lg:flex-row">
      {/* Left nav */}
      <aside className="lg:w-60 shrink-0 border-b lg:border-b-0 lg:border-r" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="p-4 flex items-center justify-between lg:block">
          <div>
            <p className="eyebrow">Kashfara CRM</p>
            <p className="text-lg font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>Control Room</p>
          </div>
          <ThemeToggle />
          <nav className="flex lg:flex-col gap-1 lg:mt-6 overflow-x-auto">
            {NAV.map((n) => {
              const active = pathname === n.href;
              return (
                <Link key={n.href} href={n.href}
                  className="btn shrink-0"
                  style={{
                    justifyContent: "flex-start",
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent-strong)" : "var(--text)",
                    fontWeight: active ? 700 : 500,
                  }}>
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="hidden lg:block p-4 mt-auto absolute bottom-0 left-0 w-60" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--heading)" }}>{me.name}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{me.title}{me.role === "admin" ? " · Super Admin" : ""}</p>
          <button onClick={logout} className="btn btn-ghost mt-2 text-xs">Sign out</button>
        </div>
      </aside>

      {/* Main column */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 space-y-6">
        <header>
          <p className="eyebrow">Kashfara CRM · Control Room</p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight" style={{ color: "var(--heading)" }}>
            Today&apos;s tasks, tomorrow&apos;s pipeline
          </h1>
        </header>
        <section aria-label="Key metrics" className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {tiles.map((t, i) => (
            <div key={t.label} className="card p-4" data-skeleton={t.value === "—" ? "" : undefined}>
              {t.value === "—" ? <div className="skeleton h-8 w-14 mb-2" /> : (
                <p className="text-3xl font-extrabold tnum" style={{ color: i === 0 ? "var(--accent)" : "var(--heading)" }}>{t.value}</p>
              )}
              <p className="text-xs font-semibold" style={{ color: "var(--heading)" }}>{t.label}</p>
              <p className="text-xs tnum" style={{ color: "var(--muted)" }}>{t.hint}</p>
            </div>
          ))}
        </section>
        <KpisRefreshContext.Provider value={refreshKpis}>
          {children}
        </KpisRefreshContext.Provider>
      </main>

      {/* Right AI rail */}
      <AiRail me={me} team={team} refreshKpis={refreshKpis} />
    </div>
  );
}

export const KpisRefreshContext = createContext<() => void>(() => {});
export function useKpisRefresh() {
  return useContext(KpisRefreshContext);
}
