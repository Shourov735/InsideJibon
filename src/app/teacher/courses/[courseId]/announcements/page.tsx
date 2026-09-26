import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getTeacherAnnouncementsForCourse } from "@/services/announcements";
import { AnnouncementDirectory } from "@/components/teacher/announcements/announcement-directory";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { ChevronRightIcon, MegaphoneIcon } from "@/components/shared/ui/icons";

interface CourseAnnouncementsPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: CourseAnnouncementsPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseById(teacher.id, courseId);

  if (!course) return { title: "Course Not Found" };

  return { title: `Announcements - ${course.title} | InsideJibon Educator` };
}

export default async function CourseAnnouncementsPage({ params }: CourseAnnouncementsPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const t = await getTranslator();

  const course = await getTeacherCourseById(teacher.id, courseId);
  if (!course) {
    notFound();
  }

  const announcements = await getTeacherAnnouncementsForCourse(teacher.id, course.id);

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
          {t("student.announcements.announcementsTab")}
        </span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <MegaphoneIcon size={14} />
            {t("teacher.announcements.title")}
          </span>
        }
        title={t("teacher.announcements.title")}
        description={course.title}
      />

      <div className="mt-6">
        <AnnouncementDirectory announcements={announcements} courseId={course.id} />
      </div>
    </Container>
  );
}
