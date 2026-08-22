import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getCourseAnalytics } from "@/services/analytics";
import { notFound } from "next/navigation";

import Link from "next/link";


interface AnalyticsPageProps {
  params: { courseId: string };
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const user = await requireTeacher();
  const { courseId } = params;

  const course = await getTeacherCourseById(user.id, courseId);
  if (!course) return notFound();

  const analytics = await getCourseAnalytics(user.id, courseId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/teacher/courses/${courseId}`}
          className="p-2 text-secondary hover:text-on-surface hover:bg-surface-container-low rounded-full transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Course Analytics</h1>
          <p className="text-sm text-secondary">{course.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <h3 className="text-sm font-medium text-secondary">Total Students</h3>
          </div>
          <p className="text-3xl font-bold text-on-surface">{analytics.totalStudents}</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="text-sm font-medium text-secondary">Total Submissions</h3>
          </div>
          <p className="text-3xl font-bold text-on-surface">{analytics.totalSubmissions}</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-sm font-medium text-secondary">Graded</h3>
          </div>
          <p className="text-3xl font-bold text-on-surface">{analytics.gradedSubmissions}</p>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant">
          <div className="flex items-center gap-3 mb-2">
            <svg className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-sm font-medium text-secondary">Pending Grading</h3>
          </div>
          <p className="text-3xl font-bold text-on-surface">{analytics.pendingSubmissions}</p>
        </div>
      </div>
    </div>
  );
}
