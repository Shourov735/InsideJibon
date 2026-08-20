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
  console.log("=== STARTING INSIDEJIBON COURSE DOMAIN TESTS ===\n");

  const testTeacherAId = "test_teacher_a_" + Date.now();
  const testTeacherBId = "test_teacher_b_" + Date.now();

  try {
    // 1. Create two test teachers
    console.log("1. Setting up test teacher users...");
    await db.insert(users).values([
      {
        id: testTeacherAId,
        email: `teacher_a_${Date.now()}@test.com`,
        name: "Teacher Alpha",
        role: "teacher",
      },
      {
        id: testTeacherBId,
        email: `teacher_b_${Date.now()}@test.com`,
        name: "Teacher Beta",
        role: "teacher",
      },
    ]);
    console.log("✓ Test teachers created.");

    // 2. Teacher A creates Course 1
    console.log("\n2. Teacher A creates Course 1...");
    const courseA = await courseService.createCourse(testTeacherAId, {
      title: "Quantum Physics 101",
      description: "Comprehensive introduction to quantum state vectors and wavefunctions.",
    });
    console.log(`✓ Course 1 created: ID=${courseA.id}, slug=${courseA.slug}, status=${courseA.status}`);
    if (courseA.status !== "draft") throw new Error("Expected initial status to be draft");

    // 3. Test Slug Collision
    console.log("\n3. Testing Slug Collision Handling...");
    const courseA2 = await courseService.createCourse(testTeacherAId, {
      title: "Quantum Physics 101",
      description: "Another course with same initial title.",
    });
    console.log(`✓ Duplicate title handled: slug=${courseA2.slug}`);
    if (courseA2.slug === courseA.slug) throw new Error("Slug must be unique!");

    // 4. Test Publishing Validation on Empty Course (Should Fail)
    console.log("\n4. Testing Publishing Prerequisites on Empty Course...");
    const pubCheckEmpty = await courseService.validateCourseForPublishing(testTeacherAId, courseA.id);
    console.log(`✓ Can publish empty course? ${pubCheckEmpty.canPublish}`);
    console.log(`✓ Errors: ${pubCheckEmpty.errors.join("; ")}`);
    if (pubCheckEmpty.canPublish) throw new Error("Empty course should NOT be publishable!");

    // 5. Teacher A creates Module 1 and Module 2
    console.log("\n5. Teacher A creates Modules...");
    const mod1 = await courseService.createModule(testTeacherAId, {
      courseId: courseA.id,
      title: "Wave Mechanics",
      description: "Schrodinger equation basics",
    });
    const mod2 = await courseService.createModule(testTeacherAId, {
      courseId: courseA.id,
      title: "Operators and Eigenstates",
    });
    console.log(`✓ Module 1 pos=${mod1.position}, Module 2 pos=${mod2.position}`);
    if (mod1.position !== 1 || mod2.position !== 2) throw new Error("Positions should start at 1 and be contiguous");

    // 6. Teacher A creates Lessons in Module 1
    console.log("\n6. Teacher A creates Lessons...");
    const les1 = await courseService.createLesson(testTeacherAId, {
      moduleId: mod1.id,
      title: "The Wave Function",
      description: "Born interpretation of probability density",
      content: "# The Wave Function\n\nPsi(x, t) represents quantum probability amplitude.",
      isFree: true,
    });
    const les2 = await courseService.createLesson(testTeacherAId, {
      moduleId: mod1.id,
      title: "Infinite Square Well",
      isFree: false,
    });
    console.log(`✓ Lesson 1 pos=${les1.position} (free=${les1.isFree}), Lesson 2 pos=${les2.position}`);
    if (les1.position !== 1 || les2.position !== 2) throw new Error("Lesson positions should start at 1");

    // 7. Security Test: Teacher B attempts to update Course 1 (Should Fail)
    console.log("\n7. Security: Teacher B attempts to update Course 1...");
    let caught = false;
    try {
      await courseService.updateCourse(testTeacherBId, courseA.id, {
        courseId: courseA.id,
        title: "Hacked Course Title",
        slug: "hacked-slug",
      });
    } catch {
      caught = true;
    }
    if (!caught) throw new Error("SECURITY FAILURE: Teacher B was able to modify Teacher A's course!");
    console.log("✓ Access denied as expected.");

    // 8. Security Test: Teacher B attempts to add module to Course 1 (Should Fail)
    console.log("\n8. Security: Teacher B attempts to add module to Course 1...");
    caught = false;
    try {
      await courseService.createModule(testTeacherBId, {
        courseId: courseA.id,
        title: "Malicious Module",
      });
    } catch {
      caught = true;
    }
    if (!caught) throw new Error("SECURITY FAILURE: Teacher B was able to add module to Teacher A's course!");
    console.log("✓ Access denied as expected.");

    // 9. Security Test: Teacher B attempts to update Lesson 1 (Should Fail)
    console.log("\n9. Security: Teacher B attempts to update Lesson 1...");
    caught = false;
    try {
      await courseService.updateLesson(testTeacherBId, les1.id, {
        lessonId: les1.id,
        title: "Malicious Lesson Title",
      });
    } catch {
      caught = true;
    }
    if (!caught) throw new Error("SECURITY FAILURE: Teacher B was able to modify Teacher A's lesson!");
    console.log("✓ Access denied as expected.");

    // 10. Reordering Test: Reorder Modules
    console.log("\n10. Testing Module Reordering...");
    await courseService.reorderModules(testTeacherAId, courseA.id, [mod2.id, mod1.id]);
    const curriculumReordered = await courseService.getTeacherCourseWithCurriculum(testTeacherAId, courseA.id);
    if (!curriculumReordered) throw new Error("Course not found");
    console.log(`✓ New order: [1] ${curriculumReordered.modules[0].title}, [2] ${curriculumReordered.modules[1].title}`);
    if (curriculumReordered.modules[0].id !== mod2.id) throw new Error("Module reordering failed!");

    // 11. Publishing Prerequisites & Publishing Course 1
    console.log("\n11. Testing Course Publishing...");
    // Put at least one lesson in mod2 so all modules have lessons
    await courseService.createLesson(testTeacherAId, {
      moduleId: mod2.id,
      title: "Hermitian Operators",
    });
    const pubValidation = await courseService.validateCourseForPublishing(testTeacherAId, courseA.id);
    console.log(`✓ Can publish now? ${pubValidation.canPublish}`);
    if (!pubValidation.canPublish) throw new Error(`Publish validation failed: ${pubValidation.errors.join(", ")}`);

    const publishedCourse = await courseService.publishCourse(testTeacherAId, courseA.id);
    console.log(`✓ Published course: status=${publishedCourse.status}, publishedAt=${publishedCourse.publishedAt}`);
    if (publishedCourse.status !== "published") throw new Error("Course status should be published");

    // 12. Public Course Access Isolation
    console.log("\n12. Testing Public Course Access Isolation...");
    const pubCourse = await courseService.getPublishedCourseBySlug(publishedCourse.slug);
    if (!pubCourse) throw new Error("Published course should be accessible via getPublishedCourseBySlug");
    console.log(`✓ getPublishedCourseBySlug returned: "${pubCourse.title}"`);

    // Draft course should return null
    const draftQuery = await courseService.getPublishedCourseBySlug(courseA2.slug);
    if (draftQuery !== null) throw new Error("SECURITY FAILURE: Draft course was exposed by public query!");
    console.log("✓ Draft course correctly hidden from public query.");

    // 13. Published Course Permanent Deletion Protection
    console.log("\n13. Testing Published Course Deletion Protection...");
    caught = false;
    try {
      await courseService.deleteCourse(testTeacherAId, courseA.id);
    } catch {
      caught = true;
    }
    if (!caught) throw new Error("SECURITY FAILURE: Published course was casually deleted!");
    console.log("✓ Casual deletion of published course blocked.");

    // 14. Course Archive & Restore
    console.log("\n14. Testing Course Archival & Restoration...");
    const archived = await courseService.archiveCourse(testTeacherAId, courseA.id);
    console.log(`✓ Course archived: status=${archived.status}`);
    if (archived.status !== "archived") throw new Error("Expected status archived");

    // Archived course should not be returned by public query
    const archivedQuery = await courseService.getPublishedCourseBySlug(publishedCourse.slug);
    if (archivedQuery !== null) throw new Error("SECURITY FAILURE: Archived course was exposed by public query!");
    console.log("✓ Archived course correctly hidden from public query.");

    const restored = await courseService.restoreCourse(testTeacherAId, courseA.id);
    console.log(`✓ Course restored: status=${restored.status}`);
    if (restored.status !== "draft") throw new Error("Expected status draft");

    // 15. Clean up test data
    console.log("\n15. Cleaning up test data...");
    await db.delete(courses).where(eq(courses.id, courseA.id));
    await db.delete(courses).where(eq(courses.id, courseA2.id));
    await db.delete(users).where(eq(users.id, testTeacherAId));
    await db.delete(users).where(eq(users.id, testTeacherBId));
    console.log("✓ Test cleanup completed.");

    console.log("\n============================================================");
    console.log("🎉 ALL COURSE DOMAIN & SECURITY TESTS PASSED SUCCESSFULLY! 🎉");
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
