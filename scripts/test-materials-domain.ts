import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { and, count, eq, inArray } from "drizzle-orm";

// Load environment
try {
  process.loadEnvFile(".env.local");
} catch {
  // ok
}

import {
  courses,
  lessons,
  materials,
  users,
} from "../src/db/schema";
import * as courseService from "../src/services/courses";
import * as enrollmentService from "../src/services/enrollments";
import * as materialService from "../src/services/materials";
import {
  buildMaterialStorageKey,
  sanitizeStorageName,
  toContentDispositionFilename,
  validateMaterialFile,
  MAX_MATERIAL_SIZE_BYTES,
} from "../src/schemas/material";
import { MemoryStorage } from "../src/lib/storage";

const db = drizzle(neon(process.env.DATABASE_URL!));

class FailingPutStorage extends MemoryStorage {
  override async putObject(): Promise<void> {
    throw new Error("simulated R2 outage");
  }
}

function makeFile(
  name: string,
  type: string,
  size = 1024
): materialService.UploadMaterialFile {
  return {
    name,
    type,
    size,
    async arrayBuffer() {
      return new ArrayBuffer(size);
    },
  };
}

async function expectThrows(
  label: string,
  fn: () => Promise<unknown>,
  errorType?: new (...args: never[]) => Error
): Promise<void> {
  let caught: unknown = null;
  try {
    await fn();
  } catch (error) {
    caught = error;
  }
  if (!caught) {
    throw new Error(`SECURITY/EXPECTATION FAILURE: "${label}" did not throw!`);
  }
  if (errorType && !(caught instanceof errorType)) {
    throw new Error(
      `"${label}" threw the wrong error type: ${(caught as Error).constructor.name}`
    );
  }
}

