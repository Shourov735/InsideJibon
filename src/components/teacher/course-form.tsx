"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { slugify } from "@/schemas/course";
import type { Course } from "@/db/schema";
import {
  createCourseAction,
  updateCourseAction,
} from "@/app/teacher/courses/actions";
import { useTranslations } from "@/i18n/client";

interface CourseFormProps {
  initialCourse?: Course;
  mode?: "create" | "edit";
}

export function CourseForm({
  initialCourse,
  mode = "create",
}: CourseFormProps) {
  const router = useRouter();
  const { t } = useTranslations();

  const [title, setTitle] = useState(initialCourse?.title ?? "");
  const [slug, setSlug] = useState(initialCourse?.slug ?? "");
  const [isCustomSlug, setIsCustomSlug] = useState(Boolean(initialCourse?.slug));
  const [description, setDescription] = useState(
    initialCourse?.description ?? ""
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    initialCourse?.thumbnailUrl ?? ""
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isCustomSlug && mode === "create") {
      setSlug(slugify(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setIsCustomSlug(true);
    setSlug(val.toLowerCase().replace(/\s+/g, "-"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      if (mode === "create") {
        const res = await createCourseAction({
          title,
          slug: slug || undefined,
          description: description || undefined,
        });

        if (!res.success) {
          setFormError(res.error);
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          return;
        }

        router.push(`/teacher/courses/${res.data.id}/builder`);
        router.refresh();
      } else if (mode === "edit" && initialCourse) {
        // Warning if published course slug is modified
        if (
          initialCourse.status === "published" &&
          initialCourse.slug !== slug
        ) {
          const confirmed = window.confirm(t("teacher.courseForm.slugChangeWarning"));
          if (!confirmed) {
            setIsSubmitting(false);
            return;
          }
        }

        const res = await updateCourseAction({
          courseId: initialCourse.id,
          title,
          slug,
          description: description || null,
          thumbnailUrl: thumbnailUrl || null,
        });

        if (!res.success) {
          setFormError(res.error);
          if (res.fieldErrors) setFieldErrors(res.fieldErrors);
          return;
        }

        router.push(`/teacher/courses/${initialCourse.id}`);
        router.refresh();
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : t("teacher.courseForm.unexpectedError")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formError && (
        <div className="rounded-lg border border-error/30 bg-error-container/40 p-4 text-sm text-on-error-container">
          <div className="flex items-center gap-2 font-semibold">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-error"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{t("common.error")}</span>
          </div>
          <p className="mt-1 whitespace-pre-line">{formError}</p>
        </div>
      )}

      {/* Course Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-semibold text-on-surface"
        >
          {t("teacher.courseForm.courseTitle")} <span className="text-error">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder={t("teacher.courseForm.titlePlaceholder")}
          required
          className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface shadow-2xs transition-colors placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {fieldErrors.title && (
          <p className="mt-1 text-xs text-error">{fieldErrors.title[0]}</p>
        )}
      </div>

      {/* URL Slug */}
      <div>
        <div className="flex items-center justify-between">
          <label
            htmlFor="slug"
            className="block text-sm font-semibold text-on-surface"
          >
            {t("teacher.courseForm.slugLabel")} <span className="text-error">*</span>
          </label>
          <span className="text-xs text-secondary">
            {t("teacher.courseForm.slugHint")}
          </span>
        </div>
        <div className="mt-1.5 flex rounded-lg border border-outline-variant bg-surface-container-lowest shadow-2xs focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <span className="inline-flex items-center border-r border-outline-variant bg-surface-container-low px-3 text-xs font-mono text-secondary">
            insidejibon.workers.dev/courses/
          </span>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder={t("teacher.courseForm.slugPlaceholder")}
            required
            className="w-full bg-transparent px-3 py-2.5 text-sm font-mono text-on-surface focus:outline-none"
          />
        </div>
        {fieldErrors.slug && (
          <p className="mt-1 text-xs text-error">{fieldErrors.slug[0]}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-semibold text-on-surface"
        >
          {t("teacher.courseForm.descriptionField")}
        </label>
        <textarea
          id="description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("teacher.courseForm.descriptionPlaceholder")}
          className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface shadow-2xs transition-colors placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {fieldErrors.description && (
          <p className="mt-1 text-xs text-error">{fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Thumbnail URL (Edit mode or optional) */}
      {mode === "edit" && (
        <div>
          <label
            htmlFor="thumbnailUrl"
            className="block text-sm font-semibold text-on-surface"
          >
            {t("teacher.courseForm.thumbnailField")}
          </label>
          <input
            id="thumbnailUrl"
            type="url"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
            placeholder={t("teacher.courseForm.thumbnailPlaceholder")}
            className="mt-1.5 w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 py-2.5 text-sm text-on-surface shadow-2xs transition-colors placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {fieldErrors.thumbnailUrl && (
            <p className="mt-1 text-xs text-error">
              {fieldErrors.thumbnailUrl[0]}
            </p>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isSubmitting}
          className="rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-surface-container hover:text-on-surface disabled:opacity-50"
        >
          {t("teacher.courseForm.cancel")}
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg
                className="h-4 w-4 animate-spin text-current"
                xmlns="http://www.w3.org/2000/svg"
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
              <span>
                {mode === "create"
                  ? t("teacher.courseForm.creating")
                  : t("teacher.courseForm.saving")}
              </span>
            </>
          ) : (
            <span>
              {mode === "create"
                ? t("teacher.courseForm.continueToBuilder")
                : t("teacher.courseForm.saveChanges")}
            </span>
          )}
        </button>
      </div>
    </form>
  );
}
