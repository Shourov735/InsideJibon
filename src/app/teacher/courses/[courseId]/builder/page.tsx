import { notFound } from "next/navigation";

import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseWithCurriculum } from "@/services/courses";
import { CurriculumBuilder } from "@/components/teacher/builder/curriculum-builder";

interface BuilderPageProps {
  params: Promise<{ courseId: string }>;
}

export async function generateMetadata({ params }: BuilderPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseWithCurriculum(teacher.id, courseId);

  if (!course) return { title: "Course Builder | Not Found" };

  return {
    title: `Builder: ${course.title} | InsideJibon`,
    description: `Curriculum and lesson builder for ${course.title}`,
  };
}

export default async function CourseBuilderPage({ params }: BuilderPageProps) {
  const { courseId } = await params;
  const teacher = await requireTeacher();
  const course = await getTeacherCourseWithCurriculum(teacher.id, courseId);

  if (!course) {
    notFound();
  }

  return <CurriculumBuilder course={course} />;
}
