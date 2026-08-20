import { z } from "zod";

export const courseSlugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "") // remove invalid chars
    .replace(/[\s_]+/g, "-") // replace spaces and underscores with -
    .replace(/-+/g, "-") // replace multiple - with single -
    .replace(/^-+|-+$/g, ""); // trim - from start and end
}

export const createCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .or(z.literal("")),
  slug: z
    .string()
    .trim()
    .regex(
      courseSlugRegex,
      "Slug must be lowercase alphanumeric characters separated by single hyphens"
    )
    .optional()
    .or(z.literal("")),
});

export const updateCourseSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(120, "Title cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  slug: z
    .string()
    .trim()
    .regex(
      courseSlugRegex,
      "Slug must be lowercase alphanumeric characters separated by single hyphens"
    ),
  thumbnailUrl: z
    .string()
    .trim()
    .url("Invalid thumbnail URL format")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const deleteCourseSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

export const createModuleSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z
    .string()
    .trim()
    .min(2, "Module title must be at least 2 characters")
    .max(120, "Module title cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Module description cannot exceed 1000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const updateModuleSchema = z.object({
  moduleId: z.string().uuid("Invalid module ID"),
  title: z
    .string()
    .trim()
    .min(2, "Module title must be at least 2 characters")
    .max(120, "Module title cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(1000, "Module description cannot exceed 1000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const deleteModuleSchema = z.object({
  moduleId: z.string().uuid("Invalid module ID"),
});

export const reorderModulesSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  orderedModuleIds: z
    .array(z.string().uuid("Invalid module ID in sequence"))
    .min(1, "Must provide at least one module ID"),
});

export const createLessonSchema = z.object({
  moduleId: z.string().uuid("Invalid module ID"),
  title: z
    .string()
    .trim()
    .min(2, "Lesson title must be at least 2 characters")
    .max(150, "Lesson title cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Lesson description cannot exceed 2000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  content: z
    .string()
    .trim()
    .max(50000, "Lesson content is too large")
    .optional()
    .nullable()
    .or(z.literal("")),
  videoUrl: z
    .string()
    .trim()
    .url("Invalid video URL format")
    .optional()
    .nullable()
    .or(z.literal("")),
  isFree: z.boolean().optional().default(false),
});

export const updateLessonSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
  title: z
    .string()
    .trim()
    .min(2, "Lesson title must be at least 2 characters")
    .max(150, "Lesson title cannot exceed 150 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Lesson description cannot exceed 2000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  content: z
    .string()
    .trim()
    .max(50000, "Lesson content is too large")
    .optional()
    .nullable()
    .or(z.literal("")),
  videoUrl: z
    .string()
    .trim()
    .url("Invalid video URL format")
    .optional()
    .nullable()
    .or(z.literal("")),
  isFree: z.boolean().optional().default(false),
});


export const deleteLessonSchema = z.object({
  lessonId: z.string().uuid("Invalid lesson ID"),
});

export const reorderLessonsSchema = z.object({
  moduleId: z.string().uuid("Invalid module ID"),
  orderedLessonIds: z
    .array(z.string().uuid("Invalid lesson ID in sequence"))
    .min(1, "Must provide at least one lesson ID"),
});

export const courseActionByIdSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
});

export type CreateCourseInput = z.input<typeof createCourseSchema>;
export type UpdateCourseInput = z.input<typeof updateCourseSchema>;
export type CreateModuleInput = z.input<typeof createModuleSchema>;
export type UpdateModuleInput = z.input<typeof updateModuleSchema>;
export type CreateLessonInput = z.input<typeof createLessonSchema>;
export type UpdateLessonInput = z.input<typeof updateLessonSchema>;

