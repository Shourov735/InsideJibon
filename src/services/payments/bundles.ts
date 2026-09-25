/**
 * R6 — course bundles.
 *
 * A bundle groups multiple published courses together and sells them for a
 * single discounted BDT price. There is NO bKash-API integration here — the
 * payment-side lives in `submissions.ts` and `access.ts`. This file only
 * owns the bundle catalog (create / edit / publish / archive / reorder).
 */

import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  courses,
  courseBundles,
  courseBundleItems,
  type CourseBundle,
  type CourseBundleItem,
} from "@/db/schema";
import { isUuid } from "@/lib/utils";

export class BundleNotFoundError extends Error {
  constructor() {
    super("Course bundle not found.");
  }
}

export class BundleHasNoCoursesError extends Error {
  constructor() {
    super("Bundle must contain at least one course before publishing.");
  }
}

export interface CreateBundleInput {
  title: string;
  slug: string;
  description?: string;
  priceBdt: number;
  compareAtBdt?: number | null;
}

/** Slug regex: lowercase letters / digits / hyphens, 3–60 chars. Matches the
 *  shape used by `courses.slug` so the URL surface is consistent. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createBundle(
  input: CreateBundleInput,
  actorId: string
): Promise<CourseBundle> {
  if (!input.title.trim()) throw new Error("Title is required.");
  const slug = (input.slug || slugify(input.title)).trim();
  if (!SLUG_RE.test(slug)) {
    throw new Error(
      "Slug must be 3–60 chars of lowercase letters, digits, or hyphens."
    );
  }
  if (!Number.isFinite(input.priceBdt) || input.priceBdt <= 0) {
    throw new Error("Price must be greater than zero.");
  }

  const db = getDb();
  const [row] = await db
    .insert(courseBundles)
    .values({
      title: input.title.trim(),
      slug,
      description: (input.description ?? "").trim(),
      priceBdt: input.priceBdt.toFixed(2),
      compareAtBdt:
        input.compareAtBdt && input.compareAtBdt > 0
          ? input.compareAtBdt.toFixed(2)
          : null,
      status: "draft",
      createdBy: actorId,
    })
    .returning();

  if (!row) throw new Error("Failed to create bundle.");
  return row;
}

export async function updateBundle(
  id: string,
  patch: {
    title?: string;
    slug?: string;
    description?: string;
    priceBdt?: number;
    compareAtBdt?: number | null;
  },
  _actorId: string
): Promise<CourseBundle> {
  if (!isUuid(id)) throw new BundleNotFoundError();
  const db = getDb();

  const next: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) {
    if (!patch.title.trim()) throw new Error("Title cannot be empty.");
    next.title = patch.title.trim();
  }
  if (patch.slug !== undefined) {
    const candidate = patch.slug.trim();
    if (!SLUG_RE.test(candidate)) {
      throw new Error(
        "Slug must be 3–60 chars of lowercase letters, digits, or hyphens."
      );
    }
    next.slug = candidate;
  }
  if (patch.description !== undefined) {
    next.description = patch.description.trim();
  }
  if (patch.priceBdt !== undefined) {
    if (!Number.isFinite(patch.priceBdt) || patch.priceBdt <= 0) {
      throw new Error("Price must be greater than zero.");
    }
    next.priceBdt = patch.priceBdt.toFixed(2);
  }
  if (patch.compareAtBdt !== undefined) {
    next.compareAtBdt =
      patch.compareAtBdt && patch.compareAtBdt > 0
        ? patch.compareAtBdt.toFixed(2)
        : null;
  }

  const [row] = await db
    .update(courseBundles)
    .set(next)
    .where(eq(courseBundles.id, id))
    .returning();

  if (!row) throw new BundleNotFoundError();
  return row;
}

export async function publishBundle(id: string): Promise<CourseBundle> {
  if (!isUuid(id)) throw new BundleNotFoundError();
  const db = getDb();
  const items = await listBundleItems(id);
  if (items.length === 0) throw new BundleHasNoCoursesError();

  const [row] = await db
    .update(courseBundles)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(courseBundles.id, id), eq(courseBundles.status, "draft")))
    .returning();

  if (!row) throw new BundleNotFoundError();
  return row;
}

export async function archiveBundle(id: string): Promise<CourseBundle> {
  if (!isUuid(id)) throw new BundleNotFoundError();
  const db = getDb();
  const [row] = await db
    .update(courseBundles)
    .set({ status: "archived", updatedAt: new Date() })
    .where(eq(courseBundles.id, id))
    .returning();
  if (!row) throw new BundleNotFoundError();
  return row;
}

/** Public catalog: only published bundles, newest first. */
export async function listPublishedBundles(): Promise<
  Array<CourseBundle & { itemCount: number }>
