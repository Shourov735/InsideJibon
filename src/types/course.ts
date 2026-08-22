import type {
  Assignment,
  AssignmentStatus,
  AssignmentSubmission,
  SubmissionStatus,
  Course,
  CourseCategory,
  CourseModule,
  CourseStatus,
  Lesson,
  NewAssignment,
  NewAssignmentSubmission,
  NewCourse,
  NewCourseModule,
  NewLesson,
} from "@/db/schema";

export type {
  Assignment,
  AssignmentStatus,
  AssignmentSubmission,
  SubmissionStatus,
  Course,
  CourseCategory,
  CourseModule,
  CourseStatus,
  Lesson,
  NewAssignment,
  NewAssignmentSubmission,
  NewCourse,
  NewCourseModule,
  NewLesson,
};

export interface CourseWithCounts extends Course {
  moduleCount: number;
  lessonCount: number;
}

export interface ModuleWithLessons extends CourseModule {
  lessons: Lesson[];
}

export interface CourseWithCurriculum extends Course {
  modules: ModuleWithLessons[];
}

export interface PublishValidationResult {
  canPublish: boolean;
  errors: string[];
}

/**
 * Publicly safe teacher information. Only fields appropriate for
 * public course pages are included — never Clerk secrets, roles or
 * private metadata.
 */
export interface PublicTeacher {
  id: string;
  name: string | null;
  imageUrl: string | null;
}

/**
 * Curated public shape for a published course in the catalog.
 * Deliberately picks only the fields needed for public presentation
 * instead of re-exporting the full Course row.
 */
export interface PublicCourseSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: CourseCategory;
  publishedAt: Date | null;
  teacher: PublicTeacher;
  moduleCount: number;
  lessonCount: number;
}

/** Public lesson row — content and video URLs are never exposed. */
export interface PublicLesson {
  id: string;
  position: number;
  title: string;
  description: string | null;
  isFree: boolean;
}

export interface PublicModule {
  id: string;
  position: number;
  title: string;
  description: string | null;
  lessons: PublicLesson[];
}

export interface PublicCourseDetail extends PublicCourseSummary {
  modules: PublicModule[];
}

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
