"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  createExamAction,
  updateExamAction,
} from "@/app/teacher/exams/actions";
import type { Course, CourseWithCounts } from "@/types/course";
import type { Exam } from "@/types/exam";

interface ExamFormProps {
  mode: "create" | "edit";
  courses?: (Course | CourseWithCounts)[];
  exam?: Exam;
  associatedCourse?: Course | CourseWithCounts | null;
}

const DURATION_PRESETS = [
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "45m", value: 45 },
  { label: "60m (1h)", value: 60 },
  { label: "90m (1.5h)", value: 90 },
  { label: "120m (2h)", value: 120 },
  { label: "Untimed", value: "" },
];

export function ExamForm({
  mode,
  courses = [],
  exam,
  associatedCourse,
}: ExamFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState(exam?.title ?? "");
  const [description, setDescription] = useState(exam?.description ?? "");
  const [durationMinutes, setDurationMinutes] = useState<string>(
    exam?.durationMinutes != null ? String(exam.durationMinutes) : ""
  );
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    exam?.courseId ?? (courses.length === 1 ? courses[0].id : "")
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Basic client checks
    if (!title.trim() || title.trim().length < 3) {
      setFieldErrors({ title: ["Exam title must be at least 3 characters."] });
      return;
    }

    if (mode === "create" && !selectedCourseId) {
      setFieldErrors({ courseId: ["Please select a course for this exam."] });
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        durationMinutes: durationMinutes ? Number(durationMinutes) : null,
      };

      if (mode === "create") {
        payload.courseId = selectedCourseId;
      } else {
        payload.examId = exam?.id;
        payload.courseId = exam?.courseId;
      }

      const result =
        mode === "create"
          ? await createExamAction(payload)
          : await updateExamAction(payload);

      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        return;
      }

      if (mode === "create") {
        // Direct to builder for instant question authoring
        router.push(`/teacher/exams/${result.data.id}/builder`);
      } else {
        router.push(`/teacher/exams/${result.data.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-error-container bg-error-container/40 p-4 text-sm text-on-error-container">
          <svg
            className="h-5 w-5 shrink-0 text-error"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p className="font-semibold">Unable to save exam settings</p>
            <p className="mt-0.5 text-xs text-on-error-container/90">{error}</p>
          </div>
        </div>
      )}

      {/* Course Selection (Create Mode) or Associated Course Readout (Edit Mode) */}
      {mode === "create" ? (
        <div className="space-y-1.5">
          <label
            htmlFor="courseId"
            className="block text-sm font-semibold text-on-surface"
          >
            Associated Course <span className="text-error">*</span>
          </label>
          <p className="text-xs text-on-surface-variant">
            Select the course this exam belongs to.
          </p>
          <div className="relative mt-1">
            <select
              id="courseId"
              name="courseId"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              required
              className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                fieldErrors.courseId
                  ? "border-error focus:border-error focus:ring-error/20"
                  : "border-outline-variant"
              }`}
            >
              <option value="">Choose a course…</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                  {"lessonCount" in course
                    ? ` (${course.lessonCount} ${course.lessonCount === 1 ? "lesson" : "lessons"})`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          {fieldErrors.courseId && (
            <p className="text-xs font-medium text-error mt-1">
              {fieldErrors.courseId[0]}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
            Associated Course
          </span>
          <p className="mt-1 font-semibold text-sm text-on-surface">
            {associatedCourse?.title ?? "Course " + exam?.courseId}
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Course association cannot be changed after creation.
          </p>
        </div>
      )}

      {/* Exam Title */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="title"
            className="block text-sm font-semibold text-on-surface"
          >
            Exam Title <span className="text-error">*</span>
          </label>
          <span className="text-xs text-outline">{title.length}/120</span>
        </div>
        <p className="text-xs text-on-surface-variant">
          Give your exam a descriptive title (e.g. &ldquo;Physics Midterm: Chapters 1–4&rdquo; or &ldquo;রসায়ন ১ম অধ্যায় মূল্যায়ন&rdquo;).
        </p>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Midterm Assessment: Optics & Thermodynamics"
          className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${
            fieldErrors.title
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-outline-variant"
          }`}
        />
        {fieldErrors.title && (
          <p className="text-xs font-medium text-error mt-1">
            {fieldErrors.title[0]}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="description"
            className="block text-sm font-semibold text-on-surface"
          >
            Exam Description & Instructions
          </label>
          <span className="text-xs text-outline">{description.length}/2000</span>
        </div>
        <p className="text-xs text-on-surface-variant">
          Provide syllabus coverage, guidelines, or instructions for students.
        </p>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. This exam evaluates concepts covered in Modules 1 through 3. Answer all multiple-choice questions carefully."
          className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${
            fieldErrors.description
              ? "border-error focus:border-error focus:ring-error/20"
              : "border-outline-variant"
          }`}
        />
        {fieldErrors.description && (
          <p className="text-xs font-medium text-error mt-1">
            {fieldErrors.description[0]}
          </p>
        )}
      </div>

      {/* Duration in Minutes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="durationMinutes"
            className="block text-sm font-semibold text-on-surface"
          >
            Duration (Minutes)
          </label>
          <span className="text-xs text-secondary">Optional time limit</span>
        </div>
        <p className="text-xs text-on-surface-variant">
          Specifies the allocated time for students once they start this exam. Leave blank for untimed exams.
        </p>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {DURATION_PRESETS.map((preset) => {
            const isSelected =
              preset.value === ""
                ? durationMinutes === ""
                : durationMinutes === String(preset.value);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDurationMinutes(String(preset.value))}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isSelected
                    ? "border-primary bg-primary text-on-primary shadow-xs"
                    : "border-outline-variant bg-surface-container-low text-secondary hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="relative mt-2">
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={1}
            max={600}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            placeholder="Custom duration in minutes (e.g. 75)"
            className={`w-full rounded-xl border bg-surface-container-lowest px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 ${
              fieldErrors.durationMinutes
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline-variant"
            }`}
          />
        </div>
        {fieldErrors.durationMinutes && (
          <p className="text-xs font-medium text-error mt-1">
            {fieldErrors.durationMinutes[0]}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 border-t border-outline-variant pt-5">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{mode === "create" ? "Creating Exam…" : "Saving Changes…"}</span>
            </>
          ) : (
            <span>{mode === "create" ? "Create Exam & Open Builder" : "Save Changes"}</span>
          )}
        </button>

        <Link
          href={mode === "create" ? "/teacher/exams" : `/teacher/exams/${exam?.id}`}
          className="rounded-xl border border-outline-variant bg-surface-container-low px-5 py-3 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}