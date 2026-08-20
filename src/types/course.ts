import type {
  Course,
  CourseModule,
  CourseStatus,
  Lesson,
  NewCourse,
  NewCourseModule,
  NewLesson,
} from "@/db/schema";

export type {
  Course,
  CourseModule,
  CourseStatus,
  Lesson,
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

export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
