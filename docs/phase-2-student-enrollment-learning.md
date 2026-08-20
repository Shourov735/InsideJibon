# Phase 2 — Student Enrollment & Learning: Implementation Report

## 1. Objective

Ship the student-side of the learning product: enrollment on public course pages, a
student dashboard, a lesson learning workspace, lesson completion + resume tracking,
and server-side authorization for every protected entry point — deployed to Cloudflare
Workers and verified with both local tests and deployed smoke tests.

## 2. Schema

New file `src/db/schema/learning.ts`:

- `enrollments`
  - `studentId` (TEXT, FK → `users.id`, ON DELETE CASCADE)
  - `courseId` (UUID, FK → `courses.id`, ON DELETE CASCADE)
  - `enrolledAt` (default now)
  - `completedAt` (nullable, set by `syncEnrollmentCompletion` at 100%)
  - Unique `(student_id, course_id)` — enrollment is idempotent
- `lesson_progress`
  - `studentId` (TEXT, FK → `users.id`, CASCADE)
  - `lessonId` (UUID, FK → `lessons.id`, CASCADE)
  - `completed` (bool, default false)
  - `completedAt` (nullable, preserved across re-completion via COALESCE)
  - `lastPosition` (float, default 0) — video resume position
  - `updatedAt` (default now)
  - Unique `(student_id, lesson_id)`

Migration `0002_silent_carlie_cooper.sql` generated via Drizzle and applied to Neon
(verified against `information_schema`); journal is now at 3 entries (0000–0002).

## 3. Types & validation

- `src/types/learning.ts` — `CourseProgress`, `LearningCourse`, `LessonAccess`,
  `StudentCourseSummary`, `EnrollmentResult`, dashboard + progress shapes.
- `src/schemas/learning.ts` — zod contracts at every boundary:
  `enrollCourseSchema`, `lessonProgressActionSchema`, `lessonPositionActionSchema`
  (position coerced with `z.coerce.number()`).

## 4. Service layer

- `src/services/enrollments/enrollments.ts`
  - `CourseNotFoundError`, `CourseNotPublishedError`
  - `enrollStudent` — idempotent (`onConflictDoNothing`), only for published courses
  - `isStudentEnrolled`, `getStudentEnrollment`, `getStudentEnrollments` (with teacher name)
- `src/services/learning/learning.ts`
  - `LessonAccessDeniedError` + `verifyLessonAccess` — the core authorization join:
    lesson → module → course → enrollment with `status = 'published'`
  - `getLearningCourse` / `getLessonForStudent` (prev/next + completed count)
  - `markLessonCompleted` / `unmarkLessonCompleted` → returns `{ courseId }` for revalidation
  - `updateLessonPosition`, `getCourseProgress`, `getLastAccessedLesson`, `getStudentDashboard`
  - Invalid UUIDs are rejected up front with `isUuid()` (`src/lib/utils.ts`) so services
    throw clean domain errors instead of leaking Postgres errors.

## 5. Server actions (protected at every mutation entry point)

- `src/app/student/actions/enroll-actions.ts` — `enrollInCourseAction`:
  `requireStudent()` → zod → service → revalidate `/courses`, `/courses/<slug>`, `/student`,
  `/student/courses`, learn path.
- `src/app/student/actions/progress-actions.ts` — `markLessonCompleteAction`,
  `updateLessonPositionAction`: `requireStudent()` → zod → service, sanitized errors,
  `revalidatePath` on completion.

## 6. Routes

- `/student` — dashboard: stats, "Continue Learning" hero (sorted by last access),
  published-course grid with per-course progress bars.
- `/student/courses` — full enrolled-course list.
- `/student/courses/[courseId]/learn` — learning workspace keyed by `?lesson=<lessonId>`:
  curriculum sidebar (mobile via `<details>`), progress card, video player with resume,
  complete/undo button, prev/next navigation.
  - `notFound()` for non-UUID ids, non-enrolled students, draft/archived courses.
- Public `/courses/[slug]` — enroll CTA for authenticated students; anonymous visitors
  get a "Sign in to enroll" prompt. Also fixed Phase 1B bug: `totalLessons` now counts
  real lessons instead of module count.