> {
  const db = getDb();
  const rows = await db
    .select({
      bundle: courseBundles,
      itemCount: sql<number>`count(${courseBundleItems.id})::int`,
    })
    .from(courseBundles)
    .leftJoin(courseBundleItems, eq(courseBundleItems.bundleId, courseBundles.id))
    .where(eq(courseBundles.status, "published"))
    .groupBy(courseBundles.id)
    .orderBy(desc(courseBundles.publishedAt));

  return rows.map(({ bundle, itemCount }) => ({ ...bundle, itemCount }));
}

/** Admin list: every bundle regardless of status. */
export async function listAllBundles(): Promise<CourseBundle[]> {
  const db = getDb();
  return db
    .select()
    .from(courseBundles)
    .orderBy(desc(courseBundles.createdAt));
}

export async function getBundleById(
  id: string
): Promise<CourseBundle | null> {
  if (!isUuid(id)) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(courseBundles)
    .where(eq(courseBundles.id, id))
    .limit(1);
  return row ?? null;
}

export async function getBundleBySlug(
  slug: string
): Promise<CourseBundle | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(courseBundles)
    .where(eq(courseBundles.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function listBundleItems(
  bundleId: string
): Promise<Array<CourseBundleItem & { courseTitle: string; courseSlug: string }>> {
  if (!isUuid(bundleId)) return [];
  const db = getDb();
  return db
    .select({
      id: courseBundleItems.id,
      bundleId: courseBundleItems.bundleId,
      courseId: courseBundleItems.courseId,
      position: courseBundleItems.position,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(courseBundleItems)
    .innerJoin(courses, eq(courses.id, courseBundleItems.courseId))
    .where(eq(courseBundleItems.bundleId, bundleId))
    .orderBy(asc(courseBundleItems.position));
}

export async function addBundleItem(
  bundleId: string,
  courseId: string
): Promise<CourseBundleItem> {
  if (!isUuid(bundleId) || !isUuid(courseId)) {
    throw new BundleNotFoundError();
  }
  const db = getDb();
  const [{ maxPos }] = await db
    .select({
      maxPos: sql<number>`coalesce(max(${courseBundleItems.position}), 0)::int`,
    })
    .from(courseBundleItems)
    .where(eq(courseBundleItems.bundleId, bundleId));

  const [row] = await db
    .insert(courseBundleItems)
    .values({
      bundleId,
      courseId,
      position: maxPos + 1,
    })
    .onConflictDoNothing({
      target: [courseBundleItems.bundleId, courseBundleItems.courseId],
    })
    .returning();

  if (!row) {
    // Already on the bundle — fetch and return the existing row.
    const [existing] = await db
      .select()
      .from(courseBundleItems)
      .where(
        and(
          eq(courseBundleItems.bundleId, bundleId),
          eq(courseBundleItems.courseId, courseId)
        )
      )
      .limit(1);
    if (!existing) throw new Error("Failed to add course to bundle.");
    return existing;
  }
  return row;
}

export async function removeBundleItem(
  bundleId: string,
  courseId: string
): Promise<void> {
  if (!isUuid(bundleId) || !isUuid(courseId)) return;
  const db = getDb();
  await db
    .delete(courseBundleItems)
    .where(
      and(
        eq(courseBundleItems.bundleId, bundleId),
        eq(courseBundleItems.courseId, courseId)
      )
    );
}

/**
 * Reorder bundle items atomically (best-effort — drizzle-orm/neon-http has
 * no transactions; concurrent ticks would be rare from a single admin).
 * Accepts the full ordered list of course ids to keep the UI simple.
 */
export async function reorderBundleItems(
  bundleId: string,
  orderedCourseIds: string[]
): Promise<void> {
  if (!isUuid(bundleId)) throw new BundleNotFoundError();
  const db = getDb();
  for (let i = 0; i < orderedCourseIds.length; i++) {
    await db
      .update(courseBundleItems)
      .set({ position: i + 1 })
      .where(
        and(
          eq(courseBundleItems.bundleId, bundleId),
          eq(courseBundleItems.courseId, orderedCourseIds[i])
        )
      );
  }
}

/**
 * Returns the bundle's price plus the sum of the listed prices of its
 * member courses, so the marketing UI can show the saving.
 */
export async function getBundlePriceSummary(
  bundleId: string
): Promise<{
  bundlePriceBdt: number;
  compareAtBdt: number | null;
  coursesTotalBdt: number;
  itemCount: number;
} | null> {
  const bundle = await getBundleById(bundleId);
  if (!bundle) return null;

  const db = getDb();
  const items = await db
    .select({
      price: courses.priceBdt,
    })
    .from(courseBundleItems)
    .innerJoin(courses, eq(courses.id, courseBundleItems.courseId))
    .where(eq(courseBundleItems.bundleId, bundleId));

  const coursesTotalBdt = items.reduce<number>((acc, row) => {
    const value = row.price ? Number(row.price) : 0;
    return acc + (Number.isFinite(value) ? value : 0);
  }, 0);

  return {
    bundlePriceBdt: Number(bundle.priceBdt),
    compareAtBdt: bundle.compareAtBdt ? Number(bundle.compareAtBdt) : null,
    coursesTotalBdt,
    itemCount: items.length,
  };
}

/**
 * Returns the courses in a published bundle (joined). Used by the bundle
 * landing page so the student can see what they're paying for.
 */
export async function getPublishedBundleWithCourses(
  slug: string
): Promise<{
  bundle: CourseBundle;
  items: Array<{ courseId: string; title: string; slug: string; thumbnailUrl: string | null }>;
} | null> {
  const bundle = await getBundleBySlug(slug);
  if (!bundle || bundle.status !== "published") return null;

  const db = getDb();
  const items = await db
    .select({
      courseId: courses.id,
      title: courses.title,
      slug: courses.slug,
      thumbnailUrl: courses.thumbnailUrl,
    })
    .from(courseBundleItems)
    .innerJoin(courses, eq(courses.id, courseBundleItems.courseId))
    .where(eq(courseBundleItems.bundleId, bundle.id))
    .orderBy(asc(courseBundleItems.position));

  return { bundle, items };
}

/**
 * Resolve a bundle id to the list of course ids it contains. Used by the
 * approval flow to seed enrollment rows after a successful payment.
 */
export async function listCourseIdsForBundle(
  bundleId: string
): Promise<string[]> {
  if (!isUuid(bundleId)) return [];
  const db = getDb();
  const rows = await db
    .select({ courseId: courseBundleItems.courseId })
    .from(courseBundleItems)
    .where(eq(courseBundleItems.bundleId, bundleId));
  return rows.map((r) => r.courseId);
}

/** Convenience: does the bundle have any items at all? */
export async function bundleIsEmpty(bundleId: string): Promise<boolean> {
  const items = await listBundleItems(bundleId);
  return items.length === 0;
}

/**
 * Look up multiple bundles by id. Used by `/student/payments` to render
 * a friendly name for each of a student's paid submissions.
 */
export async function listBundlesByIds(
  ids: string[]
): Promise<CourseBundle[]> {
  const valid = ids.filter(isUuid);
  if (valid.length === 0) return [];
  const db = getDb();
  return db
    .select()
    .from(courseBundles)
    .where(inArray(courseBundles.id, valid));
}

/**
 * Returns course ids that appear in at least one currently-published bundle.
 * Used by the public catalog to render the "In a bundle" pill on cards.
 */
export async function listPublishedBundleCourseIds(): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ courseId: courseBundleItems.courseId })
    .from(courseBundleItems)
    .innerJoin(courseBundles, eq(courseBundles.id, courseBundleItems.bundleId))
    .where(eq(courseBundles.status, "published"));
  return rows.map((r) => r.courseId);
}

/**
 * Returns the cheapest published bundle that contains the given course.
 * Used by the public course detail page to offer a "Get bundle ৳X" CTA
 * when the standalone course is paid.
 */
export async function getCheapestPublishedBundleForCourse(
  courseId: string
): Promise<{ id: string; slug: string; priceBdt: string } | null> {
  if (!isUuid(courseId)) return null;
  const db = getDb();
  const [row] = await db
    .select({
      id: courseBundles.id,
      slug: courseBundles.slug,
      priceBdt: courseBundles.priceBdt,
    })
    .from(courseBundles)
    .innerJoin(courseBundleItems, eq(courseBundleItems.bundleId, courseBundles.id))
    .where(
      and(
        eq(courseBundleItems.courseId, courseId),
        eq(courseBundles.status, "published")
      )
    )
    .orderBy(asc(courseBundles.priceBdt))
    .limit(1);
  return row ?? null;
}
