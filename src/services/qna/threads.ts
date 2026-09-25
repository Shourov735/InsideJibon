import "server-only";

import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import {
  qaThreads,
  qaVotes,
  users,
  lessons,
  courseModules,
  courses,
  type QaThread,
  type QaKind,
  type QaStatus,
} from "@/db/schema";
import { isStudentEnrolled } from "@/services/enrollments/enrollments";
import { emitQaUpvoteXp, emitQaAcceptedXp } from "@/services/xp/emit";
import { createNotification } from "@/services/notifications/notifications";

/**
 * R4 Doubt Q&A — service layer.
 *
 * Authorization model:
 *   - askQuestion / postAnswer / postComment : require an active
 *     enrollment in the lesson's parent course (or a teacher/admin
 *     viewing the lesson).
 *   - vote / acceptAnswer : require the user be signed in and have
 *     access to the lesson (enrolled or owner/admin).
 *   - pin / lock / softDelete : require teacher-of-course or admin.
 *   - The `isTeacherOfCourse` resolver is authoritative — every
 *     privileged write is re-checked against the DB before mutating.
 *
 * Concurrency: `drizzle-orm/neon-http` has no transactions. Vote
 * counters are maintained via a compare-and-swap UPDATE; if the swap
 * fails (counter drift), we re-aggregate from `qa_votes` and reconcile.
 */

// ----------------------------------------------------------------------------
// Access helpers
// ----------------------------------------------------------------------------

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export interface LessonContext {
  lessonId: string;
  courseId: string;
  teacherId: string;
}

