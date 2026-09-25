"use client";

import { useCallback, useState } from "react";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * R1 §3 — Theme toggle.
 *
 * Three-state segmented control (light / system / dark) persisted via
 * the `ij_theme` cookie. The cookie is the same one the root layout
 * reads at request time and the inline pre-paint script reads at boot.
 * Changing the preference calls router.refresh() so the server-rendered
 * HTML updates on the next request.
 */

type Theme = "light" | "system" | "dark";

const COOKIE_NAME = "ij_theme";

function readCookie(): Theme {
  if (typeof document === "undefined") return "system";
  const match = document.cookie.match(/(?:^|; )ij_theme=([^;]+)/);
  const v = match?.[1];
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function writeCookie(value: Theme) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${value};path=/;max-age=31536000;samesite=lax`;
}

function applyTheme(value: Theme) {
  if (typeof document === "undefined") return;
  if (value === "system") {
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
  } else {
    document.documentElement.setAttribute("data-theme", value);
  }
}

const OPTIONS: ReadonlyArray<{ value: Theme; labelKey: string; icon: React.ReactNode }> = [
  {
    value: "light",
    labelKey: "theme.light",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    ),
  },
  {
    value: "system",
    labelKey: "theme.system",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path strokeLinecap="round" d="M8 20h8M12 16v4" />
      </svg>
    ),
  },
  {
    value: "dark",
    labelKey: "theme.dark",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    ),
  },
];

export interface ThemeToggleProps {
  className?: string;
  /** Show labels next to icons (defaults to icon-only on small screens). */
  showLabels?: boolean;
}

export function ThemeToggle({ className, showLabels = true }: ThemeToggleProps) {
  const { t } = useTranslations();
  // Lazy initializer — `readCookie()` runs once on first render (client
  // only). We can't do this in `useEffect` because the new ESLint rule
  // (`react-hooks/set-state-in-effect`) flags synchronous setState
  // calls inside effects as cascading renders. Reading once during the
  // initial render is the correct pattern for syncing with an external
  // value that already exists at mount time.
  const [theme, setTheme] = useState<Theme>(() => readCookie());
  const [hydrated] = useState<boolean>(() =>
    typeof document !== "undefined" && document.cookie.includes(`${COOKIE_NAME}=`),
  );

  const onChange = useCallback((next: Theme) => {
    setTheme(next);
    writeCookie(next);
    applyTheme(next);
  }, []);

  return (
    <div
      role="radiogroup"
      aria-label="Theme preference"
      className={cn(
        "inline-flex items-center rounded-full border border-outline-variant bg-surface-container-lowest p-0.5",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const isActive = hydrated && theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              isActive
                ? "bg-surface-container text-on-surface shadow-xs"
                : "text-secondary hover:text-on-surface",
            )}
          >
            {opt.icon}
            {showLabels ? <span>{t(opt.labelKey as "theme.light")}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
