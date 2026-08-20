import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import {
  getTeacherExamWithQuestions,
  validateExamForPublishing,
} from "@/services/exams";
import { getTeacherCourseById } from "@/services/courses";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { ExamDetailView } from "@/components/teacher/exams/exam-detail-view";

interface ExamDetailPageProps {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: ExamDetailPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) return { title: "Exam | Not Found" };

  return {
    title: `${exam.title} | InsideJibon Educator`,
    description: exam.description ?? `Examination overview for ${exam.title}`,
  };
}

export default async function ExamDetailPage({ params }: ExamDetailPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) notFound();

  const [publishCheck, course] = await Promise.all([
    validateExamForPublishing(teacher.id, exam.id),
    getTeacherCourseById(teacher.id, exam.courseId),
  ]);

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <TeacherNav user={teacher} activeSection="exams" />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 space-y-6">
        <ExamDetailView
          exam={exam}
          course={course}
          publishCheck={publishCheck}
        />
      </main>
    </div>
  );
}