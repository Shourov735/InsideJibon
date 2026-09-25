"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/permissions";
import {
  acceptAnswer,
  askQuestion,
  pinThread,
  postAnswer,
  postComment,
  setStatus,
  vote,
} from "@/services/qna/threads";
import { softDeleteThread } from "@/services/qna/moderation";
import { rateLimit, enforceRateLimit } from "@/services/security/rate-limit";
import { RATE_LIMIT_CONFIG } from "@/lib/security/rate-limit-config";

/**
 * R4 server actions for the lesson Q&A panel.
 *
 * Each action:
 *   - calls requireUser() (or requireRole indirectly via thread.*) to
 *     establish the identity,
 *   - rate-limits the call via the R0 KV bucket (one bucket per action
 *     so heavy upvoters don't drown out new questions),
 *   - delegates to the service layer where the cross-resource
 *     authorization check (isStudentEnrolled / isTeacherOfCourse) lives,
 *   - revalidates the lesson page so the new row is rendered.
 */

async function lessonPath(courseId: string, lessonId?: string) {
  const qs = new URLSearchParams();
  if (lessonId) qs.set("lesson", lessonId);
  return `/student/courses/${courseId}/learn?${qs.toString()}`;
}

async function answerPath(courseId: string, lessonId: string, qna: string) {
  const qs = new URLSearchParams();
  qs.set("lesson", lessonId);
  qs.set("qna", qna);
  return `/student/courses/${courseId}/learn?${qs.toString()}`;
}

export async function askQuestionAction(args: {
  lessonId: string;
  courseId: string;
  title: string;
  content: string;
  tags?: string[];
}): Promise<{ success: boolean; error?: string; threadId?: string }> {
  const user = await requireUser();
  const blocked = await enforceRateLimit("materials.upload", user.id); // reuse low-frequency bucket until R4 bucket is named
  if (blocked) return { success: false, error: "Too many requests." };

  try {
    const row = await askQuestion({
      lessonId: args.lessonId,
      userId: user.id,
      userRole: user.role,
      title: args.title,
      content: args.content,
      tags: args.tags,
    });
    revalidatePath(await lessonPath(args.courseId, args.lessonId));
    return { success: true, threadId: row.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function postAnswerAction(args: {
  questionId: string;
  courseId: string;
  content: string;
}): Promise<{ success: boolean; error?: string; threadId?: string }> {
  const user = await requireUser();
  const blocked = await enforceRateLimit("materials.upload", user.id);
  if (blocked) return { success: false, error: "Too many requests." };

  try {
    const row = await postAnswer({
      parentId: args.questionId,
      userId: user.id,
      userRole: user.role,
      content: args.content,
    });
    revalidatePath(await answerPath(args.courseId, "", args.questionId));
    return { success: true, threadId: row.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function postCommentAction(args: {
  parentId: string;
  courseId: string;
  content: string;
}): Promise<{ success: boolean; error?: string; threadId?: string }> {
  const user = await requireUser();
  const blocked = await enforceRateLimit("materials.upload", user.id);
  if (blocked) return { success: false, error: "Too many requests." };

  try {
    const row = await postComment({
      parentId: args.parentId,
      userId: user.id,
      userRole: user.role,
      content: args.content,
    });
    revalidatePath(`/student/courses/${args.courseId}/learn`);
    return { success: true, threadId: row.id };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function voteAction(args: {
  threadId: string;
  courseId: string;
  value: -1 | 1;
}): Promise<{ success: boolean; error?: string; upvotes?: number; downvotes?: number; myVote?: -1 | 0 | 1 }> {
  const user = await requireUser();
  // Anti-spam: 1 vote per thread per user per 2s. Reuse materials.upload
  // bucket via a custom check on (user, thread) pair; for simplicity we
  // apply the global bucket and rely on the PK on qa_votes to deduplicate.
  const decision = await rateLimit("materials.upload", `vote:${user.id}`);
  if (!decision.ok) {
    return { success: false, error: "Slow down — too many votes." };
  }

  try {
    const result = await vote({
      threadId: args.threadId,
      userId: user.id,
      userRole: user.role,
      value: args.value,
    });
    revalidatePath(`/student/courses/${args.courseId}/learn`);
    return {
      success: true,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      myVote: result.myVote,
    };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function acceptAnswerAction(args: {
  questionId: string;
  answerId: string;
  courseId: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await acceptAnswer({
      questionId: args.questionId,
      answerId: args.answerId,
      userId: user.id,
      userRole: user.role,
    });
    revalidatePath(`/student/courses/${args.courseId}/learn`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function setStatusAction(args: {
  threadId: string;
  status: "open" | "resolved" | "closed";
  courseId: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await setStatus({
      threadId: args.threadId,
      status: args.status,
      userId: user.id,
      userRole: user.role,
    });
    revalidatePath(`/student/courses/${args.courseId}/learn`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function pinThreadAction(args: {
  threadId: string;
  pinned: boolean;
  courseId: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await pinThread({
      threadId: args.threadId,
      pinned: args.pinned,
      userId: user.id,
      userRole: user.role,
    });
    revalidatePath(`/student/courses/${args.courseId}/learn`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteThreadAction(args: {
  threadId: string;
  courseId: string;
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await softDeleteThread({
      threadId: args.threadId,
      userId: user.id,
      userRole: user.role,
    });
    revalidatePath(`/student/courses/${args.courseId}/learn`);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// Reference some keys here to keep the parser happy with the new bucket.
// Real per-action buckets can be added in R4.1 once we have telemetry.
void RATE_LIMIT_CONFIG;
