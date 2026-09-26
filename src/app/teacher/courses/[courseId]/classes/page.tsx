import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getTeacherSessionsForCourse } from "@/services/classes";
import { ClassSessionDirectory } from "@/components/teacher/classes/class-session-directory";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, CalendarIcon } from "@/components/shared/ui/icons";

interface CourseClassesPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: CourseClassesPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) return { title: "Course Not Found" };

  return { title: `Classes - ${course.title} | InsideJibon Educator` };
}

export default async function CourseClassesPage({ params }: CourseClassesPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const t = await getTranslator();

  const course = await getTeacherCourseById(teacher.id, courseId);
  if (!course) {
    notFound();
  }

  const sessions = await getTeacherSessionsForCourse(teacher.id, course.id);

  return (
    <Container className="py-6 sm:py-8" size="xl">
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
          className="max-w-[160px] truncate hover:text-ink-900 transition-colors"
        >
          {course.title}
        </Link>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">
          {t("student.classes.classesTab")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <CalendarIcon size={14} />
            {t("teacher.classes.title")}
          </span>
        }
        title={t("teacher.classes.title")}
        description={course.title}
      />

      <div className="mt-6">
        <ClassSessionDirectory sessions={sessions} courseId={course.id} />
      </div>
    </Container>
  );
}
