"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { StudentAssignmentCard } from "./student-assignment-card";
import type { StudentAssignmentSummary } from "@/services/assignments";
import { useTranslations } from "@/i18n/client";

import { PageHeader } from "@/components/shared/ui/page-header";
import { Stat } from "@/components/shared/ui/stat";
import { Tabs } from "@/components/shared/ui/tabs";
import { EmptyState } from "@/components/shared/feedback/empty-state";
import { Button } from "@/components/shared/ui/button";
import { Input } from "@/components/shared/ui/field";
import {
  ArrowRightIcon,
  ClipboardIcon,
  SearchIcon,
} from "@/components/shared/ui/icons";
import { cn } from "@/lib/utils";

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

  const tabs = [
    { value: "all", label: t("teacher.assignments.tabs.all"), count: stats.total },
    { value: "pending", label: t("student.assignments.stat.pending"), count: stats.pending },
    { value: "submitted", label: t("student.assignments.stat.submitted"), count: stats.submitted },
    { value: "graded", label: t("student.assignments.stat.graded"), count: stats.graded },
  ];

  const hasFilters = activeTab !== "all" || searchQuery.trim() !== "";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/student/courses/${courseId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-ink-900"
          >
            {courseTitle}
            <ArrowRightIcon size={12} />
          </Link>
        }
        title={t("student.assignments.title", { course: courseTitle })}
        description={t("student.assignments.subtitle")}
        actions={
          <Link
            href={`/student/courses/${courseId}`}
            className="hidden sm:inline-flex"
          >
            <Button variant="outline" size="md">
              {t("student.assignments.returnToLessons")}
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat
          label={t("student.assignments.stat.total")}
          value={stats.total}
          tone="primary"
        />
        <Stat
          label={t("student.assignments.stat.pending")}
          value={stats.pending}
          tone="warning"
        />
        <Stat
          label={t("student.assignments.stat.submitted")}
          value={stats.submitted}
          tone="primary"
        />
        <Stat
          label={t("student.assignments.stat.graded")}
          value={stats.graded}
          tone="success"
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        <Tabs
          items={tabs}
          value={activeTab}
          onChange={(v) => setActiveTab(v as typeof activeTab)}
          className="w-fit"
        />
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
            <SearchIcon size={14} />
          </span>
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("teacher.assignments.searchPlaceholder")}
            className="pl-9"
          />
        </div>
      </div>

      {assignments.length === 0 ? (
        <EmptyState
          icon={<ClipboardIcon size={20} />}
          title={t("student.assignments.emptyTitle")}
          description={t("student.assignments.emptyDesc")}
          action={
            <Link href={`/student/courses/${courseId}`}>
              <Button variant="primary" size="md">
                {t("student.assignments.returnToLessons")}
              </Button>
            </Link>
          }
        />
      ) : filteredAssignments.length === 0 ? (
        <div
          className={cn(
            "rounded-3xl border border-outline-variant bg-surface-0 p-8 text-center",
          )}
        >
          <p className="text-sm font-semibold text-ink-900">
            {t("teacher.assignments.noMatches")}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {t("teacher.assignments.noMatchesHint")}
          </p>
          {hasFilters ? (
            <Button
              variant="outline"
              size="md"
              className="mt-4"
              onClick={() => {
                setActiveTab("all");
                setSearchQuery("");
              }}
            >
              {t("teacher.assignments.resetFilters")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
