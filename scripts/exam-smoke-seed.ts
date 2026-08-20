import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";
import fs from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ok
}

import {
  courses,
  examAnswers,
  examAttempts,
  examQuestions,
  exams,
  questionOptions,
  users,
} from "../src/db/schema";
import * as courseService from "../src/services/courses";
import * as enrollService from "../src/services/enrollments";
import * as examService from "../src/services/exams";

const db = drizzle(neon(process.env.DATABASE_URL!));
const SEED_FILE = "/tmp/exam-smoke-seed.json";

interface Seed {
  studentClerkId: string;
  teacherId: string;
  courseId: string;
  examId: string;
  attemptId: string;
}

async function seed(studentClerkId: string): Promise<void> {
  const suffix = Date.now();
  const teacherId = `test_smoke_teacher_${suffix}`;

  await db.insert(users).values({
    id: teacherId,
    email: `smoke_exam_teacher_${suffix}@test.com`,
    name: "Smoke Exam Teacher",
    role: "teacher",
  });

  const course = await courseService.createCourse(teacherId, {
    title: `Smoke Exam Course ${suffix}`,
    description: "Published course for the Phase 4 exam smoke test.",
  });
  await db.update(courses).set({ status: "published" }).where(eq(courses.id, course.id));

  await enrollService.enrollStudent(studentClerkId, course.id);

  const exam = await examService.createExam(teacherId, {
    courseId: course.id,
    title: `Smoke Exam ${suffix}`,
    description: "Smoke exam seeded for the deployed-worker smoke test.",
    durationMinutes: 45,
    maxAttempts: 3,
  });

  const built: Array<{ id: string; correctOptionId: string; wrongOptionId: string; marks: number }> = [];
  for (const [i, marks] of [[1, 2], [2, 2], [3, 2]] as const) {
    const q = await examService.createQuestion(teacherId, {
      examId: exam.id,
      questionText: `Smoke Question ${i}`,
      marks,
    });
    const correct = await examService.createOption(teacherId, {
      questionId: q.id,
      optionText: `Smoke Correct Option ${i}`,
      isCorrect: true,
    });
    const wrong = await examService.createOption(teacherId, {
      questionId: q.id,
      optionText: `Smoke Wrong Option ${i}`,
    });
    built.push({ id: q.id, correctOptionId: correct.id, wrongOptionId: wrong.id, marks });
  }

  await examService.publishExam(teacherId, exam.id);

  const started = await examService.startExam(studentClerkId, exam.id);
  await examService.submitExam(studentClerkId, started.attemptId, [
    { questionId: built[0].id, selectedOptionId: built[0].correctOptionId },
    { questionId: built[1].id, selectedOptionId: built[1].correctOptionId },
    { questionId: built[2].id, selectedOptionId: built[2].wrongOptionId },
  ]);

  const seed: Seed = {
    studentClerkId,
    teacherId,
    courseId: course.id,
    examId: exam.id,
    attemptId: started.attemptId,
  };
  fs.writeFileSync(SEED_FILE, JSON.stringify(seed));
  console.log("SEEDED", JSON.stringify(seed));
}

async function cleanup(): Promise<void> {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8")) as Seed;
  const qRows = await db
    .select({ id: examQuestions.questionId })
    .from(examQuestions)
    .where(eq(examQuestions.examId, seed.examId));
  await db.delete(questionOptions).where(
    inArray(
      questionOptions.questionId,
      qRows.map((r) => r.id)
    )
  );
  await db.delete(examAnswers).where(
    inArray(
      examAnswers.attemptId,
      (
        await db
          .select({ id: examAttempts.id })
          .from(examAttempts)
          .where(eq(examAttempts.examId, seed.examId))
      ).map((r) => r.id)
    )
  );
  await db.delete(examAttempts).where(eq(examAttempts.examId, seed.examId));
  await db.delete(examQuestions).where(eq(examQuestions.examId, seed.examId));
  await db.delete(exams).where(eq(exams.id, seed.examId));
  await db.delete(courses).where(eq(courses.id, seed.courseId));
  await db.delete(users).where(eq(users.id, seed.teacherId));
  fs.rmSync(SEED_FILE, { force: true });
  console.log("CLEANED");
}

if (process.argv[2] === "cleanup") {
  cleanup();
} else {
  const studentClerkId = process.argv[2];
  if (!studentClerkId) {
    console.error("usage: tsx scripts/exam-smoke-seed.ts <studentClerkId> | cleanup");
    process.exit(1);
  }
  seed(studentClerkId);
}