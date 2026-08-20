import { z } from "zod";

/**
 * Zod contracts for the student exam attempt surface (Phase 4).
 *
 * Student identity is NEVER part of these payloads — it always comes from the
 * verified Clerk session (requireStudent). A submission payload deliberately
 * cannot carry score, percentage, awardedPoints, isCorrect or studentId:
 * grading is computed server-side from the attempt's content snapshot.
 */

export const startExamSchema = z.object({
  examId: z.string().uuid("Invalid exam ID"),
});

export const submitExamSchema = z
  .object({
    attemptId: z.string().uuid("Invalid attempt ID"),
    answers: z
      .array(
        z
          .object({
            questionId: z.string().uuid("Invalid question ID"),
            selectedOptionId: z.string().uuid("Invalid option ID"),
          })
          .strict()
      )
      .max(500, "Too many answers submitted"),
  })
  .strict();

export type StartExamInput = z.input<typeof startExamSchema>;
export type SubmitExamInput = z.input<typeof submitExamSchema>;

/** A single submitted answer, after schema validation. */
export interface SubmittedAnswer {
  questionId: string;
  selectedOptionId: string;
}