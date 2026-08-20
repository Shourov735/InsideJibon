import Link from "next/link";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourses } from "@/services/courses";
import { getTeacherExams } from "@/services/exams";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { CourseCard } from "@/components/teacher/course-card";
import { ExamCard } from "@/components/teacher/exams/exam-card";

export const metadata = {
  title: "Educator Dashboard | InsideJibon",
  description: "InsideJibon teacher control center, course and examination overview.",
};

export default async function TeacherDashboardPage() {
  const teacher = await requireTeacher();
  const [coursesList, examsList] = await Promise.all([
    getTeacherCourses(teacher.id),
    getTeacherExams(teacher.id),
  ]);

  const courseMap = new Map(coursesList.map((c) => [c.id, c.title]));

  const publishedCourses = coursesList.filter(
    (c) => c.status === "published"
  ).length;
  const totalLessons = coursesList.reduce((acc, c) => acc + c.lessonCount, 0);

  const publishedExams = examsList.filter((e) => e.status === "published").length;
  const totalQuestions = examsList.reduce((acc, e) => acc + e.questionCount, 0);

  const recentCourses = coursesList.slice(0, 3);
  const recentExams = examsList.slice(0, 3);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="dashboard" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                শিক্ষক ড্যাশবোর্ড
              </span>
              <span className="text-xs text-secondary">• Control Center</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              Welcome back, {teacher.name ?? "Educator"}
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              InsideJibon Educator Portal — orchestrate your curriculum, lesson materials, and examinations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/teacher/exams/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm font-semibold text-on-surface shadow-2xs transition-colors hover:bg-surface-container hover:text-primary"
            >
              <svg
                className="h-4 w-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Create Exam</span>
            </Link>

            <Link
              href="/teacher/courses/new"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span>Create Course</span>
            </Link>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Total Courses
              </span>
              <div className="rounded-lg bg-surface-container p-2 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">
              {coursesList.length}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              {publishedCourses} published • {totalLessons} lessons
            </span>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Total Exams
              </span>
              <div className="rounded-lg bg-surface-container p-2 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">
              {examsList.length}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              {publishedExams} published • {totalQuestions} questions
            </span>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Published Content
              </span>
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-emerald-700">
              {publishedCourses + publishedExams}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              Live & active for students
            </span>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Question Bank
              </span>
              <div className="rounded-lg bg-surface-container p-2 text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-2 text-3xl font-bold text-primary">
              {totalQuestions}
            </p>
            <span className="mt-1 block text-xs text-on-surface-variant">
              Total questions configured
            </span>
          </div>
        </div>

        {/* Recent Courses Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">
                My Courses
              </h2>
              <p className="text-xs text-on-surface-variant">
                Curriculum structure, modules, and learning units.
              </p>
            </div>
            <Link
              href="/teacher/courses"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all ({coursesList.length}) →
            </Link>
          </div>

          {recentCourses.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="text-sm text-secondary">
                You haven&apos;t created any courses yet.
              </p>
              <div className="mt-3">
                <Link
                  href="/teacher/courses/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors"
                >
                  Create Course
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Examinations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">
                My Examinations
              </h2>
              <p className="text-xs text-on-surface-variant">
                Question builders, papers, and assessment configurations.
              </p>
            </div>
            <Link
              href="/teacher/exams"
              className="text-xs font-semibold text-primary hover:underline"
            >
              View all ({examsList.length}) →
            </Link>
          </div>

          {recentExams.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
              <p className="text-sm text-secondary">
                No examinations created yet.
              </p>
              <div className="mt-3">
                <Link
                  href="/teacher/exams/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container transition-colors"
                >
                  Create Exam
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {recentExams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  courseTitle={courseMap.get(exam.courseId)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}