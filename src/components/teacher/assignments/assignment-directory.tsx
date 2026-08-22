"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AssignmentStatusBadge } from "@/components/assignments/assignment-status-badge";
import { DeadlineBadge } from "@/components/assignments/deadline-badge";
import { AssignmentCard } from "./assignment-card";
import type { AssignmentWithCounts } from "@/services/assignments";
import type { CourseWithCounts } from "@/types/course";
import { useTranslations } from "@/i18n/client";

interface AssignmentDirectoryProps {
  assignments: AssignmentWithCounts[];
  courses: CourseWithCounts[];
  scopedCourseId?: string;
}

export function AssignmentDirectory({
  assignments,
  courses,
  scopedCourseId,
}: AssignmentDirectoryProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "published" | "closed">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(scopedCourseId ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const courseMap = useMemo(() => {
    return new Map(courses.map((c) => [c.id, c.title]));
  }, [courses]);

  const counts = useMemo(() => {
    const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionCount || 0), 0);
    const totalGraded = assignments.reduce((acc, a) => acc + (a.gradedCount || 0), 0);

    return {
      all: assignments.length,
      published: assignments.filter((a) => a.status === "published").length,
      draft: assignments.filter((a) => a.status === "draft").length,
      closed: assignments.filter((a) => a.status === "closed").length,
      totalSubmissions,
      totalGraded,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      if (activeTab !== "all" && asg.status !== activeTab) {
        return false;
      }
      if (selectedCourseId !== "all" && asg.courseId !== selectedCourseId) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = asg.title.toLowerCase().includes(query);
        const descMatch = asg.instructions.toLowerCase().includes(query);
        const courseMatch = courseMap.get(asg.courseId)?.toLowerCase().includes(query) ?? false;
        if (!titleMatch && !descMatch && !courseMatch) {
          return false;
        }
      }
      return true;
    });
  }, [assignments, activeTab, selectedCourseId, searchQuery, courseMap]);

  const createHref = scopedCourseId
    ? `/teacher/assignments/new?courseId=${scopedCourseId}`
    : selectedCourseId !== "all"
      ? `/teacher/assignments/new?courseId=${selectedCourseId}`
      : "/teacher/assignments/new";

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.assignments.stat.total")}
            </span>
            <div className="rounded-lg bg-surface-container p-2 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-primary">{counts.all}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">
            {t("teacher.assignments.submissionRatio", {
              submitted: counts.totalSubmissions,
              graded: counts.totalGraded,
            })}
          </span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.assignments.stat.published")}
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{counts.published}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">
            {t("teacher.examDirectory.liveForStudents")}
          </span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.assignments.stat.drafts")}
            </span>
            <div className="rounded-lg bg-surface-container p-2 text-secondary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-secondary">{counts.draft}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">
            {t("teacher.examDirectory.underDevelopment")}
          </span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("teacher.assignments.stat.closed")}
            </span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-slate-700">{counts.closed}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">
            {t("deadline.closed")}
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        {/* Status Tabs */}
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
            {t("teacher.assignments.tabs.all")} ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("draft")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "draft"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {t("teacher.assignments.tabs.draft")} ({counts.draft})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("published")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "published"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {t("teacher.assignments.tabs.published")} ({counts.published})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("closed")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "closed"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            {t("teacher.assignments.tabs.closed")} ({counts.closed})
          </button>
        </div>

        {/* Search, Course selector & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {!scopedCourseId && courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface outline-none focus:border-primary"
            >
              <option value="all">{t("teacher.assignments.allCourses")}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("teacher.assignments.searchPlaceholder")}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 pl-8 text-xs text-on-surface outline-none focus:border-primary"
            />
            <svg
              className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-2 text-xs text-secondary hover:text-on-surface"
              >
                ✕
              </button>
            )}
          </div>

          {/* Grid / Table View Switcher */}
          <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-low p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title={t("teacher.assignments.gridView")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              title={t("teacher.assignments.tableView")}
              className={`rounded-md p-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-surface-container-lowest text-primary shadow-2xs"
                  : "text-secondary hover:text-on-surface"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
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
            {scopedCourseId
              ? t("teacher.courseAssignments.emptyTitle")
              : t("teacher.assignments.emptyTitle")}
          </h3>
          <p className="mx-auto max-w-md text-xs text-secondary">
            {scopedCourseId
              ? t("teacher.courseAssignments.emptyDesc")
              : t("teacher.assignments.emptyDesc")}
          </p>
          <div className="pt-2">
            <Link
              href={createHref}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>{t("teacher.assignments.createFirst")}</span>
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
                if (!scopedCourseId) setSelectedCourseId("all");
                setSearchQuery("");
              }}
              className="inline-flex items-center rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
            >
              {t("teacher.assignments.resetFilters")}
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssignments.map((asg) => (
            <AssignmentCard
              key={asg.id}
              assignment={asg}
              courseTitle={courseMap.get(asg.courseId)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-secondary">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">{t("teacher.assignments.thTitle")}</th>
                  <th className="px-5 py-3.5 font-semibold">{t("teacher.assignments.thStatus")}</th>
                  <th className="px-5 py-3.5 font-semibold">{t("teacher.assignments.thDueDate")}</th>
                  <th className="px-5 py-3.5 font-semibold">{t("teacher.assignments.thPoints")}</th>
                  <th className="px-5 py-3.5 font-semibold">{t("teacher.assignments.thSubmissions")}</th>
                  <th className="px-5 py-3.5 text-right font-semibold">{t("teacher.assignments.thActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredAssignments.map((asg) => (
                  <tr key={asg.id} className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/teacher/assignments/${asg.id}`}
                        className="font-semibold text-on-surface hover:text-primary transition-colors block"
                      >
                        {asg.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-secondary truncate max-w-xs">
                        {courseMap.get(asg.courseId) || "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <AssignmentStatusBadge status={asg.status} size="sm" />
                    </td>
                    <td className="px-5 py-4">
                      <DeadlineBadge
                        dueAt={asg.dueAt}
                        isClosed={asg.status === "closed"}
                        size="sm"
                      />
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-primary">
                      {t("teacher.assignments.pointsCount", { points: asg.maxPoints })}
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant font-medium">
                      {t("teacher.assignments.submissionRatio", {
                        submitted: asg.submissionCount,
                        graded: asg.gradedCount,
                      })}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {asg.status === "draft" && (
                          <Link
                            href={`/teacher/assignments/${asg.id}/edit`}
                            className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                          >
                            {t("teacher.assignments.editAssignment")}
                          </Link>
                        )}
                        <Link
                          href={`/teacher/assignments/${asg.id}`}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-2xs hover:bg-primary-container transition-colors"
                        >
                          {asg.submissionCount > 0
                            ? t("teacher.assignments.viewSubmissions")
                            : t("teacher.assignments.details")}
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
