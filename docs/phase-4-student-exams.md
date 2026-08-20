# Phase 4 — Student Exam Attempts, Grading & Results: Implementation Report

## 1. Objective

Ship the student-side examination domain: enrolled students start and submit
exam attempts on published exams, the server grades multiple-choice answers
authoritatively, scores are persisted immutably, attempt limits are enforced,
and results (with per-question review) are rendered from frozen snapshots. This
builds directly on Phase 3A (teacher exam management) without schema rewrites.

## 2. Domain model

```
Course ──has──▶ Exam ──has──▶ ExamAttempt (student, attempt_number)
                               │
                               ├── snapshot (jsonb, captured at start)
                               └──has──▶ ExamAnswer (question_id, selected_option_id)
```

- An **attempt** is created only for an enrolled student against a
  **published** exam, and only when the student has not exhausted
  `max_attempts`.
- At attempt start the exact question/option set **including correct answers**
  is captured into `exam_attempts.content_snapshot` (versioned jsonb).
- Grading and result rendering read **only** the snapshot. Published exams are
  frozen while published (Phase 3A), and even after unpublish → edit →
  republish historical attempts are unaffected. `exam_answers` references
  questions/options by plain UUID **without FKs** (history survives bank
  cleanup), and all correctness data comes from the snapshot.
- `totalMarks` is never stored; it is derived from the snapshot at attempt
  time and persisted with the result (`score`, `total_points`, `percentage`).

| Table | Purpose |
| ----- | ------- |
| `exam_attempts` | one row per attempt: student, exam, attempt_number (1-based), status (`in_progress`/`submitted`), snapshot, score/total_points/percentage, started_at/submitted_at |
| `exam_answers` | one row per answered question: attempt FK (CASCADE), question_id/selected_option_id as plain UUIDs, awarded_points, is_correct |
| `exams.max_attempts` | new nullable column; null = unlimited |

## 3. Schema (modified `src/db/schema/exams.ts`)

- `exam_attempt_status` enum: `in_progress | submitted`.
- `exam_attempts`: `id` (uuid PK), `exam_id` (FK → `exams.id`, CASCADE),
  `student_id` (FK → `users.id`, CASCADE), `attempt_number` (int), `status`,
  `content_snapshot` (jsonb), `score`, `total_points` (int),
  `percentage` (doublePrecision — avoids numeric-as-string), `started_at`,
  `submitted_at`. Unique `(exam_id, student_id, attempt_number)`; indexes on
  `(student_id)`, `(exam_id)`, `(status)`.
- `exam_answers`: `id`, `attempt_id` (FK → `exam_attempts.id`, CASCADE),
  `question_id` (uuid, no FK), `selected_option_id` (uuid, nullable — partial
  submissions), `awarded_points` (int), `is_correct` (bool), timestamps.
  Unique `(attempt_id, question_id)`.
- `exams.max_attempts`: nullable integer, 1–50 (service-validated).

Migrations `0005_powerful_toro.sql` and `0006_wandering_morbius.sql` generated
via `npm run db:generate` and applied via `npm run db:migrate` (verified against
`information_schema` and `pg_indexes`; journal at 6 entries, 0000–0006).

## 4. Concurrency & atomicity (no transactions available)

`drizzle-orm/neon-http` explicitly does **not** support transactions
("No transactions support in neon-http driver"). Race safety is achieved
without transactions:

- **Attempt numbering**: `MAX(attempt_number)+1` computed inline, with a retry
  loop (5 attempts) on the `23505` unique-violation error.
- **Submission**: grading happens in-process, then a single atomic conditional
  UPDATE flips the attempt to `submitted` — `WHERE id AND student_id AND
  status = 'in_progress'` plus a max-attempts guard. `rowCount === 0` → re-read
  to distinguish `ExamAlreadySubmittedError` from `ExamAttemptLimitError`.
  Only the first concurrent submit wins.
- **Answers**: inserted with `onConflictDoNothing` on
  `(attempt_id, question_id)` after the status flip.
- **Limits**: soft-enforced at start, hard-enforced inside the atomic UPDATE —
  a student can never overshoot `max_attempts`, even under double-submit.

## 5. Services (`src/services/exams/`)

- `grading.ts` — pure `gradeAnswers(snapshot, answers)`: validates that every
  supplied `question_id` exists in the snapshot and every `selected_option_id`
  belongs to its question (`ExamInvalidAnswerError`), then awards per-question
  `marks` for exact matches. Unanswered questions score 0.
