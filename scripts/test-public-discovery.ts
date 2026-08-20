import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";

// Load environment
try {
  process.loadEnvFile(".env.local");
} catch {
  // ok
}

import { users, courses } from "../src/db/schema";
import * as courseService from "../src/services/courses";

const db = drizzle(neon(process.env.DATABASE_URL!));

async function runTests() {
  console.log("=== STARTING INSIDEJIBON PUBLIC COURSE DISCOVERY TESTS ===\n");

  const testTeacherAId = "test_pub_teacher_a_" + Date.now();
  const testTeacherBId = "test_pub_teacher_b_" + Date.now();

  let courseA: Awaited<ReturnType<typeof courseService.createCourse>> | null = null;
  let draftCourseA: Awaited<ReturnType<typeof courseService.createCourse>> | null = null;
  let archivedCourseA: Awaited<ReturnType<typeof courseService.createCourse>> | null = null;
  let courseB: Awaited<ReturnType<typeof courseService.createCourse>> | null = null;

  try {
    // 1. Setup: Teacher A and Teacher B
    console.log("1. Setting up test teacher users...");
    await db.insert(users).values([
      {
        id: testTeacherAId,
        email: `pub_teacher_a_${Date.now()}@test.com`,
        name: "Public Teacher Alpha",
        imageUrl: "https://example.com/alpha.png",
        role: "teacher",
      },
      {
        id: testTeacherBId,
        email: `pub_teacher_b_${Date.now()}@test.com`,
        name: "Public Teacher Beta",
        role: "teacher",
      },
    ]);
    console.log("✓ Test teachers created.");

    // 2. Teacher A creates: published, draft, archived courses
    console.log("\n2. Creating published, draft and archived courses for Teacher A...");
    courseA = await courseService.createCourse(testTeacherAId, {
      title: "Public Discovery Physics",
      description: "A fully published course with a complete curriculum for public discovery.",
    });
    draftCourseA = await courseService.createCourse(testTeacherAId, {
      title: "Secret Draft Course",
      description: "This draft course must never appear publicly.",
    });
    archivedCourseA = await courseService.createCourse(testTeacherAId, {
      title: "Old Archived Course",
      description: "This archived course must never appear publicly.",
    });

    const modA1 = await courseService.createModule(testTeacherAId, {
      courseId: courseA.id,
      title: "Public Module One",
    });
    const modA2 = await courseService.createModule(testTeacherAId, {
      courseId: courseA.id,
      title: "Public Module Two",
    });
    await courseService.createLesson(testTeacherAId, {
      moduleId: modA1.id,
      title: "Free Public Lesson",
      content: "TOP-SECRET-CONTENT-NEVER-EXPOSE",
      isFree: true,
    });
    await courseService.createLesson(testTeacherAId, {
      moduleId: modA1.id,
      title: "Paid Public Lesson",
      content: "ANOTHER-SECRET-CONTENT",
      isFree: false,
    });
    await courseService.createLesson(testTeacherAId, {
      moduleId: modA2.id,
      title: "Second Module Lesson",
      content: "SECRET-CONTENT-THREE",
      isFree: false,
    });

    await courseService.publishCourse(testTeacherAId, courseA.id);
    await courseService.archiveCourse(testTeacherAId, archivedCourseA.id);
    console.log(`✓ Teacher A: published=${courseA.slug}, draft=${draftCourseA.slug}, archived=${archivedCourseA.slug}`);

    // 3. Teacher B creates a published course
    console.log("\n3. Teacher B creates a published course...");
    courseB = await courseService.createCourse(testTeacherBId, {
      title: "Teacher B Public Course",
      description: "A published course from a second teacher.",
    });
    const modB1 = await courseService.createModule(testTeacherBId, {
      courseId: courseB.id,
      title: "Beta Module",
    });
    await courseService.createLesson(testTeacherBId, {
      moduleId: modB1.id,
      title: "Beta Lesson",
      isFree: true,
    });
    await courseService.publishCourse(testTeacherBId, courseB.id);
    console.log(`✓ Teacher B: published=${courseB.slug}`);

    // 4. Catalog: only published courses appear, with teacher info and counts
    console.log("\n4. Testing getPublishedCourses() catalog...");
    const catalog = await courseService.getPublishedCourses();
    const catalogSlugs = catalog.map((c) => c.slug);
    console.log(`✓ Catalog contains ${catalog.length} courses: ${catalogSlugs.join(", ")}`);

    const aInCatalog = catalog.find((c) => c.id === courseA!.id);
    const draftInCatalog = catalog.find((c) => c.id === draftCourseA!.id);
    const archivedInCatalog = catalog.find((c) => c.id === archivedCourseA!.id);
    const bInCatalog = catalog.find((c) => c.id === courseB!.id);

    if (!aInCatalog) throw new Error("Teacher A's published course missing from catalog!");
    if (draftInCatalog) throw new Error("SECURITY FAILURE: Draft course appeared in catalog!");
    if (archivedInCatalog) throw new Error("SECURITY FAILURE: Archived course appeared in catalog!");
    if (!bInCatalog) throw new Error("Teacher B's published course missing from catalog!");

    if (aInCatalog.moduleCount !== 2) throw new Error(`Expected 2 modules, got ${aInCatalog.moduleCount}`);
    if (aInCatalog.lessonCount !== 3) throw new Error(`Expected 3 lessons, got ${aInCatalog.lessonCount}`);
    if (aInCatalog.teacher.name !== "Public Teacher Alpha") throw new Error("Teacher name missing from catalog entry");
    if (aInCatalog.teacher.imageUrl !== "https://example.com/alpha.png") throw new Error("Teacher image missing from catalog entry");
    if (!(aInCatalog.publishedAt instanceof Date)) throw new Error("publishedAt missing from catalog entry");
    console.log("✓ Catalog exposes only published courses with safe teacher info and counts.");

    // 5. Detail: published slug resolves with curriculum + free indicators
    console.log("\n5. Testing getPublishedCourseBySlugWithTeacher() on published course...");
    const detailA = await courseService.getPublishedCourseBySlugWithTeacher(courseA!.slug);
    if (!detailA) throw new Error("Published course should resolve by slug!");
    if (detailA.moduleCount !== 2 || detailA.lessonCount !== 3) throw new Error("Detail counts mismatch");
    if (detailA.modules.length !== 2) throw new Error("Expected 2 modules in detail");
    if (detailA.modules[0].lessons.length !== 2) throw new Error("Expected 2 lessons in first module");
    const freeLesson = detailA.modules[0].lessons.find((l) => l.isFree);
    if (!freeLesson || freeLesson.title !== "Free Public Lesson") throw new Error("Free preview indicator missing");

    // Lessons must NEVER expose content or video URLs publicly
    const anyContent = detailA.modules.some((m) =>
      m.lessons.some((l) => "content" in l || "videoUrl" in l)
    );
    if (anyContent) throw new Error("SECURITY FAILURE: Lesson content/videoUrl exposed publicly!");
    console.log("✓ Published course detail resolves with curriculum, positions and free-preview indicators.");
    console.log("✓ Lesson content and video URLs are not exposed.");

    // 6. Detail: draft slug must return null
    console.log("\n6. Testing draft course slug isolation...");
    const draftDetail = await courseService.getPublishedCourseBySlugWithTeacher(draftCourseA!.slug);
    if (draftDetail !== null) throw new Error("SECURITY FAILURE: Draft course exposed by public detail query!");
    console.log("✓ Draft course slug returns null.");

    // 7. Detail: archived slug must return null
    console.log("\n7. Testing archived course slug isolation...");
    const archivedDetail = await courseService.getPublishedCourseBySlugWithTeacher(archivedCourseA!.slug);
    if (archivedDetail !== null) throw new Error("SECURITY FAILURE: Archived course exposed by public detail query!");
    console.log("✓ Archived course slug returns null.");

    // 8. Detail: invalid slug must return null
    console.log("\n8. Testing invalid slug...");
    const invalidDetail = await courseService.getPublishedCourseBySlugWithTeacher("does-not-exist");
    if (invalidDetail !== null) throw new Error("Invalid slug should return null!");
    console.log("✓ Invalid slug returns null.");

    // 9. Teacher A's draft course is still accessible to its owner
    console.log("\n9. Verifying teacher management still works (no regression)...");
    const teacherACourses = await courseService.getTeacherCourses(testTeacherAId);
    const teacherADraft = await courseService.getTeacherCourseById(testTeacherAId, draftCourseA!.id);
    if (teacherACourses.length !== 3) throw new Error("Teacher A should still see all 3 courses");
    if (!teacherADraft) throw new Error("Teacher A should still access their own draft course");
    console.log(`✓ Teacher A still sees ${teacherACourses.length} courses (published/draft/archived).`);
    console.log("✓ Teacher-facing queries unaffected.");

    // 10. Cleanup (course/module/lesson rows cascade on course delete)
    console.log("\n10. Cleaning up test data...");
    await db.delete(courses).where(eq(courses.teacherId, testTeacherAId));
    await db.delete(courses).where(eq(courses.teacherId, testTeacherBId));
    await db.delete(users).where(eq(users.id, testTeacherAId));
    await db.delete(users).where(eq(users.id, testTeacherBId));
    console.log("✓ Test cleanup completed.");

    console.log("\n============================================================");
    console.log("🎉 ALL PUBLIC COURSE DISCOVERY TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("============================================================\n");
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    // Cleanup on failure
    try {
      await db.delete(courses).where(eq(courses.teacherId, testTeacherAId));
      await db.delete(courses).where(eq(courses.teacherId, testTeacherBId));
      await db.delete(users).where(eq(users.id, testTeacherAId));
      await db.delete(users).where(eq(users.id, testTeacherBId));
    } catch {
      // ignore
    }
    process.exit(1);
  }
}

runTests();