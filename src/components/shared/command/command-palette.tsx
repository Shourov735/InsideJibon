"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useTranslations } from "@/i18n/client";
import { cn } from "@/lib/utils";

import type { CommandItem } from "@/services/command/types";

/**
 * R1 §4 — ⌘K Command Palette.
 *
 * - Listens for Cmd/Ctrl-K (and `/` outside input fields) to open.
 * - Loads indexed items lazily from /api/command?q=... when the user
 *   types. The server route authorizes the caller and returns a
 *   `CommandIndexResult` (see src/services/command).
 * - Adds static commands (settings, language switch, theme, sign-out)
 *   and role-scoped quick-create actions.
 * - Recent items persist in localStorage keyed by user.id.
 * - Keyboard escape closes, Enter (cmdk default) selects.
 */

export interface CommandPaletteProps {
  /** Static always-available commands (server-rendered). */
  staticItems?: CommandItem[];
  /** Teacher-only quick actions. */
  roleActions?: CommandItem[];
  /** Mount in the role layout. Pass nothing to read from the env route. */
  trigger?: ReactNode;
}

export function CommandPalette({ staticItems, roleActions }: CommandPaletteProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [indexedItems, setIndexedItems] = useState<CommandItem[]>([]);
  const [loading, setLoading] = useState(false);
  // Recent items — read once on first client render via the lazy
  // initializer. We re-sync whenever the dialog opens via the effect
  // below (which only runs in the event-driven path, not during the
  // initial mount).
  const [recents, setRecents] = useState<CommandItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const userId = document.documentElement.dataset.userId ?? "anon";
      return JSON.parse(
        localStorage.getItem(`ij_cmd_recents_${userId}`) ?? "[]",
      ) as CommandItem[];
    } catch {
      return [];
    }
  });

  // Re-sync recents whenever the dialog opens, in case another tab
  // updated them or the user id changed.
  useEffect(() => {
    if (typeof window === "undefined" || !open) return;
    try {
      const userId = document.documentElement.dataset.userId ?? "anon";
      const stored = JSON.parse(
        localStorage.getItem(`ij_cmd_recents_${userId}`) ?? "[]",
      ) as CommandItem[];
      // Defer state update to avoid the cascading-render warning.
      queueMicrotask(() => setRecents(stored));
    } catch {
      /* ignore */
    }
  }, [open]);

  // ⌘K / Ctrl-K and `/` (outside input) to open. Also responds to the
  // `ij:open-command` window event fired by CommandTrigger.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      const isSlash =
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement | null)?.isContentEditable;
      if (isModK || isSlash) {
        e.preventDefault();
        setOpen(true);
      }
    }
    function onCustom() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("ij:open-command", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("ij:open-command", onCustom);
    };
  }, []);

  // Fetch indexed items whenever the query changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Defer the loading state flip so we don't synchronously setState
    // during the effect body (React 19 / new ESLint rule flags that
    // pattern as a cascading-render footgun).
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/command?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          if (!cancelled) setIndexedItems([]);
          return;
        }
        const data = (await res.json()) as { items: CommandItem[] };
        if (!cancelled) setIndexedItems(data.items ?? []);
      } catch {
        if (!cancelled) setIndexedItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 120);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, open]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.href.startsWith("#ij_lang=")) {
        const value = item.href.split("=")[1] as "en" | "bn";
        document.cookie = `ij_lang=${value};path=/;max-age=31536000;samesite=lax`;
        setOpen(false);
        router.refresh();
        return;
      }
      // Save to recents.
      try {
        const userId = document.documentElement.dataset.userId ?? "anon";
        const stored = JSON.parse(
          localStorage.getItem(`ij_cmd_recents_${userId}`) ?? "[]",
        ) as CommandItem[];
        const next = [item, ...stored.filter((s) => s.id !== item.id)].slice(0, 5);
        localStorage.setItem(`ij_cmd_recents_${userId}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  const allItems = useMemo(() => {
    const out: CommandItem[] = [
      ...(staticItems ?? []),
      ...(roleActions ?? []),
      ...indexedItems,
    ];
    // Dedupe by id, prefer indexed then static then role actions.
    const seen = new Set<string>();
    return out.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
  }, [staticItems, roleActions, indexedItems]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label={t("command.title")}
      contentClassName={cn(
        "fixed left-1/2 top-[12vh] z-[80] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2",
        "overflow-hidden rounded-2xl border border-outline-variant bg-surface-0 text-on-surface shadow-xl",
        "animate-in fade-in zoom-in-95 duration-150",
      )}
      shouldFilter
    >
      <div className="flex items-center gap-2 border-b border-outline-variant px-4 py-3">
        <svg
          className="h-4 w-4 text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <Command.Input
          autoFocus
          value={query}
          onValueChange={setQuery}
          placeholder={t("command.placeholder")}
          className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-secondary focus:outline-none"
        />
        <kbd className="rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 font-mono text-[10px] text-secondary">
          ESC
        </kbd>
      </div>

      <Command.List className="max-h-[60vh] overflow-y-auto px-2 py-2">
        {loading ? (
          <div className="px-3 py-6 text-center text-xs text-secondary">
            {t("common.loading")}
          </div>
        ) : null}

        {recents.length > 0 && query.trim().length === 0 ? (
          <Command.Group
            heading={t("command.recent")}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-secondary"
          >
            {recents.map((r) => (
              <ItemRow key={r.id} item={r} onSelect={handleSelect} />
            ))}
          </Command.Group>
        ) : null}

        <EmptyMessage t={t} allItems={allItems} recents={recents} />

        {groupBy(allItems, (i) => i.group).map(([group, items]) => (
          <Command.Group
            key={group}
            heading={group}
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-secondary"
          >
            {items.map((item) => (
              <ItemRow key={item.id} item={item} onSelect={handleSelect} />
            ))}
          </Command.Group>
        ))}
      </Command.List>

      <footer className="flex items-center justify-between gap-3 border-t border-outline-variant bg-surface-1 px-4 py-2 text-[10px] text-secondary">
        <span>{t("command.footer.hint")}</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-outline-variant bg-surface-0 px-1 font-mono">↑</kbd>
            <kbd className="rounded border border-outline-variant bg-surface-0 px-1 font-mono">↓</kbd>
            {t("command.footer.navigate")}
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-outline-variant bg-surface-0 px-1 font-mono">↵</kbd>
            {t("command.footer.select")}
          </span>
          <a
            href="#shortcuts"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              window.dispatchEvent(new CustomEvent("ij:shortcuts-open"));
            }}
            className="hover:text-on-surface"
          >
            {t("command.footer.shortcuts")}
          </a>
        </span>
      </footer>
    </Command.Dialog>
  );
}

function ItemRow({
  item,
  onSelect,
}: {
  item: CommandItem;
  onSelect: (item: CommandItem) => void;
}) {
  return (
    <Command.Item
      value={`${item.title} ${item.subtitle ?? ""} ${item.kind}`}
      onSelect={() => onSelect(item)}
      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-on-surface data-[selected=true]:bg-surface-container data-[selected=true]:text-on-surface"
    >
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-container-low text-secondary"
      >
        <KindIcon kind={item.kind} />
      </span>
      <span className="flex flex-1 flex-col min-w-0">
        <span className="truncate font-medium">{item.title}</span>
        {item.subtitle ? (
          <span className="truncate text-xs text-secondary">{item.subtitle}</span>
        ) : null}
      </span>
    </Command.Item>
  );
}

function EmptyMessage({
  t,
  allItems,
  recents,
}: {
  t: ReturnType<typeof useTranslations>["t"];
  allItems: CommandItem[];
  recents: CommandItem[];
}) {
  if (allItems.length > 0 || recents.length > 0) return null;
  return (
    <Command.Empty className="py-8 text-center text-sm text-secondary">
      {t("command.empty")}
    </Command.Empty>
  );
}

function KindIcon({ kind }: { kind: CommandItem["kind"] }) {
  const c = "h-3.5 w-3.5";
  if (kind === "course") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    );
  }
  if (kind === "exam") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5h6m-6 0a2 2 0 00-2 2v12l3-2 3 2 3-2 3 2V7a2 2 0 00-2-2" />
      </svg>
    );
  }
  if (kind === "assignment") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (kind === "student") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    );
  }
  if (kind === "lesson") {
    return (
      <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253" />
      </svg>
    );
  }
  return (
    <svg className={c} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function groupBy<T, K extends string>(items: T[], key: (item: T) => K): Array<[K, T[]]> {
  const map = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = map.get(k);
    if (arr) arr.push(it);
    else map.set(k, [it]);
  }
  return Array.from(map.entries());
}
