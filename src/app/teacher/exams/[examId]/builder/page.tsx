import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherExamWithQuestions } from "@/services/exams";
import { getTeacherCourseById } from "@/services/courses";
import { ExamBuilder } from "@/components/teacher/exams/builder/exam-builder";

interface ExamBuilderPageProps {
  params: Promise<{ examId: string }>;
}

export async function generateMetadata({ params }: ExamBuilderPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) return { title: "Exam Builder | Not Found" };

  return {
    title: `Builder: ${exam.title} | InsideJibon Educator`,
    description: `Question builder for ${exam.title}`,
  };
}

export default async function ExamBuilderPage({ params }: ExamBuilderPageProps) {
  const { examId } = await params;
  const teacher = await requireTeacher();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) notFound();

  const course = await getTeacherCourseById(teacher.id, exam.courseId);

  return (
    <div className="flex-1 bg-surface flex flex-col overflow-hidden">
      <main id="main-content" className="flex-1 overflow-hidden">
        <ExamBuilder exam={exam} courseTitle={course?.title} />
      </main>
    </div>
  );
}