async function runTests() {
  console.log("=== STARTING INSIDEJIBON MATERIALS DOMAIN & SECURITY TESTS ===\n");

  const suffix = Date.now();
  const teacherAId = `test_mat_ta_${suffix}`;
  const teacherBId = `test_mat_tb_${suffix}`;
  const studentAId = `test_mat_sa_${suffix}`;
  const studentBId = `test_mat_sb_${suffix}`;
  const userIds = [teacherAId, teacherBId, studentAId, studentBId];
  const courseIds: string[] = [];

  try {
    // ── Setup ──────────────────────────────────────────────────────────────
    console.log("1. Setting up test users, courses and lessons...");
    await db.insert(users).values([
      { id: teacherAId, email: `mat_ta_${suffix}@test.com`, name: "Teacher A", role: "teacher" },
      { id: teacherBId, email: `mat_tb_${suffix}@test.com`, name: "Teacher B", role: "teacher" },
      { id: studentAId, email: `mat_sa_${suffix}@test.com`, name: "Student A", role: "student" },
      { id: studentBId, email: `mat_sb_${suffix}@test.com`, name: "Student B", role: "student" },
    ]);

    const courseA = await courseService.createCourse(teacherAId, {
      title: "Materials Physics",
      description: "Course for material upload/access tests.",
    });
    courseIds.push(courseA.id);
    const moduleA = await courseService.createModule(teacherAId, {
      courseId: courseA.id,
      title: "Core",
    });
    const lessonA1 = await courseService.createLesson(teacherAId, {
      moduleId: moduleA.id,
      title: "Lesson One",
    });
    const lessonA2 = await courseService.createLesson(teacherAId, {
      moduleId: moduleA.id,
      title: "Lesson Two",
    });
    await courseService.publishCourse(teacherAId, courseA.id);

    const courseB = await courseService.createCourse(teacherBId, {
      title: "Teacher B Materials Course",
      description: "Unrelated course owned by Teacher B.",
    });
    courseIds.push(courseB.id);
    const moduleB = await courseService.createModule(teacherBId, {
      courseId: courseB.id,
      title: "Module B",
    });
    await courseService.createLesson(teacherBId, {
      moduleId: moduleB.id,
      title: "Foreign Lesson",
    });
    await courseService.publishCourse(teacherBId, courseB.id);

    await enrollmentService.enrollStudent(studentAId, courseA.id);
    console.log("✓ Setup complete.");

    const storage = new MemoryStorage();

    // ── 1. Teacher uploads a material ──────────────────────────────────────
    console.log("\n2. Teacher A uploads a PDF material to lesson A1...");
    const uploaded = await materialService.uploadMaterial(
      teacherAId,
      { lessonId: lessonA1.id, name: "Lecture Notes" },
      makeFile("lecture-notes.pdf", "application/pdf", 4096),
      storage
    );
    if (uploaded.name !== "Lecture Notes") throw new Error("Custom name not applied");
    if (uploaded.originalFilename !== "lecture-notes.pdf") throw new Error("Filename mismatch");
    if (uploaded.mimeType !== "application/pdf") throw new Error("MIME mismatch");
    if (uploaded.sizeBytes !== 4096) throw new Error("Size mismatch");
    if ("storageKey" in uploaded) {
      throw new Error("MaterialSummary must never expose storageKey!");
    }
    console.log(`✓ Uploaded material ${uploaded.id} (name, mime, size correct).`);

    // ── 2. R2 (storage) object metadata is correct ─────────────────────────
    console.log("\n3. Storage object metadata check...");
    if (storage.objectCount() !== 1) throw new Error(`Expected 1 object, got ${storage.objectCount}`);
    const [dbRow] = await db
      .select()
      .from(materials)
      .where(eq(materials.id, uploaded.id));
    if (!dbRow) throw new Error("DB row missing after upload");
    const head = await storage.headObject(dbRow.storageKey);
    if (!head) throw new Error("Object missing in storage");
    if (head.contentType !== "application/pdf") throw new Error("Stored contentType wrong");
    if (head.contentLength !== 4096) throw new Error("Stored size wrong");
    if (head.customMetadata?.materialId !== uploaded.id) throw new Error("Stored materialId metadata wrong");
    if (head.customMetadata?.lessonId !== lessonA1.id) throw new Error("Stored lessonId metadata wrong");
    const expectedKey = buildMaterialStorageKey(courseA.id, lessonA1.id, uploaded.id, "lecture-notes.pdf");
    if (dbRow.storageKey !== expectedKey) throw new Error(`Storage key unexpected: ${dbRow.storageKey}`);
    console.log("✓ Object metadata (contentType/size/custom) and storage key verified.");

    // ── 3. Default name derives from filename ──────────────────────────────
    console.log("\n4. Upload without a name defaults to filename stem...");
    const auto = await materialService.uploadMaterial(
      teacherAId,
      { lessonId: lessonA1.id },
      makeFile("worksheet-01.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      storage
    );
    if (auto.name !== "worksheet-01") throw new Error(`Unexpected default name: ${auto.name}`);
    console.log(`✓ Default name = "${auto.name}".`);

    // ── 4. Teacher lists own lesson materials ──────────────────────────────
    console.log("\n5. Teacher A lists materials for lesson A1...");
    const listA = await materialService.getTeacherLessonMaterials(teacherAId, lessonA1.id);
    if (listA.length !== 2) throw new Error(`Expected 2 materials, got ${listA.length}`);
    const listA2 = await materialService.getTeacherLessonMaterials(teacherAId, lessonA2.id);
    if (listA2.length !== 0) throw new Error("Lesson A2 should have no materials");
    console.log("✓ Listing works per lesson.");

    // ── 5. Teacher cannot list another teacher's lesson ────────────────────
    console.log("\n6. Teacher B lists Teacher A's lesson materials...");
    const crossList = await materialService.getTeacherLessonMaterials(teacherBId, lessonA1.id);
    if (crossList.length !== 0) throw new Error("Teacher B must see an empty list for foreign lesson");
    console.log("✓ Cross-teacher listing denied (empty).");

    // ── 6. Teacher cannot upload to another teacher's lesson ───────────────
    console.log("\n7. Teacher B uploads to Teacher A's lesson...");
    await expectThrows(
      "cross-teacher upload",
      () =>
        materialService.uploadMaterial(
          teacherBId,
          { lessonId: lessonA1.id },
          makeFile("sneaky.pdf", "application/pdf"),
          storage
        ),
      materialService.LessonNotFoundError
    );
    const countAfterUploads = storage.objectCount();
    if (countAfterUploads !== 2) throw new Error("Failed upload must not create objects");
    console.log("✓ Cross-teacher upload rejected (LessonNotFoundError, no object written).");

    // ── 7. Teacher cannot delete/update another teacher's material ─────────
    console.log("\n8. Teacher B deletes/renames Teacher A's material...");
    await expectThrows(
      "cross-teacher delete",
      () => materialService.deleteMaterial(teacherBId, uploaded.id, storage),
      materialService.MaterialNotFoundError
    );
    await expectThrows(
      "cross-teacher update",
      () => materialService.updateMaterial(teacherBId, uploaded.id, { materialId: uploaded.id, name: "Hijacked" }),
      materialService.MaterialNotFoundError
    );
    const countAfterDeniedDelete = storage.objectCount();
    if (countAfterDeniedDelete !== 2) throw new Error("Denied delete must not remove objects");
    console.log("✓ Cross-teacher delete/update rejected, objects untouched.");

    // ── 8. resolveMaterialForUser (download path) role matrix ──────────────
    console.log("\n9. Download resolution matrix...");
    const byStudentA = await materialService.resolveMaterialForUser(studentAId, "student", uploaded.id);
    if (!byStudentA || byStudentA.id !== uploaded.id) throw new Error("Enrolled student must resolve");
    const byStudentB = await materialService.resolveMaterialForUser(studentBId, "student", uploaded.id);
    if (byStudentB !== null) throw new Error("Non-enrolled student must NOT resolve");
    const byGhost = await materialService.resolveMaterialForUser("ghost_student", "student", uploaded.id);
    if (byGhost !== null) throw new Error("Ghost student must NOT resolve");
    const byOwner = await materialService.resolveMaterialForUser(teacherAId, "teacher", uploaded.id);
    if (!byOwner) throw new Error("Owning teacher must resolve");
    const byForeignTeacher = await materialService.resolveMaterialForUser(teacherBId, "teacher", uploaded.id);
    if (byForeignTeacher !== null) throw new Error("Foreign teacher must NOT resolve (no existence leak)");
    const byAdmin = await materialService.resolveMaterialForUser("admin_user", "teacher", uploaded.id);
    if (byAdmin !== null) throw new Error("Unknown admin user must NOT resolve");
    console.log("✓ Role/ownership matrix correct (all denials are null, no info leak).");

    // ── 9. Student access: list + download URL ─────────────────────────────
    console.log("\n10. Student material access...");
    const studentList = await materialService.getLessonMaterialsForStudent(studentAId, lessonA1.id);
    if (!studentList || studentList.length !== 2) throw new Error("Enrolled student must see lesson materials");
    const deniedList = await materialService.getLessonMaterialsForStudent(studentBId, lessonA1.id);
    if (deniedList !== null) throw new Error("Non-enrolled student must get null list");
    const url = await materialService.getMaterialDownloadUrlForStudent(studentAId, uploaded.id);
    if (url !== `/api/materials/${uploaded.id}/download`) throw new Error(`Unexpected URL: ${url}`);
    const deniedUrl = await materialService.getMaterialDownloadUrlForStudent(studentBId, uploaded.id);
    if (deniedUrl !== null) throw new Error("Non-enrolled student must get null URL");
    const canA = await materialService.canStudentAccessMaterial(studentAId, uploaded.id);
    const canB = await materialService.canStudentAccessMaterial(studentBId, uploaded.id);
    if (!canA || canB) throw new Error("Access booleans wrong");
    console.log("✓ Enrolled student access granted; non-enrolled denied (null everywhere).");

    // ── 10. Free lesson does NOT bypass enrollment ─────────────────────────
    console.log("\n11. Free-lesson material access follows enrollment rules...");
    await db
      .update(lessons)
      .set({ isFree: true })
      .where(eq(lessons.id, lessonA2.id));
    const freeMaterial = await materialService.uploadMaterial(
      teacherAId,
      { lessonId: lessonA2.id },
      makeFile("free-preview.pdf", "application/pdf", 2048),
      storage
    );
    const freeForEnrolled = await materialService.getLessonMaterialsForStudent(studentAId, lessonA2.id);
    if (!freeForEnrolled || freeForEnrolled.length !== 1) throw new Error("Enrolled student must see free-lesson materials");
    const freeForNonEnrolled = await materialService.getLessonMaterialsForStudent(studentBId, lessonA2.id);
    if (freeForNonEnrolled !== null) {
      throw new Error("Free lesson must NOT expose materials to non-enrolled users");
    }
    const freeResolve = await materialService.resolveMaterialForUser(studentBId, "student", freeMaterial.id);
    if (freeResolve !== null) throw new Error("Free-lesson material must still require enrollment");
    console.log("✓ Free-lesson materials remain enrollment-gated (consistent with lesson access).");

    // ── 11. Invalid file types rejected ────────────────────────────────────
    console.log("\n12. File validation rejections...");
    await expectThrows(
      "executable upload",
      () => materialService.uploadMaterial(teacherAId, { lessonId: lessonA1.id }, makeFile("virus.exe", "application/x-msdownload"), storage),
      materialService.UnsupportedFileTypeError
    );
    await expectThrows(
      "html-as-pdf upload",
      () => materialService.uploadMaterial(teacherAId, { lessonId: lessonA1.id }, makeFile("fake.pdf", "text/html"), storage),
      materialService.UnsupportedFileTypeError
    );
    await expectThrows(
      "extensionless upload",
      () => materialService.uploadMaterial(teacherAId, { lessonId: lessonA1.id }, makeFile("notes", "text/plain"), storage),
      materialService.UnsupportedFileTypeError
    );
    await expectThrows(
      "empty-mime upload",
      () => materialService.uploadMaterial(teacherAId, { lessonId: lessonA1.id }, makeFile("x.pdf", ""), storage),
      materialService.UnsupportedFileTypeError
    );
    const withPath = makeFile("../etc/passwd.pdf", "application/pdf");
    const pathValidation = validateMaterialFile(withPath);
    if (pathValidation.ok) throw new Error("Path traversal filename must be rejected");
    const html = validateMaterialFile(makeFile("evil.html", "text/html"));
    if (html.ok) throw new Error("HTML must be rejected");
    console.log("✓ Unsupported types, spoofed MIME, extensionless and traversal names rejected.");

    // ── 12. Oversized file rejected ────────────────────────────────────────
    console.log("\n13. Oversized file rejection...");
    await expectThrows(
      "oversized upload",
      () =>
        materialService.uploadMaterial(
          teacherAId,
          { lessonId: lessonA1.id },
          makeFile("huge.pdf", "application/pdf", MAX_MATERIAL_SIZE_BYTES + 1),
          storage
        ),
      materialService.FileTooLargeError
    );
    const exactlyAtLimit = validateMaterialFile(makeFile("ok.pdf", "application/pdf", MAX_MATERIAL_SIZE_BYTES));
    if (!exactlyAtLimit.ok) throw new Error("Exactly-at-limit file must pass validation");
    console.log(`✓ Files above ${MAX_MATERIAL_SIZE_BYTES} bytes rejected; at-limit accepted.`);

    // ── 13. Invalid IDs rejected at service boundary ───────────────────────
    console.log("\n14. Invalid IDs...");
    await expectThrows(
      "garbage lesson id upload",
      () => materialService.uploadMaterial(teacherAId, { lessonId: "not-a-uuid" }, makeFile("a.pdf", "application/pdf"), storage),
      materialService.LessonNotFoundError
    );
    await expectThrows(
      "garbage material id delete",
      () => materialService.deleteMaterial(teacherAId, "not-a-uuid", storage),
      materialService.MaterialNotFoundError
    );
    const badResolve = await materialService.resolveMaterialForUser(studentAId, "student", "garbage");
    if (badResolve !== null) throw new Error("Garbage material id must resolve to null");
    console.log("✓ Garbage IDs rejected cleanly at service boundaries.");

    // ── 14. Cross-course IDOR via material ids ─────────────────────────────
    console.log("\n15. Cross-course IDOR attempts...");
    const courseC = await courseService.createCourse(teacherAId, {
      title: "Second Course Materials",
      description: "Another Teacher A course.",
    });
    courseIds.push(courseC.id);
    const moduleC = await courseService.createModule(teacherAId, { courseId: courseC.id, title: "Module C" });
    const lessonC1 = await courseService.createLesson(teacherAId, { moduleId: moduleC.id, title: "C1" });
    await courseService.publishCourse(teacherAId, courseC.id);
    // Student A is NOT enrolled in course C.
    const materialC = await materialService.uploadMaterial(
      teacherAId,
      { lessonId: lessonC1.id },
      makeFile("course-c.pdf", "application/pdf"),
      storage
    );
    const idor = await materialService.resolveMaterialForUser(studentAId, "student", materialC.id);
    if (idor !== null) throw new Error("Student must not reach materials of unenrolled course");
    const idorList = await materialService.getLessonMaterialsForStudent(studentAId, lessonC1.id);
    if (idorList !== null) throw new Error("Student must not list unenrolled course lesson materials");
    console.log("✓ IDOR across courses denied.");

    // ── 15. Upload failure rolls back the DB row ───────────────────────────
    console.log("\n16. Upload rollback on storage failure...");
    const failingStorage = new FailingPutStorage();
    await expectThrows(
      "storage outage upload",
      () =>
        materialService.uploadMaterial(
          teacherAId,
          { lessonId: lessonA1.id },
          makeFile("doomed.pdf", "application/pdf"),
          failingStorage
        ),
      materialService.UploadFailedError
    );
    const [orphanCount] = await db
      .select({ value: count() })
      .from(materials)
      .where(and(eq(materials.name, "doomed"), eq(materials.lessonId, lessonA1.id)));
    if ((orphanCount?.value ?? 0) !== 0) throw new Error("Failed upload must roll back the DB row");
    console.log("✓ No orphan metadata row after failed storage write.");

    // ── 16. Missing object handled safely ──────────────────────────────────
    console.log("\n17. Missing object handling...");
    await storage.deleteObject(dbRow.storageKey); // simulate lost R2 object
    const stillListed = await materialService.getLessonMaterialsForStudent(studentAId, lessonA1.id);
    if (!stillListed || stillListed.length === 0) throw new Error("Metadata row should remain listable");
    // deleteMaterial must still succeed (delete of a missing object is a no-op)
    await materialService.deleteMaterial(teacherAId, uploaded.id, storage);
    const [afterDelete] = await db
      .select({ value: count() })
      .from(materials)
      .where(eq(materials.id, uploaded.id));
    if ((afterDelete?.value ?? 0) !== 0) throw new Error("Material row must be removed by delete");
    console.log("✓ Missing object is safe: listing intact, delete idempotent, row removed.");

    // ── 17. Teacher deletes own material (happy path) ──────────────────────
    console.log("\n18. Teacher deletes own material (happy path)...");
    const beforeDelete = storage.objectCount();
    await materialService.deleteMaterial(teacherAId, auto.id, storage);
    if (storage.objectCount() !== beforeDelete - 1) throw new Error("Storage object must be removed");
    const [gone] = await db.select().from(materials).where(eq(materials.id, auto.id));
    if (gone) throw new Error("DB row must be removed");
    const afterList = await materialService.getTeacherLessonMaterials(teacherAId, lessonA1.id);
    if (afterList.some((m) => m.id === auto.id)) throw new Error("Deleted material still listed");
    console.log("✓ Object + row removed together.");

    // ── 18. Rename works for owner only ────────────────────────────────────
    console.log("\n19. Rename material...");
    const renamed = await materialService.updateMaterial(teacherAId, freeMaterial.id, {
      materialId: freeMaterial.id,
      name: "Renamed Worksheet",
    });
    if (renamed.name !== "Renamed Worksheet") throw new Error("Rename failed");
    console.log("✓ Rename persisted.");

    // ── 19. Lesson deletion cleans up R2 + cascades rows ───────────────────
    console.log("\n20. Lesson deletion cleanup...");
    const lessonToDelete = await courseService.createLesson(teacherAId, {
      moduleId: moduleA.id,
      title: "Doomed Lesson",
    });
    const doomedMaterial = await materialService.uploadMaterial(
      teacherAId,
      { lessonId: lessonToDelete.id },
      makeFile("doomed.pdf", "application/pdf", 512),
      storage
    );
    const doomedKey = (await db.select().from(materials).where(eq(materials.id, doomedMaterial.id)))[0]
      ?.storageKey;
    if (!doomedKey || !storage.has(doomedKey)) throw new Error("Doomed material not in storage");
    await courseService.deleteLesson(teacherAId, lessonToDelete.id, storage);
    if (storage.has(doomedKey)) throw new Error("R2 object must be removed on lesson deletion");
    const [orphanRows] = await db
      .select({ value: count() })
      .from(materials)
      .where(eq(materials.lessonId, lessonToDelete.id));
    if ((orphanRows?.value ?? 0) !== 0) throw new Error("Material rows must cascade on lesson deletion");
    console.log("✓ Lesson deletion removes R2 objects and cascades rows.");

    // ── 20. Course deletion cleans up R2 + cascades rows ───────────────────
    console.log("\n21. Course deletion cleanup...");
    const courseDraft = await courseService.createCourse(teacherAId, {
      title: "Draft With Materials",
      description: "Deletable draft with materials.",
    });
    courseIds.push(courseDraft.id);
    const moduleD = await courseService.createModule(teacherAId, { courseId: courseDraft.id, title: "Module D" });
    const lessonD1 = await courseService.createLesson(teacherAId, { moduleId: moduleD.id, title: "D1" });
    const draftMaterial = await materialService.uploadMaterial(
      teacherAId,
      { lessonId: lessonD1.id },
      makeFile("draft.pdf", "application/pdf", 256),
      storage
    );
    const draftKey = (await db.select().from(materials).where(eq(materials.id, draftMaterial.id)))[0]
      ?.storageKey;
    if (!draftKey || !storage.has(draftKey)) throw new Error("Draft material not in storage");
    await courseService.deleteCourse(teacherAId, courseDraft.id, storage);
    if (storage.has(draftKey)) throw new Error("R2 object must be removed on course deletion");
    const [draftOrphans] = await db
      .select({ value: count() })
      .from(materials)
      .where(eq(materials.lessonId, lessonD1.id));
    if ((draftOrphans?.value ?? 0) !== 0) throw new Error("Material rows must cascade on course deletion");
    console.log("✓ Course deletion removes R2 objects and cascades rows.");

    // ── 21. Sanitization helpers ───────────────────────────────────────────
    console.log("\n22. Sanitization helpers...");
    if (sanitizeStorageName("My File (final)!.PDF") !== "my-file-final.pdf") {
      throw new Error(`Unexpected sanitize: ${sanitizeStorageName("My File (final)!.PDF")}`);
    }
    const traversal = sanitizeStorageName("../../etc/passwd");
    if (traversal !== "passwd" || traversal.includes("/") || traversal.includes("\\")) {
      throw new Error(`Traversal sanitize failed: ${traversal}`);
    }
    if (sanitizeStorageName("a".repeat(120) + ".pdf").length > 64) {
      throw new Error("Sanitized name must be length-limited");
    }
    const cd = toContentDispositionFilename("notes\r\n\r\nx.pdf");
    if (cd !== "notesx.pdf" && cd !== "notes x.pdf" && cd.includes("\r") && cd.includes("\n")) {
      throw new Error("Content-Disposition filename must strip CR/LF");
    }
    if (toContentDispositionFilename("bangla-নোট.pdf") !== "bangla-নোট.pdf") {
      throw new Error("Non-ASCII filenames must pass through untouched");
    }
    console.log("✓ Key/header sanitization verified.");

    console.log("\n============================================================");
    console.log("🎉 ALL MATERIALS DOMAIN & SECURITY TESTS PASSED SUCCESSFULLY! 🎉");
    console.log("============================================================\n");
  } catch (err) {
    console.error("TEST FAILED WITH ERROR:", err);
    process.exitCode = 1;
  } finally {
    try {
      if (courseIds.length) {
        await db.delete(courses).where(inArray(courses.id, courseIds));
      }
      await db.delete(users).where(inArray(users.id, userIds));
      console.log("✓ Test cleanup completed.");
    } catch (cleanupError) {
      console.warn("Cleanup issue:", cleanupError);
    }
    if (process.exitCode) process.exit(1);
  }
}

runTests();