## 7. UI components (`src/components/student/`)

`student-nav.tsx`, `progress-bar.tsx`, `student-course-card.tsx`, `enroll-button.tsx`,
`lesson-complete-button.tsx`, `lesson-video.tsx`, `learning-sidebar.tsx`.

- Video resume: YouTube/Vimeo `start`/`#t=` params; direct files via native `<video>`
  with 5s-throttled `timeupdate` → `updateLessonPositionAction`.
- Lesson body rendered as preformatted text (no markdown dependency introduced).

## 8. Security model

- `requireUser()` / `requireRole()` (`src/lib/permissions.ts`) at the top of every action
  and layout-gated page; layouts are not security boundaries.
- Student ID always from the verified Clerk `__session` cookie (`src/lib/auth.ts`),
  never from the client.
- Access is derived from the database ownership chain (lesson → module → course →
  enrollment, published only), so forged IDs cannot bypass enrollment checks.
- Archived courses revoke learning access (spec requirement); dashboard shows only
  published enrollments.
- Sanitized errors: unauthorized access returns generic messages, never internals.

## 9. Tests

`scripts/test-learning-domain.ts` — 21 groups, all passing (run with
`env NODE_OPTIONS=--conditions=react-server npx tsx scripts/test-learning-domain.ts`):
enrollment rules (published/draft/archived), idempotency + raw unique-violation,
cross-user isolation, workspace access/denial, cross-course completion blocked,
completion idempotency, 100%/67% progress + `completedAt` set/clear, zero-lesson
safety, module-spanning prev/next, ghost students, invalid UUIDs (schema + service),
archive-after-enroll revocation, dashboard filtering. Cleanup verified.

Existing suites `test-course-domain.ts` and `test-public-discovery.ts` still pass.

## 10. Build & deploy verification

- `npm run lint` — 0 errors (5 pre-existing `next/image` warnings only)
- `npx tsc --noEmit` — clean
- `npm run build` — clean
- `npx opennextjs-cloudflare build` — clean
- Deployed: `https://insidejibon.insidejibon.workers.dev` (version 34a58ef3-9c2e-44af-bacc-c36c5de3b880)

## 11. Deployed smoke tests

Anonymous:
- `/`, `/courses` → 200
- published slug → 200; draft slug → 404; archived slug → 404
- `/student`, `/teacher`, `/admin` → 307 → `/sign-in`
- learning route unauthenticated → 307 → `/sign-in`
- "Sign in to enroll" visible; `x-frame-options: DENY`, `x-content-type-options: nosniff`

Authenticated (real Clerk sessions minted via Backend API `POST /sessions` + `/tokens`):
- student: `/student` → 200, `/student/courses` → 200
- enrolled course: learn page → 200; lesson renders; "Continue Learning" + course visible
- `markLessonCompleteAction` invoked directly (Next-Action header): 200,
  `x-action-revalidated: 1`; learn page shows "Completed"/"Undo"; dashboard shows 33%;
  `lesson_progress` row persisted with `completed_at`
- non-enrolled student: `/student` → 200 (empty), learn → 404,
  `markLessonCompleteAction` → `{ success: false, error: "Lesson not accessible." }`,
  no progress row written
- role matrix: student denied `/admin` + `/teacher` (307 → `/`); admin allowed `/admin`,
  denied `/student` + `/teacher`

## 12. Known issues & next steps

- Leftover test courses remain in the DB from `test-public-discovery.ts`
  (`public-discovery-physics`, `teacher-b-public-course`, `secret-draft-course`,
  `old-archived-course`); safe to delete or reuse as fixtures.
- Phase 2 changes are uncommitted on `main` (upstream remote was deleted).
- Clerk smoke-test users/sessions (`student-smoke@insidejibon.dev`,
  `student-smoke2@insidejibon.dev`, session `sess_3IAgtAlwFIBJTWv1CdfBNMIMLq1`) can be
  removed once no longer needed; sessions expire automatically.
- Suggested next phase: exams/assessments, or teacher analytics (enrollment counts,
  completion rates) which now have a data model to build on.