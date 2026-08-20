import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import fs from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ok
}

import { users, courses } from "../src/db/schema";
import * as courseService from "../src/services/courses";

const db = drizzle(neon(process.env.DATABASE_URL!));
const SEED_FILE = "/tmp/public-route-smoke.json";

interface Seed {
  teacherAId: string;
  teacherBId: string;
  publishedSlug: string;
  draftSlug: string;
  archivedSlug: string;
  publishedB?: string;
}

async function seed(): Promise<void> {
  const teacherAId = "test_smoke_teacher_a_" + Date.now();
  const teacherBId = "test_smoke_teacher_b_" + Date.now();

  await db.insert(users).values([
    { id: teacherAId, email: `smoke_a_${Date.now()}@test.com`, name: "Smoke Teacher A", role: "teacher" },
    { id: teacherBId, email: `smoke_b_${Date.now()}@test.com`, name: "Smoke Teacher B", role: "teacher" },
  ]);

  const published = await courseService.createCourse(teacherAId, {
    title: "Smoke Published Course",
    description: "A published course used for the public route smoke test.",
  });
  const draft = await courseService.createCourse(teacherAId, {
    title: "Smoke Draft Course",
    description: "This draft must 404 on the public site.",
  });
  const archived = await courseService.createCourse(teacherAId, {
    title: "Smoke Archived Course",
    description: "This archived course must 404 on the public site.",
  });

  const mod = await courseService.createModule(teacherAId, { courseId: published.id, title: "Smoke Module" });
  await courseService.createLesson(teacherAId, {
    moduleId: mod.id,
    title: "Free Smoke Lesson",
    isFree: true,
  });
  await courseService.createLesson(teacherAId, {
    moduleId: mod.id,
    title: "Paid Smoke Lesson",
    isFree: false,
  });
  await courseService.publishCourse(teacherAId, published.id);
  await courseService.archiveCourse(teacherAId, archived.id);

  const publishedB = await courseService.createCourse(teacherBId, {
    title: "Smoke Published Course B",
    description: "Second teacher's published course for the smoke test.",
  });
  const modB = await courseService.createModule(teacherBId, { courseId: publishedB.id, title: "Beta Module" });
  await courseService.createLesson(teacherBId, { moduleId: modB.id, title: "Beta Lesson", isFree: true });
  await courseService.publishCourse(teacherBId, publishedB.id);

  const seed: Seed = {
    teacherAId,
    teacherBId,
    publishedSlug: published.slug,
    draftSlug: draft.slug,
    archivedSlug: archived.slug,
    publishedB: publishedB.slug,
  };
  fs.writeFileSync(SEED_FILE, JSON.stringify(seed));
  console.log("SEEDED", JSON.stringify(seed));
}

async function cleanup(): Promise<void> {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8")) as Seed;
  await db.delete(courses).where(eq(courses.teacherId, seed.teacherAId));
  await db.delete(courses).where(eq(courses.teacherId, seed.teacherBId));
  await db.delete(users).where(eq(users.id, seed.teacherAId));
  await db.delete(users).where(eq(users.id, seed.teacherBId));
  fs.rmSync(SEED_FILE, { force: true });
  console.log("CLEANED");
}

if (process.argv[2] === "cleanup") {
  cleanup();
} else {
  seed();
}