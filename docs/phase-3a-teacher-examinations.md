# Phase 3A — Teacher Examination & Assessment Management: Implementation Report

## 1. Objective

Ship the teacher-side examination domain: teachers create, configure, organize,
publish and manage examinations attached to courses they own. This phase covers
only the **teacher-side** management surface — no student exam attempts,
grading, timers or result pages (those belong to the next examination phase).
The schema is designed so the student phase can be added without a rewrite.

## 2. Domain model

```
Teacher → Course → Exam → ExamQuestion → Question → QuestionOption
```

An **exam** belongs to one course. A **question** is a reusable bank row with
**no** `examId` — an exam references questions through `exam_questions`, which
carries the per-exam `position` and `marks`. Answer **options** hang off the
question row. The split deliberately supports a future question bank where a
question can be linked to several exams with different marks.

| Table | Purpose |
| ----- | ------- |
| `exams` | course association, title, description, optional duration, lifecycle status |
| `questions` | reusable question text, type (`multiple_choice`), optional explanation |
| `question_options` | answer options of a question (`option_text`, `is_correct`, `position`) |
| `exam_questions` | exam ↔ question link with per-exam `position` and `marks` |

`totalMarks` is **not stored** — it is the sum of the linked `exam_questions`
rows and is derived (`ExamWithQuestions.totalMarks`). `durationMinutes` is a
nullable basic setting (unused until the student attempt phase). Passing marks,
grading rules and randomization are intentionally absent.

## 3. Schema (new file `src/db/schema/exams.ts`)

- `exam_status` enum: `draft | published | archived`
- `question_type` enum: `multiple_choice` (extensible for later phases)
- `exams`: `id` (uuid PK), `course_id` (FK → `courses.id`, ON DELETE CASCADE),
  `title`, `description`, `duration_minutes`, `status` (default `draft`),
  `published_at`, `created_at`, `updated_at`. Indexes on `(course_id)` and
  `(course_id, status)`.
- `questions`: `id`, `question_type` (default `multiple_choice`), `question_text`,
  `explanation`, timestamps. Index on `(question_type)`.
- `question_options`: `id`, `question_id` (FK → `questions.id`, CASCADE),
  `option_text`, `is_correct` (default false), `position` (default 1),
  timestamps. Indexes on `(question_id)` and `(question_id, position)`.
- `exam_questions`: `id`, `exam_id` (FK → `exams.id`, CASCADE), `question_id`
  (FK → `questions.id`, CASCADE), `position`, `marks` (default 1), timestamps.
  Unique `(exam_id, question_id)`, indexes on `(exam_id, position)` and
  `(question_id)`.

Migration `0004_serious_leper_queen.sql` generated via `npm run db:generate`
and applied via `npm run db:migrate` (verified against `information_schema`;
journal is now at 5 entries, 0000–0004).

Deletion semantics: deleting a course cascades its exams; deleting an exam
cascades its `exam_questions` links (questions themselves are only removed by
explicit question deletion — preserving the future bank model). Deleting a
question cascades its options and links. Positions are re-compacted to 1..N by
the service layer after deletes/reorders (no fragile DB constraints).

## 4. Lifecycle

Mirrors the course lifecycle (`course_status`):

```
draft ──publish──▶ published ──archive──▶ archived
  ▲                 │                        │
  └────unpublish────┘                        │
  ◀────────────────────restore──────────────┘
```

- **Draft** — fully editable (metadata, questions, options, reordering).
- **Published** — structurally frozen: question/option mutations and
  reordering are rejected (`ExamNotEditableError`). Metadata (title,
  description, duration) remains editable. Permanent deletion is blocked
  (`ExamCannotDeleteError`). Unpublishing returns it to draft.
- **Archived** — hidden from active queries; only restore (→ draft) or delete.

## 5. Authorization (server-enforced, no exceptions)

Every mutation entry point resolves ownership in the database — never from
client-supplied IDs:

- exam → course → `course.teacher_id`
- question → `exam_questions` → exam → course → `teacher_id`
- option → question → `exam_questions` → exam → course → `teacher_id`

