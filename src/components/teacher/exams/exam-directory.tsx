"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ExamWithQuestionCount } from "@/types/exam";
import type { CourseWithCounts } from "@/types/course";
import { StatusBadge } from "../status-badge";
import { ExamCard } from "./exam-card";

interface ExamDirectoryProps {
  exams: ExamWithQuestionCount[];
  courses: CourseWithCounts[];
}

export function ExamDirectory({ exams, courses }: ExamDirectoryProps) {
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "published" | "archived">("all");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Map courses for quick lookup
  const courseMap = useMemo(() => {
    return new Map(courses.map((c) => [c.id, c.title]));
  }, [courses]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: exams.length,
      published: exams.filter((e) => e.status === "published").length,
      draft: exams.filter((e) => e.status === "draft").length,
      archived: exams.filter((e) => e.status === "archived").length,
      totalQuestions: exams.reduce((acc, e) => acc + (e.questionCount || 0), 0),
    };
  }, [exams]);

  // Filtered exams
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      // Tab filter
      if (activeTab !== "all" && exam.status !== activeTab) {
        return false;
      }
      // Course filter
      if (selectedCourseId !== "all" && exam.courseId !== selectedCourseId) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = exam.title.toLowerCase().includes(query);
        const descMatch = exam.description?.toLowerCase().includes(query) ?? false;
        const courseMatch =
          courseMap.get(exam.courseId)?.toLowerCase().includes(query) ?? false;
        if (!titleMatch && !descMatch && !courseMatch) {
          return false;
        }
      }
      return true;
    });
  }, [exams, activeTab, selectedCourseId, searchQuery, courseMap]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Total Exams
            </span>
            <div className="rounded-lg bg-surface-container p-2 text-primary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-primary">{counts.all}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">
            {counts.totalQuestions} questions across exams
          </span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Published
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{counts.published}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">Live for students</span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Drafts
            </span>
            <div className="rounded-lg bg-surface-container p-2 text-secondary">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-secondary">{counts.draft}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">Under development</span>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Archived
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-amber-700">{counts.archived}</p>
          <span className="mt-1 block text-xs text-on-surface-variant">Stored or retired</span>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Search & Course Selector */}
      <div className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        {/* Status Filter Tabs */}
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
            All ({counts.all})
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
            Drafts ({counts.draft})
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
            Published ({counts.published})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === "archived"
                ? "bg-primary text-on-primary shadow-xs"
                : "text-secondary hover:bg-surface-container-low hover:text-on-surface"
            }`}
          >
            Archived ({counts.archived})
          </button>
        </div>

        {/* Search, Course Selector & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Course Selector */}
          {courses.length > 0 && (
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-medium text-on-surface outline-none focus:border-primary"
            >
              <option value="all">All Associated Courses</option>
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
              placeholder="Search exams…"
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
              title="Grid View"
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
              title="Table View"
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

      {/* Main List / Table or Empty States */}
      {exams.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-12 text-center shadow-xs">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-bold text-on-surface">No exams created yet</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-secondary">
            Build interactive question papers, set time limits, and publish examinations for your course students.
          </p>
          <div className="mt-6">
            <Link
              href="/teacher/exams/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Your First Exam</span>
            </Link>
          </div>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs">
          <p className="text-sm font-medium text-on-surface">
            No exams match the selected filter criteria.
          </p>
          <p className="mt-1 text-xs text-secondary">
            Try adjusting your search query, status tab, or course selection.
          </p>
          <button
            type="button"
            onClick={() => {
              setActiveTab("all");
              setSelectedCourseId("all");
              setSearchQuery("");
            }}
            className="mt-4 inline-flex items-center rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              courseTitle={courseMap.get(exam.courseId)}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-wider text-secondary">
                <tr>
                  <th className="px-5 py-3 font-semibold">Exam Title & Details</th>
                  <th className="px-5 py-3 font-semibold">Associated Course</th>
                  <th className="px-5 py-3 font-semibold">Questions</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Duration</th>
                  <th className="px-5 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-surface-container-low/70 transition-colors">
                    <td className="px-5 py-4">
                      <Link
                        href={`/teacher/exams/${exam.id}`}
                        className="font-semibold text-on-surface hover:text-primary transition-colors block"
                      >
                        {exam.title}
                      </Link>
                      <p className="mt-0.5 max-w-sm truncate text-xs text-on-surface-variant">
                        {exam.description || "No description"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-secondary">
                      {courseMap.get(exam.courseId) ? (
                        <Link
                          href={`/teacher/courses/${exam.courseId}`}
                          className="hover:underline hover:text-primary truncate block max-w-xs"
                        >
                          {courseMap.get(exam.courseId)}
                        </Link>
                      ) : (
                        <span className="text-outline">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant font-medium text-xs">
                      {exam.questionCount} {exam.questionCount === 1 ? "q" : "questions"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={exam.status} />
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant">
                      {exam.durationMinutes ? `${exam.durationMinutes} mins` : "Untimed"}
                    </td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant">
                      {new Date(exam.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/teacher/exams/${exam.id}/builder`}
                          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary shadow-2xs hover:bg-primary-container hover:text-on-primary-container transition-colors"
                        >
                          {exam.status === "draft" ? "Builder" : "View"}
                        </Link>
                        <Link
                          href={`/teacher/exams/${exam.id}`}
                          className="rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                        >
                          Details
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
