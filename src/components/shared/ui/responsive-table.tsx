/**
 * ResponsiveTable — a table that becomes a card list on mobile.
 *
 * Desktop: a normal <table>.
 * Mobile (<640px): the table is hidden; the rows prop is rendered
 *   as a stacked card list. The card receives `row` plus any
 *   cell data via the `columns` definitions.
 *
 * This is the single biggest mobile fix we can ship. Use this
 * anywhere a wide admin/teacher table would otherwise horizontally
 * scroll forever on a phone.
 */

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ResponsiveTableColumn<TRow> {
  /** Header label (also used as accessible label on mobile cards). */
  header: ReactNode;
  /** Tailwind classes for the cell on desktop. */
  className?: string;
  /** Render the cell for a given row. */
  cell: (row: TRow, index: number) => ReactNode;
  /** If set, this column is rendered into the mobile card body. */
  mobileLabel?: ReactNode;
  /** If set, this column appears prominently on the mobile card. */
  mobilePrimary?: boolean;
  /** Optional className for the cell on mobile (inside the card). */
  mobileClassName?: string;
}

export interface ResponsiveTableProps<TRow> {
  columns: ResponsiveTableColumn<TRow>[];
  rows: TRow[];
  /** Unique key extractor. */
  rowKey: (row: TRow, index: number) => string;
  /** Render the leading area of the mobile card (e.g. avatar/title). */
  mobileLeading?: (row: TRow) => ReactNode;
  /** Render the trailing area of the mobile card (e.g. actions menu). */
  mobileTrailing?: (row: TRow) => ReactNode;
  /** Render the entire mobile card body if you need full control. */
  mobileBody?: (row: TRow) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function ResponsiveTable<TRow>({
  columns,
  rows,
  rowKey,
  mobileLeading,
  mobileTrailing,
  mobileBody,
  emptyState,
  className,
}: ResponsiveTableProps<TRow>) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-1 text-left">
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={cn(
                        "px-4 py-3 text-micro font-semibold uppercase tracking-wide text-ink-500",
                        col.className,
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {rows.length === 0 && emptyState ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-ink-500">
                      {emptyState}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr key={rowKey(row, idx)} className="hover:bg-surface-1/60">
                      {columns.map((col, i) => (
                        <td key={i} className={cn("px-4 py-3 align-middle", col.className)}>
                          {col.cell(row, idx)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden">
        {rows.length === 0 && emptyState ? (
          <div className="px-1">{emptyState}</div>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, idx) => (
              <li
                key={rowKey(row, idx)}
                className="rounded-2xl border border-outline-variant bg-surface-0 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {mobileLeading ? mobileLeading(row) : null}
                  </div>
                  {mobileTrailing ? <div className="shrink-0">{mobileTrailing(row)}</div> : null}
                </div>
                {mobileBody ? (
                  <div className="mt-3">{mobileBody(row)}</div>
                ) : (
                  <dl className="mt-3 space-y-2">
                    {columns
                      .filter((c) => !c.mobilePrimary)
                      .map((col, i) => (
                        <div
                          key={i}
                          className="flex items-start justify-between gap-3 text-sm"
                        >
                          <dt className="shrink-0 text-micro font-semibold uppercase tracking-wide text-ink-500">
                            {col.mobileLabel ?? col.header}
                          </dt>
                          <dd className={cn("text-right", col.mobileClassName)}>
                            {col.cell(row, idx)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