- `attempts.ts` — student domain:
  - `verifyStudentExamAccess` — enrollment check (shared).
  - `getStudentCourseExams` / `getStudentExamDetail` — list/intro payloads with
    attempt counts, in-progress attempt id, `maxAttempts`; **never include
    options or correct answers**.
  - `startExam` — access + published + limit checks, snapshot capture, atomic
    attempt insert (23505 retry).
  - `getAttemptForTaking` — resume payload (questions + options, no
    correctness); duration/courseId come from the snapshot.
  - `submitExam` — ownership + status checks, `gradeAnswers` from snapshot,
    atomic conditional UPDATE, answer insert, returns result.
  - `getAttemptResult` — result + per-question review from snapshot and
    answers; foreign attempts → null (sanitized 404).
  - Errors: `ExamAccessDeniedError`, `ExamAttemptNotFoundError`,
    `ExamAlreadySubmittedError`, `ExamAttemptLimitError`,
    `ExamInvalidAnswerError`.

## 6. Validation (`src/schemas/exam-attempt.ts`)

- `startExamSchema`: `{ examId: uuid }`.
- `submitExamSchema`: `{ attemptId: uuid, answers: [{ questionId: uuid,
  selectedOptionId: uuid | null }] }` — **`.strict()`**: client-supplied
  `score`/`percentage`/`awardedPoints`/`isCorrect`/`studentId` are rejected,
  not stripped. Answers are validated against the snapshot server-side.

## 7. Actions & routes

- `src/app/student/actions/exam-actions.ts` — `startExamAction` (returns
  `{ attemptId }` for client redirect to `?take=`), `submitExamAction` (returns
  `{ redirect }` to the result page). Both: `requireStudent()` → zod →
  service → `revalidatePath` → `ActionResult<T>`.
- Routes (all under `/student/courses/[courseId]/exams`):
  - `page.tsx` — exam list for the course.
  - `[examId]/page.tsx` — intro (title, description, question count, total
    marks, duration, `attemptsUsed/maxAttempts`, Resume/Start buttons, previous
    attempts with scores); `?take=<attemptId>` renders the taking UI.
  - `[examId]/result/page.tsx` — result card (percentage, score/total, attempt
    number, submitted at) + per-question review (correct/wrong/your
    answer/Not answered, explanations); resolves the latest submitted attempt
    when no `?attempt=` is given; foreign/missing attempts → 404.
- Components: `src/components/student/exams/exam-taker.tsx` (minimal functional
  take UI — final design belongs to Antigravity per the UI contract doc),
  `exam-start-button.tsx`, Exams link in `learning-sidebar.tsx`.

## 8. Security verification

`scripts/test-exam-attempts-domain.ts` (24 scenarios, all passing):
cross-teacher access → "Exam not found."; draft/archived invisible; non-enrolled
blocked; attempt numbering; max-attempts exhaustion; server-graded 5/6 =
83.33%; strict schema rejects client-supplied score; duplicate submit rejected;
immutability (historical result frozen across unpublish/edit/republish while
new attempts see the edit); no pre-submission answer leak (intro + take
payloads); foreign attempt → null; concurrent double-submit → exactly one
winner; malformed IDs rejected. All prior suites (exam, course, learning,
materials, public-discovery) still pass.

## 9. Deployment verification

- `npm run lint` → 0 errors (13 pre-existing warnings only).
- `npx tsc --noEmit` clean; `npm run build` OK; `npx opennextjs-cloudflare
  build` OK.
- Deployed via `npm run deploy` (Version ID
  `951cde84-0df1-42cd-9a73-ac19800b7ca3`).
- Production smoke tests against the live Worker with real Clerk sessions
  (minted via Backend API, verified against the Worker JWKS) — all passing:
  - anonymous → 307 `/sign-in`; garbage `__session` → 307 `/sign-in`
  - student dashboard → 200
  - exams list → 200 with exam title
  - exam intro → 200 with `1/3` attempts and "View result"
  - result page → 200 rendering `66.67%`, `4 out of 6 marks`, per-question
    review with "your answer"/"correct" markers
  - take mode on a submitted attempt → 404
  - non-enrolled student on all three routes → 404
  - teacher role on student routes → 307 `/`
  - all seed data and Clerk users/sessions cleaned up after the test

## 10. Known limitations

- `durationMinutes` is advisory only — no server-enforced timer.
- No teacher attempt-management surface (viewing results by exam) yet.
- No essay/open questions; `question_type` is still `multiple_choice`.
- No `question_banks` table — `questions` remains the reusable bank (Phase 3A).
- Student take UI is minimal; final design handled by Antigravity
  (`docs/phase-4-exams-ui-contract.md`).

## 11. Recommended next phase

- Teacher attempt overview (results per exam, per student) and CSV export.
- Server-enforced exam timer with auto-submit.
- Question randomization / option shuffling per attempt.
- Essay question type with manual grading.
