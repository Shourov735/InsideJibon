import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { CourseForm } from "@/components/teacher/course-form";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, BookIcon } from "@/components/shared/ui/icons";

export const metadata = {
  title: "Create Course | InsideJibon Educator",
  description: "Create a new course and begin structuring your curriculum.",
};

export default async function NewCoursePage() {
  await requireTeacher();
  const t = await getTranslator();

  return (
    <Container className="py-6 sm:py-8" size="lg">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <Link
          href="/teacher/courses"
          className="hover:text-ink-900 transition-colors"
        >
          {t("teacher.courseForm.breadcrumb.courses")}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">{t("teacher.courseForm.breadcrumb.new")}</span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <BookIcon size={14} />
            {t("teacher.courseForm.breadcrumb.courses")}
          </span>
        }
        title={t("teacher.courseForm.title")}
        description={t("teacher.courseForm.subtitle")}
      />

      <div className="mt-6 rounded-3xl border border-outline-variant bg-surface-0 p-5 sm:p-8">
        <CourseForm mode="create" />
      </div>
    </Container>
  );
}
