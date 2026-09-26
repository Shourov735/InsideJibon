import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { CourseForm } from "@/components/teacher/course-form";
import { CourseDangerZone } from "@/components/teacher/course-danger-zone";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, BookIcon } from "@/components/shared/ui/icons";

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: EditCoursePageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) return { title: "Course Not Found" };

  return {
    title: `Settings: ${course.title} | InsideJibon Educator`,
    description: "Edit course details and settings.",
  };
}

export default async function EditCoursePage({
  params,
}: EditCoursePageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) {
    notFound();
  }

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
        <Link
          href={`/teacher/courses/${course.id}`}
          className="truncate hover:text-ink-900 transition-colors max-w-[160px]"
        >
          {course.title}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">
          {t("teacher.courseForm.breadcrumb.settings")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <BookIcon size={14} />
            {t("teacher.courseForm.breadcrumb.courses")}
          </span>
        }
        title={t("teacher.courseForm.settingsTitle")}
        description={t("teacher.courseForm.settingsDesc")}
      />

      <div className="mt-6 rounded-3xl border border-outline-variant bg-surface-0 p-5 sm:p-8">
        <CourseForm initialCourse={course} mode="edit" />
      </div>

      <div className="mt-6">
        <CourseDangerZone course={course} />
      </div>
    </Container>
  );
}
