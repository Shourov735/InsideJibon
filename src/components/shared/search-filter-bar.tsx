"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "@/i18n/client";

interface FilterOption {
  value: string;
  label: string;
}

interface SearchFilterBarProps {
  searchPlaceholder?: string;
  filters?: Array<{
    param: string;
    label: string;
    allLabel: string;
    options: FilterOption[];
  }>;
}

export function SearchFilterBar({
  searchPlaceholder,
  filters = [],
}: SearchFilterBarProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams("q", val.trim());
    }, 350);
  };

  const hasFilters =
    Boolean(searchParams.get("q")) ||
    filters.some((f) => Boolean(searchParams.get(f.param)));

  const clearAll = () => {
    router.replace(pathname, { scroll: false });
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 min-w-0">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={searchPlaceholder ?? t("common.searchPlaceholder")}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-4 text-sm text-on-surface shadow-2xs transition-colors placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <select
          key={filter.param}
          value={searchParams.get(filter.param) ?? ""}
          onChange={(e) => updateParams(filter.param, e.target.value)}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface shadow-2xs transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label={filter.label}
        >
          <option value="">{filter.allLabel}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {/* Clear Button */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="shrink-0 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-xs font-medium text-secondary transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          {t("common.clearFilters")}
        </button>
      )}
    </div>
  );
}
