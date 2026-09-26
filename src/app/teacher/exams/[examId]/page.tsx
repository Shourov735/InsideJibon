import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import {
  getTeacherExamWithQuestions,
  validateExamForPublishing,
} from "@/services/exams";
import { getTeacherCourseById } from "@/services/courses";
import { getTranslator } from "@/i18n/server";
import { ExamDetailView } from "@/components/teacher/exams/exam-detail-view";
import { Container } from "@/components/shared/ui/container";

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
  const t = await getTranslator();
  const exam = await getTeacherExamWithQuestions(teacher.id, examId);

  if (!exam) notFound();

  const [publishCheck, course] = await Promise.all([
    validateExamForPublishing(teacher.id, exam.id, t),
    getTeacherCourseById(teacher.id, exam.courseId),
  ]);

  return (
    <Container className="py-6 sm:py-8" size="lg">
      <ExamDetailView
        exam={exam}
        course={course}
        publishCheck={publishCheck}
      />
    </Container>
  );
}
