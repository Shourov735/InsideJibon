"use client";

import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";
import {
  toggleEmailCategoryAction,
  setAllEmailCategoriesAction,
} from "@/services/email/preferences";

type Category = "engagement" | "marketing" | "parent_digest";

type PrefRow = {
  category: Category;
  title: string;
  description: string;
  enabled: boolean;
  transactional?: boolean;
};

export function EmailPreferencesForm({
  rows,
  locale,
  saveLabel,
  savedLabel,
  unsubscribeAllLabel,
  resubscribeAllLabel,
}: {
  rows: PrefRow[];
  locale: "en" | "bn";
  saveLabel: string;
  savedLabel: string;
  unsubscribeAllLabel: string;
  resubscribeAllLabel: string;
}) {
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onToggle = (category: Category, enabled: boolean) => {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("category", category);
      fd.set("enabled", String(enabled));
      const res = await toggleEmailCategoryAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Could not save preferences.");
        return;
      }
      setSavedAt(Date.now());
    });
  };

  const onAll = (enabled: boolean) => {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("enabled", String(enabled));
      const res = await setAllEmailCategoriesAction(fd);
      if (!res.ok) {
        setError(res.error ?? "Could not save preferences.");
        return;
      }
      setSavedAt(Date.now());
    });
  };

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div
          key={row.category}
          className="flex items-start justify-between gap-4 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface">{row.title}</p>
            <p className="mt-1 text-xs text-on-surface-variant">{row.description}</p>
            {row.transactional ? (
              <p className="mt-1 text-[10px] uppercase tracking-wider text-on-surface-variant">
                {locale === "bn" ? "বাধ্যতামূলক" : "Required"}
              </p>
            ) : null}
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              defaultChecked={row.enabled}
              disabled={pending || row.transactional}
              onChange={(event) => onToggle(row.category, event.target.checked)}
              className="peer sr-only"
              aria-label={row.title}
            />
            <span
              className={cn(
                "h-6 w-11 rounded-full bg-outline-variant transition-colors",
                "peer-checked:bg-primary",
                "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
                "after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-['']",
                "peer-checked:after:translate-x-5"
              )}
            />
          </label>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => onAll(false)}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
        >
          {unsubscribeAllLabel}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onAll(true)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:bg-primary/90 disabled:opacity-50"
        >
          {resubscribeAllLabel}
        </button>
        <span className="text-xs text-on-surface-variant">
          {savedAt ? saveLabel : ""}
        </span>
        {error ? (
          <span className="text-xs text-red-600">{error}</span>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {savedAt ? savedLabel : ""}
      </p>
    </div>
  );
}
