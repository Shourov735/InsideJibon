import { z } from "zod";

export const createClassSessionSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, "Title is required.").max(200),
  description: z.string().max(5000).optional(),
  sessionType: z.enum(["live", "recorded"]).default("live"),
  externalUrl: z.string().url("Please enter a valid URL.").max(2000).optional().or(z.literal("")),
  scheduledAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(480).optional(),
});

export const updateClassSessionSchema = z.object({
  sessionId: z.string().uuid(),
  title: z.string().min(1, "Title is required.").max(200),
  description: z.string().max(5000).optional(),
  sessionType: z.enum(["live", "recorded"]),
  externalUrl: z.string().url("Please enter a valid URL.").max(2000).optional().or(z.literal("")),
  scheduledAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(1).max(480).optional(),
  status: z.enum(["upcoming", "completed", "cancelled"]).optional(),
});

export const sessionActionByIdSchema = z.object({
  sessionId: z.string().uuid(),
});

export type CreateClassSessionInput = z.infer<typeof createClassSessionSchema>;
export type UpdateClassSessionInput = z.infer<typeof updateClassSessionSchema>;
