import { notFound } from "next/navigation";
import Link from "next/link";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getTeacherAnnouncementsForCourse } from "@/services/announcements";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { AnnouncementDirectory } from "@/components/teacher/announcements/announcement-directory";
import { getTranslator } from "@/i18n/server";

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
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="courses" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-secondary">
              <Link
                href="/teacher/courses"
                className="hover:text-on-surface hover:underline"
              >
                {t("teacher.courseForm.breadcrumb.courses")}
              </Link>
              <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <Link
                href={`/teacher/courses/${course.id}`}
                className="hover:text-on-surface hover:underline truncate max-w-[200px]"
              >
                {course.title}
              </Link>
              <svg className="h-3 w-3 text-outline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-on-surface">{t("student.announcements.announcementsTab")}</span>
            </div>
            
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-on-surface">
              {t("teacher.announcements.title")}
            </h1>
          </div>
        </div>

        <AnnouncementDirectory announcements={announcements} courseId={course.id} />
      </main>
    </div>
  );
}
