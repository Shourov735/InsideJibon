/**
 * Tabs — minimal segmented control.
 *
 * Server-renderable with progressive enhancement: works as
 * anchor links by default. If `onChange` is provided it behaves
 * like a controlled component on the client.
 */

"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: ReactNode;
  href?: string;
  count?: number | string;
}

export interface TabsProps {
  items: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  /** Render as a vertical list on mobile. */
  scrollable?: boolean;
}

export function Tabs({ items, value, onChange, className, scrollable = true }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 rounded-2xl border border-outline-variant bg-surface-1 p-1",
        scrollable ? "overflow-x-auto" : "flex-wrap",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        const cls = cn(
          "inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition-colors duration-150",
          active
            ? "bg-surface-0 text-ink-900 shadow-[0_1px_0_0_rgba(0,0,0,0.04)]"
            : "text-ink-500 hover:text-ink-900",
        );
        if (item.href && !onChange) {
          return (
            <a key={item.value} href={item.href} role="tab" aria-selected={active} className={cls}>
              {item.label}
              {item.count != null ? (
                <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
                  {item.count}
                </span>
              ) : null}
            </a>
          );
        }
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(item.value)}
            className={cls}
          >
            {item.label}
            {item.count != null ? (
              <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-700">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