All resolution helpers live in `src/services/exams/ownership.ts` and return
`null` for both "missing" and "not yours" so cross-teacher access behaves
exactly like Not Found (identical `"Exam not found."` error, no existence
probing). `isUuid()` guards reject malformed IDs up front so services throw
clean domain errors instead of Postgres errors.

## 6. Service layer (`src/services/exams/`)

- `ownership.ts` — `verifyExamOwnership`, `verifyCourseOwnership`,
  `verifyQuestionInExam`, `verifyQuestionForTeacher`, `verifyOptionForTeacher`,
  `assertDraftExam`, `touchExam`, and the domain error classes.
- `exams.ts` — `createExam`, `getTeacherExams`, `getTeacherExamById`,
  `getTeacherExamWithQuestions`, `updateExam`, `validateExamForPublishing`,
  `publishExam`, `unpublishExam`, `archiveExam`, `restoreExam`, `deleteExam`.
  `updateExam` rejects course reassignment with the same generic error.
- `questions.ts` — `createQuestion`, `updateQuestion`, `deleteQuestion`,
  `reorderQuestions`.
- `options.ts` — `createOption`, `updateOption`, `deleteOption`. Marking an
  option correct automatically unmarks its siblings (radio behavior); the
  exactly-one invariant is re-enforced at publish.
- `index.ts` — barrel export.

## 7. Publishing validation (authoritative, service layer)

`validateExamForPublishing` is the single source of truth — the UI renders its
result and `publishExam` re-enforces it. Checks:

- title ≥ 3 chars; description ≥ 10 chars
- at least one question
- every question has valid text (≥ 2 chars) and marks ≥ 1
- every multiple-choice question has ≥ 2 options
- every multiple-choice question has **exactly one** correct option (zero or
  multiple both block with a per-question message)
- no option has empty text

Errors are returned per question with positions (e.g. `Question 2 must have
exactly one correct answer option (currently 2 are marked correct).`). Course
ownership is verified implicitly by the owner-scoped read (returns the generic
error otherwise).

## 8. Zod validation (`src/schemas/exam.ts`)

`createExamSchema`, `updateExamSchema`, `examActionByIdSchema`,
`createQuestionSchema`, `updateQuestionSchema`, `questionActionByIdSchema`,
`reorderQuestionsSchema`, `createOptionSchema`, `updateOptionSchema`,
`optionActionByIdSchema`. Teacher identity is never part of a payload. Marks
and duration are coerced to integers with sane bounds. Server-side parsing is
authoritative; client checks are cosmetic.

## 9. Server actions (`src/app/teacher/exams/actions/`)

All thin: `requireTeacher()` → zod → service → `revalidatePath` →
`ActionResult<T>`.

- `exam-actions.ts` — `createExamAction`, `updateExamAction`,
  `publishExamAction`, `unpublishExamAction`, `archiveExamAction`,
  `restoreExamAction`, `deleteExamAction`
- `question-actions.ts` — `createQuestionAction`, `updateQuestionAction`,
  `deleteQuestionAction`, `reorderQuestionsAction`
- `option-actions.ts` — `createOptionAction`, `updateOptionAction`,
  `deleteOptionAction` (revalidate with an optional `examId` argument, matching
  the existing module/lesson action pattern)
- `index.ts` — barrel export

Every action returns sanitized errors only (e.g. `"Exam not found."`,
`"Exams can only be edited while in draft status..."`). No SQL, stack traces,
internal IDs or env values ever reach the client.

## 10. Routes

```
/teacher/exams                       list + status summary
/teacher/exams/new                   create (course picker)
/teacher/exams/[examId]              detail + teacher-side preview + lifecycle
/teacher/exams/[examId]/edit         metadata form
/teacher/exams/[examId]/builder      question/option builder + reorder
```

