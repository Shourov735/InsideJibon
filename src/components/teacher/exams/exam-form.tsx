"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createExamAction,
  updateExamAction,
} from "@/app/teacher/exams/actions";
import type { Course } from "@/types/course";
import type { Exam } from "@/types/exam";

interface ExamFormProps {
  mode: "create" | "edit";
  courses?: Course[];
  exam?: Exam;
}

/**
 * Minimal teacher exam form (create + edit) used to verify the backend
 * contract end-to-end. Antigravity will replace this with the Stitch UI.
 */
export function ExamForm({ mode, courses = [], exam }: ExamFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const payload: Record<string, unknown> = {
        title: formData.get("title"),
        description: formData.get("description"),
        durationMinutes: formData.get("durationMinutes") || null,
      };
      if (mode === "create") {
        payload.courseId = formData.get("courseId");
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
        return;
      }
      router.push(`/teacher/exams/${result.data.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-sm text-on-error-container">
          {error}
        </div>
      )}

      {mode === "create" && (
        <div>
          <label
            htmlFor="courseId"
            className="mb-1.5 block text-sm font-semibold text-on-surface"
          >
            Course <span className="text-error">*</span>
          </label>
          <select
            id="courseId"
            name="courseId"
            required
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a course…</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label
          htmlFor="title"
          className="mb-1.5 block text-sm font-semibold text-on-surface"
        >
          Exam Title <span className="text-error">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          minLength={3}
          maxLength={120}
          defaultValue={exam?.title ?? ""}
          placeholder="e.g. Midterm Examination — Physics"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="mb-1.5 block text-sm font-semibold text-on-surface"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={exam?.description ?? ""}
          placeholder="Describe the exam scope, chapters covered, instructions…"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label
          htmlFor="durationMinutes"
          className="mb-1.5 block text-sm font-semibold text-on-surface"
        >
          Duration (minutes)
        </label>
        <input
          id="durationMinutes"
          name="durationMinutes"
          type="number"
          min={1}
          max={600}
          defaultValue={exam?.durationMinutes ?? ""}
          placeholder="e.g. 60"
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-60"
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create Exam"
              : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-outline-variant px-5 py-2.5 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}