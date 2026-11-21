"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "dark" || current === "light") setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("kashfara-theme", next); } catch {}
  }

  return (
    <button
      onClick={toggle}
      className="btn btn-ghost shrink-0"
      style={{ minHeight: 36, padding: "0 0.75rem", fontSize: "0.75rem" }}
      aria-label={theme === "dark" ? "Switch to light appearance" : "Switch to dark appearance"}
      title={theme === "dark" ? "Light" : "Dark"}
    >
      {theme === "dark" ? "☀ Light" : "☾ Dark"}
    </button>
  );
}