Minimal placeholder pages/components (`src/components/teacher/exams/`) verify
the contracts end-to-end: `exam-form.tsx`, `exam-lifecycle-actions.tsx`,
`question-builder.tsx`. These are deliberately light — **Antigravity owns the
final UI** (Academic Modernism, `.stitch/designs/online_examination_interface_*`
as visual reference). A single "Exams" entry was added to
`src/components/teacher/teacher-nav.tsx` (`activeSection="exams"`).

## 11. Tests (`scripts/test-exam-domain.ts`)

Run with
`env NODE_OPTIONS=--conditions=react-server npx tsx scripts/test-exam-domain.ts`.
Coverage (all passing):

1. Teacher creates an exam (draft, duration persisted)
2. Teacher cannot create an exam for a course they do not own
3. Teacher B cannot update / publish / archive / delete Teacher A's exam
4. Teacher B cannot add questions to Teacher A's exam
5. Teacher A builds questions + options; marking a new correct option replaces
   the old one
6. Teacher B cannot update/delete Teacher A's questions or options
7. Invalid question/option/exam data rejected at the schema layer
8. Option-less question blocks publishing (with the right message)
9. Zero correct answers blocks publishing
10. Multiple correct answers blocks publishing (message reports the count)
11. A structurally valid exam publishes (status + published_at set)
12. Draft exams excluded from published-only queries
13. Archived exams excluded from active queries (still visible to their owner)
14. Reordering produces compact 1..N positions and the requested order; foreign
    question IDs in a reorder are rejected
15. Student-role identities cannot drive teacher mutations
16. Malformed IDs rejected safely at schema and service layers (no Postgres
    errors)
17. Cross-resource IDOR attempts all fail with identical generic
    `"Exam not found."` messages (no existence leak)
18. Published lifecycle enforced: question/option/reorder/delete blocked while
    published; metadata editing still allowed

Existing suites (`test-course-domain.ts`, `test-learning-domain.ts`,
`test-materials-domain.ts`, `test-public-discovery.ts`) still pass.

## 12. Build & deploy verification

- `npm run lint` — 0 errors (13 warnings, all pre-existing `next/image` on
  public/student components)
- `npx tsc --noEmit` — clean
- `npm run build` — clean
- `npx opennextjs-cloudflare build` — clean
- Deployed: `https://insidejibon.insidejibon.workers.dev` (version
  `9356522f-8fe4-43f0-aca5-f36c2ccf5b84`)

## 13. Deployed smoke tests

Anonymous:
- `/teacher/exams`, `/teacher/exams/new`, exam builder → `307` → `/sign-in`
- Garbage `__session` → `307` → `/sign-in`
- `/` → `200` with `x-frame-options: DENY`, `x-content-type-options: nosniff`,
  `referrer-policy`, `permissions-policy`; no `x-powered-by`

Authenticated (real Clerk session minted via Backend API for
`teacher-smoke@insidejibon.dev`, `__session=<jwt>`):
- `/teacher/exams` → `200` (seeded exam rendered)
- `/teacher/exams/[id]` → `200` (detail + preview + lifecycle controls)
- `/teacher/exams/[id]/builder` → `200` (questions, options, mark-correct)
- `/teacher/exams/new`, `/teacher/exams/[id]/edit` → `200`
- Non-existent exam id → `404`; malformed id → `404`
- Student session → `/teacher/exams` → `307` → `/` (role denied)

Smoke data and sessions were cleaned up after verification.

## 14. Known limitations

- Questions are text-only; no media references yet (R2 untouched this phase).
- Option mutations resolve ownership through *any* exam link ending at the
  teacher; this is unambiguous in Phase 3A because each question lives in one
  exam, but a future question bank will need to scope option edits by exam.
- `durationMinutes` is stored but unused until the student phase.
- No `totalMarks` column — derived; no `passingMarks` yet.
- Editing a question replaces its options' state only via the builder; the
  exactly-one-correct write invariant applies to `isCorrect=true` writes.

## 15. Recommended next phase

Student exam attempts: attempt/session tables, timer, auto-grading for
multiple-choice, results, and the student-facing published-exam queries (which
must only ever surface `status = 'published'` exams of published courses).
Optionally teacher analytics. The schema already supports attempts without a
rewrite.