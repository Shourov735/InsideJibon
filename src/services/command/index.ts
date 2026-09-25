import "server-only";

import { sql, ilike, and, eq, desc, or, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  courses,
  exams,
  assignments,
  users,
  enrollments,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";

export type { CommandItem, CommandItemKind } from "./types";
import type { CommandItem } from "./types";

/**
 * R1 §4 — Command palette data layer.
 *
 * Server-side, role-scoped item index. Returns small typed objects
 * with just the fields the palette needs (id, slug, title, href,
 * group). Avoids loading full rows; uses ILIKE on a slugified title
 * for fuzzy-ish matching (Postgres `ILIKE '%term%'`).
 *
 * Limits: 5 per kind — keeps the palette responsive even when
 * teachers have 100+ courses. The client can refine with the typed
 * input.
 */

export interface CommandIndexResult {
  items: CommandItem[];
}

const MAX_PER_KIND = 5;

export async function indexCommandItems(
  user: CurrentUser,
  query: string,
): Promise<CommandIndexResult> {
  const db = getDb();
  const term = query.trim();
  const filter = term.length === 0 ? undefined : `%${term}%`;

  const items: CommandItem[] = [];

  // --- COURSES ------------------------------------------------------
  if (user.role === "student") {
    const rows = await db
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        thumbnailUrl: courses.thumbnailUrl,
      })
      .from(courses)
      .innerJoin(enrollments, eq(enrollments.courseId, courses.id))
      .where(
        and(
          eq(enrollments.studentId, user.id),
          eq(courses.status, "published"),
          filter ? or(ilike(courses.title, filter), ilike(courses.slug, filter)) : undefined,
        ),
      )
      .orderBy(desc(courses.publishedAt))
      .limit(MAX_PER_KIND);
    for (const r of rows) {
      items.push({
        id: `course:${r.id}`,
        title: r.title,
        subtitle: r.slug,
        group: "Courses",
        href: `/student/courses/${r.id}`,
        kind: "course",
      });
    }
  } else if (user.role === "teacher") {
    const rows = await db
      .select({
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        status: courses.status,
      })
      .from(courses)
      .where(
        and(
          eq(courses.teacherId, user.id),
          filter ? or(ilike(courses.title, filter), ilike(courses.slug, filter)) : undefined,
        ),
      )
      .orderBy(desc(courses.updatedAt))
      .limit(MAX_PER_KIND);
    for (const r of rows) {
      items.push({
        id: `course:${r.id}`,
        title: r.title,
        subtitle: `${r.status}`,
        group: "Courses",
        href: `/teacher/courses/${r.id}/overview`,
        kind: "course",
      });
    }
  }

  // --- EXAMS --------------------------------------------------------
  if (user.role === "teacher") {
    const rows = await db
      .select({
        id: exams.id,
        title: exams.title,
        status: exams.status,
      })
      .from(exams)
      .innerJoin(courses, eq(courses.id, exams.courseId))
      .where(
        and(
          eq(courses.teacherId, user.id),
          filter ? ilike(exams.title, filter) : undefined,
        ),
      )
      .orderBy(desc(exams.updatedAt))
      .limit(MAX_PER_KIND);
    for (const r of rows) {
      items.push({
        id: `exam:${r.id}`,
        title: r.title,
        subtitle: r.status,
        group: "Exams",
        href: `/teacher/exams/${r.id}`,
        kind: "exam",
      });
    }
  }

  // --- ASSIGNMENTS --------------------------------------------------
  if (user.role === "teacher") {
    const rows = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        status: assignments.status,
      })
      .from(assignments)
      .innerJoin(courses, eq(courses.id, assignments.courseId))
      .where(
        and(
          eq(courses.teacherId, user.id),
          filter ? ilike(assignments.title, filter) : undefined,
        ),
      )
      .orderBy(desc(assignments.updatedAt))
      .limit(MAX_PER_KIND);
    for (const r of rows) {
      items.push({
        id: `assignment:${r.id}`,
        title: r.title,
        subtitle: r.status,
        group: "Assignments",
        href: `/teacher/assignments/${r.id}`,
        kind: "assignment",
      });
    }
  }

  // --- STUDENTS (teacher only) -------------------------------------
  if (user.role === "teacher") {
    const courseIds = (await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.teacherId, user.id))) as Array<{ id: string }>;
    if (courseIds.length > 0) {
      const rows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .innerJoin(enrollments, eq(enrollments.studentId, users.id))
        .where(
          and(
            inArray(
              enrollments.courseId,
              courseIds.map((c) => c.id),
            ),
            filter
              ? or(ilike(users.name, filter), ilike(users.email, filter))
              : undefined,
          ),
        )
        .orderBy(desc(enrollments.enrolledAt))
        .limit(MAX_PER_KIND);
      for (const r of rows) {
        items.push({
          id: `student:${r.id}`,
          title: r.name ?? r.email,
          subtitle: r.email,
          group: "Students",
          href: `/teacher/students/${r.id}`,
          kind: "student",
        });
      }
    }
  }

  return { items };
}

/**
 * No-op used to keep Drizzle's `sql` import alive for tooling that
 * strips unused imports. (R1 keeps `sql` ready for fuzzy ranking in
 * R8 when the AI tutor lands.)
 */
export const _sql = sql;
