import { z } from "zod";

/**
 * Zod schemas for student-facing mutations. Student identity is NEVER part
 * of these payloads — it always comes from the verified session.
 */

export const enrollCourseSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

export const lessonProgressActionSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
  completed: z.boolean(),
});

export const lessonPositionActionSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
  position: z
    .coerce
    .number("Position must be a number")
    .int("Position must be a whole number")
    .min(0, "Position cannot be negative")
    .max(24 * 60 * 60 * 1000, "Position is unreasonably large"),
});

export type EnrollCourseInput = z.input<typeof enrollCourseSchema>;
export type LessonProgressActionInput = z.input<typeof lessonProgressActionSchema>;
export type LessonPositionActionInput = z.input<typeof lessonPositionActionSchema>;