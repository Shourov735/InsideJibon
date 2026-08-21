"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StudentAssignmentCard } from "./student-assignment-card";
import type { StudentAssignmentSummary } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

interface StudentAssignmentListProps {
  assignments: StudentAssignmentSummary[];
  courseId: string;
  courseTitle: string;
}

export function StudentAssignmentList({
  assignments,
  courseId,
  courseTitle,
}: StudentAssignmentListProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "submitted" | "graded">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const stats = useMemo(() => {
    const total = assignments.length;
    const submitted = assignments.filter(
      (a) => a.submission?.status === "submitted" || a.submission?.status === "graded"
    ).length;
    const graded = assignments.filter((a) => a.submission?.status === "graded").length;
    const pending = total - submitted;

    return { total, submitted, pending, graded };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      const status = item.submission?.status ?? "not_submitted";

      if (activeTab === "pending" && (status === "submitted" || status === "graded")) {
        return false;
      }
      if (activeTab === "submitted" && status !== "submitted" && status !== "graded") {
        return false;
      }
      if (activeTab === "graded" && status !== "graded") {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = item.assignment.title.toLowerCase().includes(q);
        const descMatch = item.assignment.instructions.toLowerCase().includes(q);
        if (!titleMatch && !descMatch) return false;
      }

      return true;
    });
  }, [assignments, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Return to lessons breadcrumb */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-secondary">
            <Link
              href={`/student/courses/${courseId}`}
              className="hover:text-primary transition-colors truncate max-w-xs"
            >
              {courseTitle}
            </Link>
            <span className="text-outline">/</span>
            <span className="text-on-surface">{t("student.assignments.breadcrumb")}</span>
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {t("student.assignments.title", { course: courseTitle })}
          </h1>
          <p className="mt-1 text-xs text-secondary max-w-xl">
            {t("student.assignments.subtitle")}
          </p>
        </div>

        <Link
          href={`/student/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors shrink-0"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>{t("student.assignments.returnToLessons")}</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("student.assignments.stat.total")}
          </span>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.total}</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("student.assignments.stat.pending")}
          </span>
          <p className="mt-2 text-3xl font-bold text-amber-700">{stats.pending}</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("student.assignments.stat.submitted")}
          </span>
          <p className="mt-2 text-3xl font-bold text-primary">{stats.submitted}</p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            {t("student.assignments.stat.graded")}
          </span>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.graded}</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "all"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {t("teacher.assignments.tabs.all")} ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pending")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "pending"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {t("student.assignments.stat.pending")} ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("submitted")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "submitted"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {t("student.assignments.stat.submitted")} ({stats.submitted})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("graded")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "graded"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {t("student.assignments.stat.graded")} ({stats.graded})
          </button>
        </div>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("teacher.assignments.searchPlaceholder")}
          className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary w-full sm:w-64"
        />
      </div>

      {/* Cards Grid */}
      {assignments.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-xs space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.75"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-base font-bold text-on-surface">
            {t("student.assignments.emptyTitle")}
          </h3>
          <p className="mx-auto max-w-md text-xs text-secondary">
            {t("student.assignments.emptyDesc")}
          </p>
          <div className="pt-2">
            <Link
              href={`/student/courses/${courseId}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container"
            >
              <span>{t("student.assignments.returnToLessons")}</span>
            </Link>
          </div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs space-y-2">
          <p className="text-sm font-semibold text-on-surface">
            {t("teacher.assignments.noMatches")}
          </p>
          <p className="text-xs text-secondary">
            {t("teacher.assignments.noMatchesHint")}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("all");
                setSearchQuery("");
              }}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container"
            >
              {t("teacher.assignments.resetFilters")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssignments.map((item) => (
            <StudentAssignmentCard
              key={item.assignment.id}
              assignment={item}
              courseId={courseId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
