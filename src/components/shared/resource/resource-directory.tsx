import type { ReactNode } from "react";

import { SearchFilterBar } from "@/components/shared/search-filter-bar";

/**
 * R0 §3.2 + R1: reusable shell for a list-with-search-filter-tabs.
 * Used by every teacher/admin list page (courses, exams, assignments,
 * enrollments, students) so they all share the same visual language,
 * the same query-string contract, and the same empty state.
 *
 * This is an *introduced* shell: callers wire their data fetching into
 * `children` and use `columns` only for layout-level hints. R1 will
 * move existing lists (teacher/exams, teacher/assignments, etc.)
 * onto this shell in place of bespoke markup.
 */
export interface ResourceDirectoryProps<TRow> {
  /** Page heading — Bangla + English friendly. */
  title: string;
  /** Short Bangla/English subtitle shown under the title. */
  description?: string;
  /** Free-text search placeholder for the filter bar. */
  searchPlaceholder: string;
  /** Filter tabs (status, category, etc.) declared via `SearchFilterBar`'s contract. */
  filters?: Array<{
    param: string;
    label: string;
    allLabel: string;
    options: Array<{ value: string; label: string }>;
  }>;
  /** Row data resolved by the page (server component); typed loosely for shell use. */
  rows: ReadonlyArray<TRow>;
  /** Render a single row. Receives the row and the resolved query params. */
  renderRow: (row: TRow, ctx: ResourceRowContext) => ReactNode;
  /** Render an empty state when `rows` is empty. */
  emptyState?: ReactNode;
  /** Optional slot for page-level actions (e.g. "New course" button). */
  toolbar?: ReactNode;
  /** Optional active-filter summary, e.g. "Showing 3 of 27". */
  summary?: ReactNode;
}

export interface ResourceRowContext {
  search: Record<string, string>;
}

export function ResourceDirectory<TRow>({
  title,
  description,
  searchPlaceholder,
  filters,
  rows,
  renderRow,
  emptyState,
  toolbar,
  summary,
}: ResourceDirectoryProps<TRow>) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
        {description ? (
          <p className="text-sm text-secondary">{description}</p>
        ) : null}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SearchFilterBar
          searchPlaceholder={searchPlaceholder}
          filters={filters}
        />
        {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      </div>

      {summary}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
          {emptyState ?? (
            <p className="text-sm text-secondary">No items match your filters.</p>
          )}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li key={(row as { id?: string }).id ?? index}>
              {renderRow(row, { search: {} })}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