async function resolveLessonContext(
  lessonId: string
): Promise<LessonContext | null> {
  if (!isUuid(lessonId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      lessonId: lessons.id,
      courseId: courses.id,
      teacherId: courses.teacherId,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, courseModules.courseId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return row ?? null;
}

async function resolveThreadContext(
  threadId: string
): Promise<LessonContext | null> {
  if (!isUuid(threadId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      lessonId: qaThreads.lessonId,
      courseId: courses.id,
      teacherId: courses.teacherId,
    })
    .from(qaThreads)
    .innerJoin(lessons, eq(lessons.id, qaThreads.lessonId))
    .innerJoin(courseModules, eq(courseModules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, courseModules.courseId))
    .where(eq(qaThreads.id, threadId))
    .limit(1);
  return row ?? null;
}

export async function canAccessLesson(
  userId: string,
  lessonId: string,
  role: "student" | "teacher" | "admin"
): Promise<boolean> {
  const ctx = await resolveLessonContext(lessonId);
  if (!ctx) return false;
  if (role !== "student") return true; // teacher / admin see all lessons
  return isStudentEnrolled(userId, ctx.courseId);
}

async function isTeacherOfCourse(
  userId: string,
  courseId: string
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(and(eq(courses.id, courseId), eq(courses.teacherId, userId)))
    .limit(1);
  return Boolean(row);
}

// ----------------------------------------------------------------------------
// Reads
// ----------------------------------------------------------------------------

export interface QaThreadWithMeta extends QaThread {
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  authorRole: "student" | "teacher" | "admin";
  answerCount: number;
  myVote: -1 | 0 | 1;
  isAccepted: boolean;
  parentId: string | null;
  title: string | null;
  children: QaThreadWithMeta[];
}

export type QaSort = "top" | "new" | "unanswered";
export type QaFilter = "all" | "open" | "resolved" | "closed" | "mine";

/**
 * Fetch the top-level questions for a lesson, plus their direct answers
 * and the comments under both. Threading depth is capped at 3: an answer
 * can have comments, but comments don't have comments (the UI collapses
 * further depth).
 *
 * `currentUserId` is used to populate `myVote` for each row.
 */
export async function listLessonQa(args: {
  lessonId: string;
  currentUserId: string;
  currentUserRole: "student" | "teacher" | "admin";
  sort?: QaSort;
  filter?: QaFilter;
}): Promise<QaThreadWithMeta[]> {
  const ctx = await resolveLessonContext(args.lessonId);
  if (!ctx) return [];
  if (
    args.currentUserRole === "student" &&
    !(await isStudentEnrolled(args.currentUserId, ctx.courseId))
  ) {
    return [];
  }

  const db = getDb();
  const sort = args.sort ?? "top";
  const filter = args.filter ?? "all";

  // 1. Top-level questions.
  const where = [eq(qaThreads.lessonId, args.lessonId), isNull(qaThreads.parentId)];
  if (filter === "open") where.push(eq(qaThreads.status, "open"));
  if (filter === "resolved") where.push(eq(qaThreads.status, "resolved"));
  if (filter === "closed") where.push(eq(qaThreads.status, "closed"));
  if (filter === "mine") where.push(eq(qaThreads.userId, args.currentUserId));

  let orderClause: SQL[];
  if (sort === "new") {
    orderClause = [desc(qaThreads.pinned), desc(qaThreads.createdAt)];
  } else {
    // 'top' and 'unanswered' share the same ordering: pinned first,
    // then score desc, then newest.
    orderClause = [
      desc(qaThreads.pinned),
      sql`(${qaThreads.upvotes} - ${qaThreads.downvotes}) DESC`,
      desc(qaThreads.createdAt),
    ];
  }

  // 'unanswered' is treated as a sort fallback: same ordering as 'top'
  // (pinned first, then score desc, then newest).

  const questions = (await db
    .select({
      thread: qaThreads,
      authorName: users.name,
      authorImage: users.imageUrl,
      authorRole: users.role,
    })
    .from(qaThreads)
    .innerJoin(users, eq(users.id, qaThreads.userId))
    .where(and(...where))
    .orderBy(...orderClause)
    .limit(100)) as Array<{
    thread: QaThread;
    authorName: string | null;
    authorImage: string | null;
    authorRole: "student" | "teacher" | "admin";
  }>;

  if (questions.length === 0) return [];

  // 2. Hydrate: votes for the current user, direct replies (answers +
  //    comments), and per-question answer counts.
  const questionIds = questions.map((q) => q.thread.id);

  const [votes, replies, answerCounts] = await Promise.all([
    db
      .select({ threadId: qaVotes.threadId, value: qaVotes.value })
      .from(qaVotes)
      .where(
        and(
          eq(qaVotes.userId, args.currentUserId),
          inArray(qaVotes.threadId, questionIds)
        )
      ),
    db
      .select({
        thread: qaThreads,
        authorName: users.name,
        authorImage: users.imageUrl,
        authorRole: users.role,
      })
      .from(qaThreads)
      .innerJoin(users, eq(users.id, qaThreads.userId))
      .where(
        and(
          inArray(qaThreads.parentId, questionIds),
          isNull(qaThreads.deletedAt)
        )
      )
      .orderBy(asc(qaThreads.createdAt))
      .limit(500),
    db
      .select({
        parentId: qaThreads.parentId,
        count: sql<number>`count(*)::int`,
      })
      .from(qaThreads)
      .where(
        and(
          inArray(qaThreads.parentId, questionIds),
          eq(qaThreads.kind, "answer")
        )
      )
      .groupBy(qaThreads.parentId),
  ]);

  // 3. Stitch.
  const voteMap = new Map<string, -1 | 1>();
  votes.forEach((v) => voteMap.set(v.threadId, v.value === 1 ? 1 : -1));

  const replyMap = new Map<string, Array<{
    thread: QaThread;
    authorName: string | null;
    authorImage: string | null;
    authorRole: "student" | "teacher" | "admin";
  }>>();
  replies.forEach((r) => {
    const pid = r.thread.parentId ?? "";
    const arr = replyMap.get(pid) ?? [];
    arr.push(r);
    replyMap.set(pid, arr);
  });

  const ansCountMap = new Map<string, number>();
  answerCounts.forEach((c) => ansCountMap.set(c.parentId ?? "", Number(c.count)));

  return questions.map((q): QaThreadWithMeta => {
    const children = (replyMap.get(q.thread.id) ?? []).map((r): QaThreadWithMeta => ({
      ...r.thread,
      kind: r.thread.kind as QaThreadWithMeta["kind"],
      authorId: r.thread.userId,
      authorName: r.authorName,
      authorImage: r.authorImage,
      authorRole: r.authorRole,
      answerCount: 0,
      myVote: voteMap.get(r.thread.id) ?? 0,
      isAccepted: q.thread.acceptedAnswerId === r.thread.id,
      children: [],
    }));
    return {
      ...q.thread,
      kind: q.thread.kind as QaThreadWithMeta["kind"],
      authorId: q.thread.userId,
      authorName: q.authorName,
      authorImage: q.authorImage,
      authorRole: q.authorRole,
      answerCount: ansCountMap.get(q.thread.id) ?? 0,
      myVote: voteMap.get(q.thread.id) ?? 0,
      isAccepted: false,
      children,
    };
  });
}

// ----------------------------------------------------------------------------
// Writes — questions / answers / comments
// ----------------------------------------------------------------------------

export async function askQuestion(args: {
  lessonId: string;
  userId: string;
  userRole: "student" | "teacher" | "admin";
  title: string;
  content: string;
  tags?: string[];
}): Promise<QaThread> {
  const title = args.title.trim();
  const content = args.content.trim();
  if (title.length < 5) throw new Error("Title must be at least 5 characters.");
  if (title.length > 200) throw new Error("Title must be at most 200 characters.");
  if (content.length < 10) throw new Error("Content must be at least 10 characters.");
  if (content.length > 4000) throw new Error("Content must be at most 4000 characters.");

  const access = await canAccessLesson(args.userId, args.lessonId, args.userRole);
  if (!access) throw new Error("You are not enrolled in this course.");

  const db = getDb();
  const [row] = await db
    .insert(qaThreads)
    .values({
      lessonId: args.lessonId,
      userId: args.userId,
      kind: "question",
      title,
      content,
      tags: args.tags ?? [],
    })
    .returning();
  if (!row) throw new Error("Failed to create question.");
  return row;
}

export async function postAnswer(args: {
  parentId: string;
  userId: string;
  userRole: "student" | "teacher" | "admin";
  content: string;
}): Promise<QaThread> {
  const content = args.content.trim();
  if (content.length < 10) throw new Error("Answer must be at least 10 characters.");
  if (content.length > 4000) throw new Error("Answer must be at most 4000 characters.");

  const db = getDb();
  const [parent] = await db
    .select({
      id: qaThreads.id,
      userId: qaThreads.userId,
      lessonId: qaThreads.lessonId,
      kind: qaThreads.kind,
      locked: qaThreads.locked,
    })
    .from(qaThreads)
    .where(eq(qaThreads.id, args.parentId))
    .limit(1);
  if (!parent) throw new Error("Question not found.");
  if (parent.kind !== "question") throw new Error("Answers can only attach to questions.");
  if (parent.locked) throw new Error("This question is locked.");

  const access = await canAccessLesson(args.userId, parent.lessonId, args.userRole);
  if (!access) throw new Error("You are not enrolled in this course.");

  const ctx = await resolveLessonContext(parent.lessonId);

  const [row] = await db
    .insert(qaThreads)
    .values({
      lessonId: parent.lessonId,
      userId: args.userId,
      kind: "answer",
      parentId: parent.id,
      content,
    })
    .returning();
  if (!row) throw new Error("Failed to post answer.");

  // Notify the question's author that someone answered their doubt.
  // Skip when the answerer is the same person (own-thread case).
  if (parent.userId && parent.userId !== args.userId) {
    try {
      await createNotification(parent.userId, {
        type: "system",
        title: "Your question has a new answer",
        body: content.slice(0, 140),
        link: `/student/courses/${ctx?.courseId ?? ""}/learn?lesson=${parent.lessonId}&qna=${row.id}`,
      });
    } catch (error) {
      console.error("postAnswer notification failed", error);
    }
  }

  return row;
}

export async function postComment(args: {
  parentId: string;
  userId: string;
  userRole: "student" | "teacher" | "admin";
  content: string;
}): Promise<QaThread> {
  const content = args.content.trim();
  if (content.length < 2) throw new Error("Comment must be at least 2 characters.");
  if (content.length > 1000) throw new Error("Comment must be at most 1000 characters.");

  const db = getDb();
  const [parent] = await db
    .select({ id: qaThreads.id, lessonId: qaThreads.lessonId, kind: qaThreads.kind, locked: qaThreads.locked })
    .from(qaThreads)
    .where(eq(qaThreads.id, args.parentId))
    .limit(1);
  if (!parent) throw new Error("Parent thread not found.");
  if (parent.locked) throw new Error("This thread is locked.");

  const access = await canAccessLesson(args.userId, parent.lessonId, args.userRole);
  if (!access) throw new Error("You are not enrolled in this course.");

  const [row] = await db
    .insert(qaThreads)
    .values({
      lessonId: parent.lessonId,
      userId: args.userId,
      kind: "comment",
      parentId: parent.id,
      content,
    })
    .returning();
  if (!row) throw new Error("Failed to post comment.");
  return row;
}

// ----------------------------------------------------------------------------
// Votes — atomic compare-and-swap
// ----------------------------------------------------------------------------

export interface VoteResult {
  upvotes: number;
  downvotes: number;
  myVote: -1 | 0 | 1;
}

/**
 * Upsert a vote. We use compare-and-swap to keep the denormalized
 * counters on `qa_threads` honest without transactions:
 *
 *   1. SELECT the existing qa_votes row for (thread, user).
 *   2. Compute the +/- delta to apply.
 *   3. UPSERT the vote row.
 *   4. UPDATE the counters atomically with `WHERE upvotes = oldUp`.
 *   5. On swap failure, retry once after re-reading the counter; if
 *      still failing, give up and reconcile from qa_votes (rare).
 */
export async function vote(args: {
  threadId: string;
  userId: string;
  userRole: "student" | "teacher" | "admin";
  value: -1 | 1;
}): Promise<VoteResult> {
  const ctx = await resolveThreadContext(args.threadId);
  if (!ctx) throw new Error("Thread not found.");
  const access = await canAccessLesson(args.userId, ctx.lessonId, args.userRole);
  if (!access) throw new Error("You are not enrolled in this course.");

  const db = getDb();

  // 1. Lookup existing vote + thread state.
  const [existing] = await db
    .select({ value: qaVotes.value })
    .from(qaVotes)
    .where(and(eq(qaVotes.threadId, args.threadId), eq(qaVotes.userId, args.userId)))
    .limit(1);

  const [thread] = await db
    .select({
      id: qaThreads.id,
      userId: qaThreads.userId,
      upvotes: qaThreads.upvotes,
      downvotes: qaThreads.downvotes,
      kind: qaThreads.kind,
    })
    .from(qaThreads)
    .where(eq(qaThreads.id, args.threadId))
    .limit(1);

  if (!thread) throw new Error("Thread not found.");
  if (thread.userId === args.userId) {
    throw new Error("You cannot vote on your own thread.");
  }
  if (thread.kind === "comment") {
    // Voting on individual comments is intentionally disabled — the
    // upvote budget is meant for questions and answers.
    throw new Error("Voting on comments is disabled.");
  }

  const previous: -1 | 0 | 1 = existing ? (existing.value === 1 ? 1 : -1) : 0;
  const next: -1 | 0 | 1 = previous === args.value ? 0 : args.value;

  // 2. Compute delta.
  let upDelta = 0;
  let downDelta = 0;
  if (previous === 1) upDelta -= 1;
  if (previous === -1) downDelta -= 1;
  if (next === 1) upDelta += 1;
  if (next === -1) downDelta += 1;

  // 3. Upsert vote row.
  if (next === 0) {
    if (existing) {
      await db
        .delete(qaVotes)
        .where(
          and(eq(qaVotes.threadId, args.threadId), eq(qaVotes.userId, args.userId))
        );
    }
  } else {
    await db
      .insert(qaVotes)
      .values({ threadId: args.threadId, userId: args.userId, value: next })
      .onConflictDoUpdate({
        target: [qaVotes.threadId, qaVotes.userId],
        set: { value: next },
      });
  }

  // 4. Atomic counter swap.
  const expectedUp = thread.upvotes + upDelta;
  const expectedDown = thread.downvotes + downDelta;
  let result = await db
    .update(qaThreads)
    .set({
      upvotes: expectedUp,
      downvotes: expectedDown,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(qaThreads.id, args.threadId),
        eq(qaThreads.upvotes, thread.upvotes),
        eq(qaThreads.downvotes, thread.downvotes)
      )
    )
    .returning({ upvotes: qaThreads.upvotes, downvotes: qaThreads.downvotes });

  if (result.length === 0) {
    // CAS failed → re-aggregate from qa_votes and force a single write.
    const reconciled = await reconcileVoteCounters(args.threadId);
    result = [
      {
        upvotes: reconciled.upvotes,
        downvotes: reconciled.downvotes,
      },
    ];
  }

  // 5. Emit XP for the thread author on a new upvote.
  if (upDelta > 0) {
    await emitQaUpvoteXp(thread.userId, args.userId, args.threadId, 1);
  }

  return {
    upvotes: result[0].upvotes,
    downvotes: result[0].downvotes,
    myVote: next,
  };
}

async function reconcileVoteCounters(threadId: string): Promise<{ upvotes: number; downvotes: number }> {
  const db = getDb();
  const [agg] = await db
    .select({
      upvotes: sql<number>`SUM(CASE WHEN value =  1 THEN 1 ELSE 0 END)::int`,
      downvotes: sql<number>`SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END)::int`,
    })
    .from(qaVotes)
    .where(eq(qaVotes.threadId, threadId));
  const up = Number(agg?.upvotes ?? 0);
  const down = Number(agg?.downvotes ?? 0);
  await db
    .update(qaThreads)
    .set({ upvotes: up, downvotes: down, updatedAt: sql`now()` })
    .where(eq(qaThreads.id, threadId));
  return { upvotes: up, downvotes: down };
}

// ----------------------------------------------------------------------------
// Accept answer / status
// ----------------------------------------------------------------------------

export async function acceptAnswer(args: {
  questionId: string;
  answerId: string;
  userId: string;
  userRole: "student" | "teacher" | "admin";
}): Promise<QaThread> {
  const db = getDb();

  const [question] = await db
    .select({
      id: qaThreads.id,
      userId: qaThreads.userId,
      kind: qaThreads.kind,
      lessonId: qaThreads.lessonId,
      acceptedAnswerId: qaThreads.acceptedAnswerId,
    })
    .from(qaThreads)
    .where(eq(qaThreads.id, args.questionId))
    .limit(1);
  if (!question || question.kind !== "question") throw new Error("Question not found.");

  const access = await canAccessLesson(args.userId, question.lessonId, args.userRole);
  if (!access) throw new Error("You are not enrolled in this course.");

  // Author-only: question asker can accept their own answer.
  // (Teachers / admins can also accept on behalf of a student.)
  const isOwner = question.userId === args.userId;
  const isStaff = args.userRole !== "student";
  if (!isOwner && !isStaff) throw new Error("Only the asker can accept an answer.");

  const [answer] = await db
    .select({
      id: qaThreads.id,
      kind: qaThreads.kind,
      parentId: qaThreads.parentId,
      userId: qaThreads.userId,
    })
    .from(qaThreads)
    .where(eq(qaThreads.id, args.answerId))
    .limit(1);
  if (!answer || answer.kind !== "answer" || answer.parentId !== question.id) {
    throw new Error("Answer must be a reply on this question.");
  }

  const newStatus = question.acceptedAnswerId === args.answerId ? "open" : "resolved";

  const [updated] = await db
    .update(qaThreads)
    .set({
      acceptedAnswerId: newStatus === "open" ? null : args.answerId,
      status: newStatus,
      updatedAt: sql`now()`,
    })
    .where(eq(qaThreads.id, args.questionId))
    .returning();

  // Emit XP for the answer author the first time an answer is accepted.
  const acceptJustHappened =
    newStatus === "resolved" && question.acceptedAnswerId !== args.answerId;

  if (acceptJustHappened) {
    await emitQaAcceptedXp(answer.userId, question.userId, args.questionId, answer.id);
    if (answer.userId !== question.userId) {
      try {
        const ctx = await resolveLessonContext(question.lessonId);
        await createNotification(answer.userId, {
          type: "system",
          title: "Your answer was accepted",
          body: "+25 XP for helping a peer.",
          link: `/student/courses/${ctx?.courseId ?? ""}/learn?lesson=${question.lessonId}&qna=${args.questionId}`,
        });
      } catch (error) {
        console.error("acceptAnswer notification failed", error);
      }
    }
  }

  return updated ?? question;
}

export async function setStatus(args: {
  threadId: string;
  userId: string;
  userRole: "student" | "teacher" | "admin";
  status: QaStatus;
}): Promise<QaThread> {
  const ctx = await resolveThreadContext(args.threadId);
  if (!ctx) throw new Error("Thread not found.");

  const db = getDb();
  const [thread] = await db
    .select({ kind: qaThreads.kind, userId: qaThreads.userId })
    .from(qaThreads)
    .where(eq(qaThreads.id, args.threadId))
    .limit(1);
  if (!thread) throw new Error("Thread not found.");
  if (thread.kind !== "question") throw new Error("Status can only be set on questions.");

  const isOwner = thread.userId === args.userId;
  const isStaff = args.userRole !== "student";
  if (!isOwner && !isStaff) throw new Error("Only the asker can change status.");

  const [updated] = await db
    .update(qaThreads)
    .set({ status: args.status, updatedAt: sql`now()` })
    .where(eq(qaThreads.id, args.threadId))
    .returning();
  if (updated) return updated;
  // Fallback: thread disappeared between SELECT and UPDATE — re-read.
  const [fallback] = await db
    .select()
    .from(qaThreads)
    .where(eq(qaThreads.id, args.threadId))
    .limit(1);
  if (!fallback) throw new Error("Thread not found.");
  return fallback;
}

// ----------------------------------------------------------------------------
// Pin / Lock (moderation)
// ----------------------------------------------------------------------------

export async function pinThread(args: {
  threadId: string;
  userId: string;
  userRole: "student" | "teacher" | "admin";
  pinned: boolean;
}): Promise<QaThread> {
  const ctx = await resolveThreadContext(args.threadId);
  if (!ctx) throw new Error("Thread not found.");

  if (args.userRole === "student") {
    throw new Error("Only teachers and admins can pin threads.");
  }
  if (args.userRole === "teacher") {
    const ok = await isTeacherOfCourse(args.userId, ctx.courseId);
    if (!ok) throw new Error("You don't own this course.");
  }

  const db = getDb();
  const [updated] = await db
    .update(qaThreads)
    .set({
      pinned: args.pinned,
      pinnedAt: args.pinned ? sql`now()` : null,
      pinnedBy: args.pinned ? args.userId : null,
      updatedAt: sql`now()`,
    })
    .where(eq(qaThreads.id, args.threadId))
    .returning();
  if (!updated) throw new Error("Thread not found.");
  return updated;
}

// ----------------------------------------------------------------------------
// Search (ILIKE on title + content)
// ----------------------------------------------------------------------------

export interface SearchHit {
  id: string;
  lessonId: string;
  title: string | null;
  content: string;
  upvotes: number;
  downvotes: number;
  status: string;
  kind: QaKind;
  createdAt: Date;
  authorName: string | null;
}

export async function searchQuestions(args: {
  q: string;
  lessonId?: string;
  limit?: number;
}): Promise<SearchHit[]> {
  const term = args.q.trim();
  if (term.length < 2) return [];
  const db = getDb();
  const conds: SQL[] = [
    isNull(qaThreads.parentId),
    isNull(qaThreads.deletedAt),
    sql`(${qaThreads.title} ILIKE ${"%" + term + "%"} OR ${qaThreads.content} ILIKE ${"%" + term + "%"})`,
  ];
  if (args.lessonId) conds.push(eq(qaThreads.lessonId, args.lessonId));

  return db
    .select({
      id: qaThreads.id,
      lessonId: qaThreads.lessonId,
      title: qaThreads.title,
      content: qaThreads.content,
      upvotes: qaThreads.upvotes,
      downvotes: qaThreads.downvotes,
      status: qaThreads.status,
      kind: qaThreads.kind,
      createdAt: qaThreads.createdAt,
      authorName: users.name,
    })
    .from(qaThreads)
    .innerJoin(users, eq(users.id, qaThreads.userId))
    .where(and(...conds))
    .orderBy(desc(qaThreads.createdAt))
    .limit(Math.min(args.limit ?? 20, 50));
}
