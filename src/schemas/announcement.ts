import { z } from "zod";

export const createAnnouncementSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1, "Title is required.").max(200),
  content: z.string().min(1, "Content is required.").max(5000),
  isPinned: z.boolean().default(false),
});

export const updateAnnouncementSchema = z.object({
  announcementId: z.string().uuid(),
  title: z.string().min(1, "Title is required.").max(200),
  content: z.string().min(1, "Content is required.").max(5000),
  isPinned: z.boolean().default(false),
});

export const announcementActionByIdSchema = z.object({
  announcementId: z.string().uuid(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
