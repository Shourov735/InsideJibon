import Link from "next/link";
import type { ReactNode } from "react";

/**
 * R0 §3.2: server-side wrapper for a detail page (course detail,
 * exam detail, assignment detail). Standardizes:
 *   - breadcrumb + back link
 *   - title + subtitle + role badge slot
 *   - tab bar driven by `searchParams.tab`
 *   - right-rail actions slot
 *
 * R1 introduces the per-page sections that consume this shell. R0
 * ships the shell alone; no existing pages are migrated yet.
 */
export interface ResourceTab {
  id: string;
  label: string;
  /** When false the tab is rendered but disabled (e.g. locked until prerequisite). */
  enabled?: boolean;
}

export interface ResourceDetailShellProps {
  /** Breadcrumb trail. The last item is the current page. */
  breadcrumbs: Array<{ label: string; href?: string }>;
  /** Page title — typically the entity's display name. */
  title: string;
  /** Short subtitle / summary shown under the title. */
  subtitle?: string;
  /** Optional badge / status pill rendered next to the title. */
  badge?: ReactNode;
  /** Tabs to render. The currently active tab is the one matching `activeTab`. */
  tabs: ResourceTab[];
  activeTab: string;
  /** Active tab content. */
  children: ReactNode;
  /** Right-rail action area (e.g. edit, publish, archive buttons). */
  actions?: ReactNode;
}

export function ResourceDetailShell({
  breadcrumbs,
  title,
  subtitle,
  badge,
  tabs,
  activeTab,
  children,
  actions,
}: ResourceDetailShellProps) {
  return (
    <section className="flex flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-xs text-secondary">
        <ol className="flex flex-wrap items-center gap-1">
          {breadcrumbs.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-on-surface transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-on-surface">
                  {crumb.label}
                </span>
              )}
              {index < breadcrumbs.length - 1 ? (
                <span aria-hidden className="px-1 text-outline">
                  /
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-on-surface">{title}</h1>
            {badge}
          </div>
          {subtitle ? <p className="text-sm text-secondary">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      {tabs.length > 0 ? (
        <nav
          aria-label="Section tabs"
          className="flex flex-wrap items-center gap-1 border-b border-outline-variant"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            const disabled = tab.enabled === false;
            const baseClass =
              "rounded-t-lg px-3 py-2 text-xs font-semibold transition-colors";
            const activeClass = isActive
              ? "border-b-2 border-primary text-primary"
              : "text-secondary hover:text-on-surface";
            const disabledClass = disabled ? "opacity-50 cursor-not-allowed" : "";
            const className = `${baseClass} ${activeClass} ${disabledClass}`;

            if (disabled || !tab.id) {
              return (
                <span key={tab.id} className={className} aria-disabled>
                  {tab.label}
                </span>
              );
            }
            return (
              <Link
                key={tab.id}
                href={{ query: { tab: tab.id } }}
                scroll={false}
                className={className}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div>{children}</div>
    </section>
  );
}
