import { z } from "zod";

/**
 * Zod contracts for teacher-side exam management. Teacher identity is NEVER
 * part of these payloads — it always comes from the verified session.
 *
 * Validation here shapes input at the trust boundary; publishing
 * preconditions (structure of questions/options, exactly one correct option)
 * are re-verified authoritatively in the service layer.
 */

export const createExamSchema = z.object({
  courseId: z.string().uuid("Invalid course ID"),
  title: z
    .string()
    .trim()
    .min(3, "Exam title must be at least 3 characters")
    .max(120, "Exam title cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Exam description cannot exceed 2000 characters")
    .optional()
    .nullable()
    .or(z.literal("")),
  durationMinutes: z.coerce
    .number("Duration must be a number")
    .int("Duration must be a whole number of minutes")
    .min(1, "Duration must be at least 1 minute")
    .max(600, "Duration cannot exceed 600 minutes")
    .optional()
    .nullable(),
});

export const updateExamSchema = createExamSchema.extend({
  examId: z.string().uuid("Invalid exam ID"),
});

export const examActionByIdSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
});

export const createQuestionSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
  questionText: z
    .string()
    .trim()
    .min(2, "Question text must be at least 2 characters")
    .max(5000, "Question text is too large"),
  explanation: z
    .string()
    .trim()
    .max(5000, "Explanation is too large")
    .optional()
    .nullable()
    .or(z.literal("")),
  marks: z.coerce
    .number("Marks must be a number")
    .int("Marks must be a whole number")
    .min(1, "Marks must be at least 1")
    .max(1000, "Marks cannot exceed 1000")
    .optional()
    .default(1),
});

export const updateQuestionSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
  questionId: z.string().uuid("Invalid question ID"),
  questionText: z
    .string()
    .trim()
    .min(2, "Question text must be at least 2 characters")
    .max(5000, "Question text is too large"),
  explanation: z
    .string()
    .trim()
    .max(5000, "Explanation is too large")
    .optional()
    .nullable()
    .or(z.literal("")),
  marks: z.coerce
    .number("Marks must be a number")
    .int("Marks must be a whole number")
    .min(1, "Marks must be at least 1")
    .max(1000, "Marks cannot exceed 1000"),
});

export const questionActionByIdSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
  questionId: z.string().uuid("Invalid question ID"),
});

export const reorderQuestionsSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
  orderedQuestionIds: z
    .array(z.string().uuid("Invalid question ID in sequence"))
    .min(1, "Must provide at least one question ID"),
});

export const createOptionSchema = z.object({
  questionId: z.string().uuid("Invalid question ID"),
  optionText: z
    .string()
    .trim()
    .min(1, "Option text must be at least 1 character")
    .max(500, "Option text is too large"),
  isCorrect: z.boolean().optional().default(false),
});

export const updateOptionSchema = z.object({
  optionId: z.string().uuid("Invalid option ID"),
  optionText: z
    .string()
    .trim()
    .min(1, "Option text must be at least 1 character")
    .max(500, "Option text is too large"),
  isCorrect: z.boolean(),
});

export const optionActionByIdSchema = z.object({
  optionId: z.string().uuid("Invalid option ID"),
});

export type CreateExamInput = z.input<typeof createExamSchema>;
export type UpdateExamInput = z.input<typeof updateExamSchema>;
export type CreateQuestionInput = z.input<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.input<typeof updateQuestionSchema>;
export type CreateOptionInput = z.input<typeof createOptionSchema>;
export type UpdateOptionInput = z.input<typeof updateOptionSchema>;