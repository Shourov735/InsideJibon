"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createAssignmentAction,
  updateAssignmentAction,
} from "@/app/teacher/assignments/actions";
import {
  ASSIGNMENT_FILE_TYPES,
  MAX_ASSIGNMENT_TITLE_LENGTH,
  MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH,
  MAX_POINTS,
} from "@/schemas/assignment";
import type { Assignment } from "@/db/schema";
import type { CourseWithCounts } from "@/types/course";
import { useTranslations } from "@/i18n/client";

interface AssignmentFormProps {
  initialData?: Assignment;
  courses: CourseWithCounts[];
  preselectedCourseId?: string;
  courseLessons?: { id: string; title: string; moduleTitle?: string }[];
}

const FILE_TYPE_OPTIONS = [
  { key: "pdf", label: "PDF Documents (.pdf)", mime: "application/pdf" },
  { key: "doc", label: "Word Documents (.doc, .docx)", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", altMime: "application/msword" },
  { key: "ppt", label: "PowerPoint Presentations (.ppt, .pptx)", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", altMime: "application/vnd.ms-powerpoint" },
  { key: "xls", label: "Excel Spreadsheets (.xls, .xlsx)", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", altMime: "application/vnd.ms-excel" },
  { key: "image_png", label: "PNG Images (.png)", mime: "image/png" },
  { key: "image_jpeg", label: "JPEG / JPG Images (.jpg, .jpeg)", mime: "image/jpeg" },
  { key: "image_webp", label: "WebP Images (.webp)", mime: "image/webp" },
  { key: "zip", label: "ZIP Archives (.zip)", mime: "application/zip" },
  { key: "txt", label: "Text Files (.txt)", mime: "text/plain" },
];

const FILE_SIZE_OPTIONS = [
  { label: "5 MB", bytes: 5 * 1024 * 1024 },
  { label: "10 MB", bytes: 10 * 1024 * 1024 },
  { label: "25 MB (Standard)", bytes: 25 * 1024 * 1024 },
  { label: "50 MB (Maximum)", bytes: 50 * 1024 * 1024 },
];

export function AssignmentForm({
  initialData,
  courses,
  preselectedCourseId,
  courseLessons = [],
}: AssignmentFormProps) {
  const router = useRouter();
  const { t, locale } = useTranslations();
  const isEditing = Boolean(initialData);

  const titleId = useId();
  const courseIdInputId = useId();
  const lessonIdInputId = useId();
  const instructionsId = useId();
  const dueAtId = useId();
  const maxPointsId = useId();
  const allowLateId = useId();
  const maxFileSizeId = useId();

  const [courseId, setCourseId] = useState<string>(
    initialData?.courseId ?? preselectedCourseId ?? courses[0]?.id ?? ""
  );
  const [lessonId, setLessonId] = useState<string>(initialData?.lessonId ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [instructions, setInstructions] = useState(initialData?.instructions ?? "");

  // Format date to datetime-local string (YYYY-MM-DDTHH:mm)
  const initialDueAtString = initialData?.dueAt
    ? new Date(initialData.dueAt).toISOString().slice(0, 16)
    : "";
  const [dueAt, setDueAt] = useState<string>(initialDueAtString);

  const [maxPoints, setMaxPoints] = useState<number>(initialData?.maxPoints ?? 100);
  const [allowLateSubmission, setAllowLateSubmission] = useState<boolean>(
    initialData?.allowLateSubmission ?? false
  );

  // Allowed file types selection
  const initialTypes = initialData?.allowedFileTypes ?? [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/png",
    "image/jpeg",
    "application/zip",
  ];
  const [selectedMimes, setSelectedMimes] = useState<string[]>(initialTypes);
  const [maxFileSize, setMaxFileSize] = useState<number>(
    initialData?.maxFileSize ?? 25 * 1024 * 1024
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const toggleMime = (mime: string, altMime?: string) => {
    setSelectedMimes((prev) => {
      const exists = prev.includes(mime);
      if (exists) {
        return prev.filter((m) => m !== mime && m !== altMime);
      } else {
        const next = [...prev, mime];
        if (altMime && !next.includes(altMime)) {
          next.push(altMime);
        }
        return next;
      }
    });
  };

  const selectAllMimes = () => {
    const all = Array.from(
      new Set(
        FILE_TYPE_OPTIONS.flatMap((opt) => [opt.mime, opt.altMime].filter(Boolean) as string[])
      )
    );
    setSelectedMimes(all);
  };

  const clearAllMimes = () => {
    setSelectedMimes([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!courseId) {
      setErrorMessage(t("teacher.assignmentForm.courseRequired"));
      return;
    }

    if (!title.trim() || title.trim().length < 3) {
      setFieldErrors((prev) => ({
        ...prev,
        title: [t("teacher.assignmentPublish.checklistTitle")],
      }));
      return;
    }

    if (!instructions.trim() || instructions.trim().length < 10) {
      setFieldErrors((prev) => ({
        ...prev,
        instructions: [t("teacher.assignmentPublish.checklistInstructions")],
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      // Due date conversion: if datetime-local input is non-empty, convert to ISO
      let formattedDueAt: string | undefined = undefined;
      if (dueAt.trim()) {
        const parsed = new Date(dueAt);
        if (!isNaN(parsed.getTime())) {
          formattedDueAt = parsed.toISOString();
        }
      }

      if (isEditing && initialData) {
        const result = await updateAssignmentAction({
          assignmentId: initialData.id,
          courseId,
          lessonId: lessonId || null,
          title: title.trim(),
          instructions: instructions.trim(),
          dueAt: formattedDueAt ?? "",
          maxPoints: Number(maxPoints),
          allowLateSubmission,
          allowedFileTypes: selectedMimes,
          maxFileSize: Number(maxFileSize),
        });

        if (!result.success) {
          setErrorMessage(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }

        router.push(`/teacher/assignments/${initialData.id}`);
        router.refresh();
      } else {
        const result = await createAssignmentAction({
          courseId,
          lessonId: lessonId || null,
          title: title.trim(),
          instructions: instructions.trim(),
          dueAt: formattedDueAt ?? "",
          maxPoints: Number(maxPoints),
          allowLateSubmission,
          allowedFileTypes: selectedMimes,
          maxFileSize: Number(maxFileSize),
        });

        if (!result.success) {
          setErrorMessage(result.error);
          if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          return;
        }

        router.push(`/teacher/assignments/${result.data.id}`);
        router.refresh();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : t("teacher.assignmentDetail.failedAction")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (courses.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-lowest p-10 text-center shadow-xs space-y-3">
        <h3 className="text-base font-bold text-on-surface">{t("teacher.assignmentForm.courseRequired")}</h3>
        <p className="mx-auto max-w-sm text-xs text-secondary">
          {t("teacher.assignmentForm.courseRequiredDesc")}
        </p>
        <div className="pt-2">
          <Link
            href="/teacher/courses/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container"
          >
            <span>{t("teacher.assignmentForm.createCourseFirst")}</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-error/30 bg-error-container/40 p-4 text-xs font-medium text-on-error-container"
        >
          <svg className="h-4 w-4 text-error shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">{errorMessage}</div>
        </div>
      )}

      {/* Section 1: Associated Course & Lesson */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-3">
          {t("teacher.assignmentForm.associatedCourse")}
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Course Selector */}
          <div>
            <label htmlFor={courseIdInputId} className="block text-xs font-bold text-on-surface">
              {t("teacher.assignmentForm.associatedCourse")} <span className="text-error">*</span>
            </label>
            <select
              id={courseIdInputId}
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              disabled={isEditing || isSubmitting}
              className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.status})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-secondary">
              {isEditing
                ? t("teacher.assignmentForm.courseFixed")
                : t("teacher.assignmentForm.selectCourseHint")}
            </p>
          </div>

          {/* Optional Linked Lesson */}
          {courseLessons.length > 0 && (
            <div>
              <label htmlFor={lessonIdInputId} className="block text-xs font-bold text-on-surface">
                {t("teacher.assignmentForm.associatedLesson")}
              </label>
              <select
                id={lessonIdInputId}
                value={lessonId}
                onChange={(e) => setLessonId(e.target.value)}
                disabled={isSubmitting}
                className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              >
                <option value="">{t("teacher.assignmentForm.selectLesson")}</option>
                {courseLessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.moduleTitle ? `${l.moduleTitle} — ${l.title}` : l.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Assignment Content */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-3">
          {t("teacher.assignmentDetail.instructionsTitle")}
        </h3>

        {/* Title */}
        <div>
          <label htmlFor={titleId} className="block text-xs font-bold text-on-surface">
            {t("teacher.assignmentForm.titleField")} <span className="text-error">*</span>
          </label>
          <input
            id={titleId}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("teacher.assignmentForm.titlePlaceholder")}
            maxLength={MAX_ASSIGNMENT_TITLE_LENGTH}
            required
            disabled={isSubmitting}
            className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-xs text-error font-medium">{fieldErrors.title.join(", ")}</p>
          )}
        </div>

        {/* Instructions */}
        <div>
          <label htmlFor={instructionsId} className="block text-xs font-bold text-on-surface">
            {t("teacher.assignmentForm.instructionsField")} <span className="text-error">*</span>
          </label>
          <textarea
            id={instructionsId}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={t("teacher.assignmentForm.instructionsPlaceholder")}
            rows={7}
            maxLength={MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH}
            required
            disabled={isSubmitting}
            className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-low p-4 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60 leading-relaxed font-sans"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-secondary">
            <span>{instructions.length} / {MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH} characters</span>
            {fieldErrors.instructions && (
              <span className="text-error font-medium">{fieldErrors.instructions.join(", ")}</span>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Submission & Grading Constraints */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 sm:p-8 shadow-xs space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary border-b border-outline-variant pb-3">
          {t("teacher.assignmentDetail.configTitle")}
        </h3>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Due Date */}
          <div>
            <label htmlFor={dueAtId} className="block text-xs font-bold text-on-surface">
              {t("teacher.assignmentForm.dueDateField")}
            </label>
            <input
              id={dueAtId}
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={isSubmitting}
              className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-secondary">
              {t("teacher.assignmentForm.dueDateHint")}
            </p>
          </div>

          {/* Maximum Points */}
          <div>
            <label htmlFor={maxPointsId} className="block text-xs font-bold text-on-surface">
              {t("teacher.assignmentForm.maxPointsField")} <span className="text-error">*</span>
            </label>
            <input
              id={maxPointsId}
              type="number"
              min={1}
              max={MAX_POINTS}
              value={maxPoints}
              onChange={(e) => setMaxPoints(Number(e.target.value))}
              required
              disabled={isSubmitting}
              className="mt-1.5 w-full rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs font-semibold text-primary outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-secondary">
              {t("teacher.assignmentForm.maxPointsHint")}
            </p>
          </div>
        </div>

        {/* Allow Late Submissions Toggle */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <div className="flex items-start gap-3">
            <input
              id={allowLateId}
              type="checkbox"
              checked={allowLateSubmission}
              onChange={(e) => setAllowLateSubmission(e.target.checked)}
              disabled={isSubmitting}
              className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
            />
            <div>
              <label htmlFor={allowLateId} className="text-xs font-bold text-on-surface cursor-pointer">
                {t("teacher.assignmentForm.allowLate")}
              </label>
              <p className="mt-0.5 text-xs text-secondary leading-relaxed">
                {t("teacher.assignmentForm.allowLateDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* Maximum File Size Selector */}
        <div>
          <label htmlFor={maxFileSizeId} className="block text-xs font-bold text-on-surface">
            {t("teacher.assignmentForm.maxFileSizeField")}
          </label>
          <select
            id={maxFileSizeId}
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(Number(e.target.value))}
            disabled={isSubmitting}
            className="mt-1.5 w-full sm:max-w-xs rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs font-medium text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
          >
            {FILE_SIZE_OPTIONS.map((opt) => (
              <option key={opt.bytes} value={opt.bytes}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-secondary">
            {t("teacher.assignmentForm.maxFileSizeHint")}
          </p>
        </div>

        {/* Allowed File Types Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-xs font-bold text-on-surface">
                {t("teacher.assignmentForm.allowedTypesField")}
              </span>
              <p className="text-[11px] text-secondary">
                {t("teacher.assignmentForm.allowedTypesHint")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllMimes}
                disabled={isSubmitting}
                className="text-[11px] font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {t("teacher.assignmentForm.allTypesAllowed")}
              </button>
              <span className="text-outline">•</span>
              <button
                type="button"
                onClick={clearAllMimes}
                disabled={isSubmitting}
                className="text-[11px] font-medium text-secondary hover:underline disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
            {FILE_TYPE_OPTIONS.map((opt) => {
              const checked = selectedMimes.includes(opt.mime);
              return (
                <label
                  key={opt.key}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 cursor-pointer text-xs transition-colors ${
                    checked
                      ? "border-primary/50 bg-primary/5 font-semibold text-primary"
                      : "border-outline-variant bg-surface-container-low text-on-surface hover:bg-surface-container"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMime(opt.mime, opt.altMime)}
                    disabled={isSubmitting}
                    className="h-3.5 w-3.5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={
            isEditing && initialData
              ? `/teacher/assignments/${initialData.id}`
              : "/teacher/assignments"
          }
          className="rounded-xl border border-outline-variant bg-surface-container-low px-5 py-2.5 text-xs font-semibold text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
        >
          {t("teacher.assignmentForm.cancel")}
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{isEditing ? t("teacher.assignmentForm.saving") : t("teacher.assignmentForm.creating")}</span>
            </>
          ) : (
            <span>{isEditing ? t("teacher.assignmentForm.saveChanges") : t("teacher.assignmentForm.createAndOpen")}</span>
          )}
        </button>
      </div>
    </form>
  );
}
