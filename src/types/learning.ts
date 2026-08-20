import type { Enrollment, LessonProgress } from "@/db/schema";

export type { Enrollment, LessonProgress };

/**
 * Course progress derived from lesson_progress rows.
 * Percent is always 0 for courses with zero lessons.
 */
export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
}

/**
 * A single lesson inside the learning workspace, with the authenticated
 * student's personal state merged in.
 */
export interface LearningLessonSummary {
  id: string;
  moduleId: string;
  position: number;
  title: string;
  description: string | null;
  isFree: boolean;
  completed: boolean;
  lastPosition: number | null;
}

export interface LearningModule {
  id: string;
  position: number;
  title: string;
  description: string | null;
  lessons: LearningLessonSummary[];
}

/**
 * The full enrolled course curriculum with personal progress state —
 * the payload for the learning workspace and course progress header.
 */
export interface LearningCourse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  teacherName: string | null;
  enrolledAt: Date;
  completedAt: Date | null;
  modules: LearningModule[];
  progress: CourseProgress;
}

/**
 * Enrolled course card for the student dashboard / course list.
 */
export interface StudentCourseSummary {
  courseId: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  teacherName: string | null;
  enrolledAt: Date;
  completedAt: Date | null;
  progress: CourseProgress;
  lastLesson: { id: string; title: string; lastAccessedAt: Date | null } | null;
}

/**
 * Full access payload for a single lesson in the learning workspace.
 * Only returned when the authenticated student is enrolled in the
 * published course that owns the lesson (via lesson → module → course).
 */
export interface LessonAccess {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    videoUrl: string | null;
    position: number;
  };
  module: { id: string; title: string; position: number };
  course: { id: string; slug: string; title: string; teacherName: string | null };
  progress: Pick<LessonProgress, "completed" | "completedAt" | "lastPosition"> | null;
  prevLessonId: string | null;
  nextLessonId: string | null;
  totalLessons: number;
  completedCount: number;
}

export interface EnrollmentResult {
  enrollment: Enrollment;
  alreadyEnrolled: boolean;
}