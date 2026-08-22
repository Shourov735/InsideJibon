"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ExamPublishCheck, ExamWithQuestions } from "@/types/exam";
import type { Course, CourseWithCounts } from "@/types/course";
import { StatusBadge } from "../status-badge";
import { useTranslations } from "@/i18n/client";
import { ExamPublishModal } from "./builder/exam-publish-modal";
import {
  archiveExamAction,
  deleteExamAction,
  restoreExamAction,
  unpublishExamAction,
} from "@/app/teacher/exams/actions";

interface ExamDetailViewProps {
  exam: ExamWithQuestions;
  course: Course | CourseWithCounts | null;
  publishCheck: ExamPublishCheck;
}

export function ExamDetailView({
  exam,
  course,
  publishCheck,
}: ExamDetailViewProps) {
  const { t, tn, locale } = useTranslations();
  const router = useRouter();
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const formattedCreated = new Intl.DateTimeFormat(
    locale === "bn" ? "bn-BD" : "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  ).format(new Date(exam.createdAt));

  const formattedPublished = exam.publishedAt
    ? new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(exam.publishedAt))
    : null;

  const handleUnpublish = async () => {
    setIsUnpublishing(true);
    setActionError(null);
    try {
      const res = await unpublishExamAction({ examId: exam.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("teacher.examDetail.failedUnpublish")
      );
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm(t("teacher.examDetail.archiveConfirm"))) return;
    setIsArchiving(true);
    setActionError(null);
    try {
      const res = await archiveExamAction({ examId: exam.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("teacher.examDetail.failedArchive")
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setActionError(null);
    try {
      const res = await restoreExamAction({ examId: exam.id });
      if (!res.success) {
        setActionError(res.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("teacher.examDetail.failedRestore")
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("teacher.examDetail.deleteConfirm"))) {
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      const res = await deleteExamAction({ examId: exam.id });
      if (!res.success) {
        setActionError(res.error);
        setIsDeleting(false);
        return;
      }
      router.push("/teacher/exams");
      router.refresh();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t("teacher.examDetail.failedDelete")
      );
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-secondary">
        <Link href="/teacher/exams" className="hover:text-primary transition-colors">
          {t("teacher.examForm.breadcrumb.exams")}
        </Link>
        <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-on-surface font-semibold truncate max-w-xs">{exam.title}</span>
      </div>

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-error-container bg-error-container/40 p-4 text-xs text-on-error-container">
          <svg className="h-4 w-4 shrink-0 text-error mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold">{t("teacher.examDetail.actionFailed")}</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
        </div>
      )}

      {/* Main Header Overview Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              {course ? (
                <Link
                  href={`/teacher/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-primary transition-colors"
                >
                  <svg className="h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="truncate">{course.title}</span>
                </Link>
              ) : null}
              <StatusBadge
              status={exam.status}
              label={exam.status === "draft" ? t("common.status.draft") : exam.status === "published" ? t("common.status.published") : t("common.status.archived")}
            />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {exam.title}
            </h1>

            <p className="text-sm text-on-surface-variant leading-relaxed max-w-3xl">
              {exam.description || t("teacher.examDetail.noDescription")}
            </p>

            {/* Metrics Chips */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-medium text-secondary">
              <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>{tn("common.questionCountUpper", exam.questions.length)}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
                <span>{t("teacher.examDetail.totalMarks", { marks: exam.totalMarks })}</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-3 py-1.5">
                <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  {exam.durationMinutes
                    ? t("teacher.examDetail.duration", {
                        minutes: exam.durationMinutes,
                      })
                    : t("common.status.untimed")}
                </span>
              </div>

              <span className="text-[11px] text-outline">
                {t("teacher.examDetail.createdOn", { date: formattedCreated })}
                {formattedPublished &&
                  t("teacher.examDetail.publishedOn", { date: formattedPublished })}
              </span>
            </div>
          </div>

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href={`/teacher/exams/${exam.id}/builder`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>
                {exam.status === "draft"
                  ? t("teacher.examDetail.openBuilder")
                  : t("teacher.examDetail.viewBuilder")}
              </span>
            </Link>

            <Link
              href={`/teacher/exams/${exam.id}/edit`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
            >
              <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{t("teacher.courseOverview.editSettings")}</span>
            </Link>

            <a
              href={`/api/export/exams/${exam.id}/results`}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container hover:text-primary"
            >
              <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Results</span>
            </a>
          </div>
        </div>
      </div>

      {/* Lifecycle Status & Publishing Card */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">
            {t("teacher.examDetail.publishChecklistTitle")}
          </h2>
          <span className="text-xs font-semibold text-secondary">
            {t("teacher.examDetail.statusLabel")}{" "}
            <span className="capitalize text-primary font-bold">
              {exam.status === "draft"
                ? t("common.status.draft")
                : exam.status === "published"
                  ? t("common.status.published")
                  : t("common.status.archived")}
            </span>
          </span>
        </div>

        {exam.status === "draft" && (
          <div className="space-y-4">
            {publishCheck.canPublish ? (
              <div className="flex flex-col gap-4 rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      {t("teacher.examDetail.readyTitle")}
                    </h3>
                    <p className="mt-0.5 text-xs text-emerald-800">
                      {t("teacher.examDetail.readyDesc", {
                        questions: exam.questions.length,
                        marks: exam.totalMarks,
                      })}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer"
                >
                  <span>{t("teacher.examDetail.publishExam")}</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                  <svg className="h-4 w-4 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    {t("teacher.examDetail.prereqPending", {
                      count: publishCheck.errors.length,
                    })}
                  </span>
                </div>
                <ul className="space-y-1 text-xs text-amber-900 list-disc list-inside">
                  {publishCheck.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
                <div className="pt-1">
                  <Link
                    href={`/teacher/exams/${exam.id}/builder`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    {t("teacher.examDetail.resolveIssues")} →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {exam.status === "published" && (
          <div className="flex flex-col gap-4 rounded-xl border border-emerald-300 bg-emerald-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  {t("teacher.examDetail.liveTitle")}
                </h3>
                <p className="mt-0.5 text-xs text-emerald-800">
                  {t("teacher.examDetail.liveDesc")}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isUnpublishing}
              onClick={handleUnpublish}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isUnpublishing
                ? t("teacher.examDetail.unpublishing")
                : t("teacher.examDetail.unpublish")}
            </button>
          </div>
        )}

        {exam.status === "archived" && (
          <div className="flex flex-col gap-4 rounded-xl border border-amber-300 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-600 text-white">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  {t("teacher.examDetail.archivedTitle")}
                </h3>
                <p className="mt-0.5 text-xs text-amber-800">
                  {t("teacher.examDetail.archivedDesc")}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isRestoring}
              onClick={handleRestore}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {isRestoring
                ? t("teacher.examDetail.restoring")
                : t("teacher.examDetail.restore")}
            </button>
          </div>
        )}
      </div>

      {/* Formatted Question Paper Preview Section */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-outline-variant pb-4">
          <div>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {t("teacher.examDetail.paperPreview")}
            </span>
            <h2 className="mt-1 text-lg font-bold text-on-surface">
              {t("teacher.examDetail.paperOverview")}
            </h2>
          </div>
          <span className="text-xs font-semibold text-secondary">
            {tn("common.questionCountUpper", exam.questions.length)}
          </span>
        </div>

        {exam.questions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-outline-variant p-10 text-center space-y-3 bg-surface-container-low">
            <p className="text-sm text-secondary">
              {t("teacher.examDetail.noQuestions")}
            </p>
            <div>
              <Link
                href={`/teacher/exams/${exam.id}/builder`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-xs hover:bg-primary-container transition-colors"
              >
                <span>{t("teacher.examDetail.addQuestions")}</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {exam.questions.map((question) => (
              <div
                key={question.id}
                className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-2.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                      {question.position}
                    </span>
                    <p className="font-semibold text-sm text-on-surface whitespace-pre-wrap leading-relaxed pt-0.5">
                      {question.questionText}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-secondary">
                    {question.marks} {tn("student.exam.marks", question.marks)}
                  </span>
                </div>

                {/* Option list */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 pt-1">
                  {question.options.map((option) => (
                    <div
                      key={option.id}
                      className={`flex items-start gap-2.5 rounded-lg border p-3 text-xs transition-colors ${
                        option.isCorrect
                          ? "border-emerald-400 bg-emerald-50 text-emerald-950 font-medium"
                          : "border-outline-variant bg-surface-container-lowest text-on-surface"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          option.isCorrect
                            ? "bg-emerald-600 text-white"
                            : "bg-surface-container-high text-secondary"
                        }`}
                      >
                        {String.fromCharCode(64 + option.position)}
                      </span>
                      <span className="flex-1 break-words pt-0.5">{option.optionText}</span>
                      {option.isCorrect && (
                        <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                          {t("teacher.examDetail.correctBadge")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {question.explanation && (
                  <div className="rounded-lg bg-surface-container-low p-3 text-xs text-secondary border border-outline-variant/50">
                    <span className="font-bold text-on-surface">
                      {t("teacher.examDetail.explanationLabel")}
                    </span>
                    {question.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone & Exam Management */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-secondary">
          {t("teacher.examDetail.dangerTitle")}
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant pt-4">
          <div>
            <p className="text-sm font-semibold text-on-surface">
              {exam.status === "archived"
                ? t("teacher.examDetail.restore")
                : t("teacher.examDetail.archiveExam")}
            </p>
            <p className="text-xs text-on-surface-variant">
              {exam.status === "archived"
                ? t("teacher.examDetail.restoreDesc")
                : t("teacher.examDetail.archiveDesc")}
            </p>
          </div>

          {exam.status === "archived" ? (
            <button
              type="button"
              disabled={isRestoring}
              onClick={handleRestore}
              className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isRestoring
                ? t("teacher.examDetail.restoring")
                : t("teacher.examDetail.restore")}
            </button>
          ) : (
            <button
              type="button"
              disabled={isArchiving}
              onClick={handleArchive}
              className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isArchiving
                ? t("teacher.examDetail.archiving")
                : t("teacher.examDetail.archiveBtn")}
            </button>
          )}
        </div>

        {exam.status !== "published" && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-error/20 pt-4">
            <div>
              <p className="text-sm font-semibold text-error">
                {t("teacher.examDetail.deleteTitle")}
              </p>
              <p className="text-xs text-on-surface-variant">
                {t("teacher.examDetail.deleteDesc")}
              </p>
            </div>

            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className="rounded-xl bg-error px-4 py-2 text-xs font-semibold text-on-error hover:bg-error-container hover:text-on-error-container transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isDeleting
                ? t("teacher.examDetail.deleting")
                : t("teacher.examDetail.deletePermanent")}
            </button>
          </div>
        )}
      </div>

      {/* Publish Modal */}
      <ExamPublishModal
        exam={exam}
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        serverErrors={publishCheck.errors}
      />
    </div>
  );
}
