"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
type Mode = "system" | "light" | "dark";
function apply(mode: Mode) {
  const dark = mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
export default function ThemeSwitch() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    const saved = (localStorage.getItem("vd_theme") as Mode) || "system";
    setMode(saved); apply(saved);
  }, []);
  function choose(m: Mode) { setMode(m); localStorage.setItem("vd_theme", m); apply(m); }
  const opts: { m: Mode; label: string; Icon: typeof Sun }[] = [
    { m: "system", label: "System theme", Icon: Monitor },
    { m: "light", label: "Light theme", Icon: Sun },
    { m: "dark", label: "Dark theme", Icon: Moon },
  ];
  return (
    <div role="radiogroup" aria-label="Theme" className="flex items-center rounded bg-surface-2 p-0.5">
      {opts.map(({ m, label, Icon }) => (
        <button key={m} role="radio" aria-checked={mode === m} aria-label={label} title={label}
          onClick={() => choose(m)}
          className={`flex h-8 w-8 items-center justify-center rounded transition-colors duration-120 ${mode === m ? "bg-surface text-ink" : "text-ink-3 hover:text-ink"}`}>
          <Icon size={16} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
