# Phase 6 — Assignments & Submissions (Backend/Domain)

Teacher-authored assignments with student file submissions, deadline policy
and grading. This phase delivers the **authoritative backend/domain layer** —
the same architecture as Phases 3A/4 (exams): services own all invariants,
UI is a thin client over server actions.

## Data model (`src/db/schema/assignments.ts`, migration `0007_volatile_jackpot.sql`)

- **`assignments`** — course-owned (FK cascade), optional lesson link (FK set
  null). Lifecycle mirrors courses/exams: `draft → published → closed`.
  Config: `dueAt` (nullable), `maxPoints` (default 100), `allowLateSubmission`
  (default false), `allowedFileTypes` (mime list, default `[]`), `maxFileSize`
  (default 25 MB). Ownership is NEVER stored on the row — it is derived
  through `assignment → course → course.teacherId`.
- **`assignment_submissions`** — one logical row per
  `(assignment_id, student_id)` enforced by a UNIQUE index. Status flow:
  `not_submitted → draft → submitted → graded`. Server stamps `submittedAt`
  and `isLate` (server time only). Grading fields: `points`, `feedback`,
  `gradedAt`, `gradedBy`.
- **`assignment_submission_files`** — R2-backed files; `storage_key` is unique
  and server-derived, never client-controlled.

## Services (`src/services/assignments/`)

| File | Responsibility |
| ---- | -------------- |
| `access.ts` | Authorization chains returning null (Not Found semantics): teacher ownership, student enrollment+visibility, submission ownership. Domain error classes. Deadline helpers (`isAssignmentOpen`, `isLateSubmission`, `canResubmit`). |
| `assignments.ts` | Teacher CRUD + lifecycle: create/update (draft-only structural edits), publish (authoritative precondition re-validation), unpublish/close/reopen, delete (draft/closed only; published blocked; best-effort R2 cleanup). |
| `submissions.ts` | Student flows: start/resume draft, submit (atomic conditional UPDATE), upload/delete files (validated per-assignment constraints), role-aware download resolver. |
| `grading.ts` | Teacher grading: submissions list w/ student identity, detail view with files, grade/re-grade (points bounded by the assignment's own `max_points`), statistics. |

### Key invariants

1. **Ownership is resolved in the database** at every entry point; foreign
   access behaves exactly like Not Found (no existence leak).
2. **Draft-only structural editing** — published/closed assignments are frozen.
   Unpublish to edit. Published cannot be deleted (unpublish/close first).
3. **Publishing preconditions are re-verified authoritatively** in
   `validateAssignmentForPublishing`/`publishAssignment`, independent of the form.
4. **Closed ≠ invisible**: closed assignments remain visible to enrolled
   students (grades must stay readable) but reject ALL new submission activity.
5. **Server time is the only clock** for deadlines/lateness.
6. **No transactions available** (`drizzle-orm/neon-http`): creation races are
   absorbed via `INSERT … ON CONFLICT DO NOTHING` + re-select against the
   UNIQUE constraint; status transitions are atomic conditional UPDATEs keyed
   on allowed source statuses; file uploads insert the DB row first and roll
   it back when the R2 write fails.
7. **Upload validation is per-assignment**: extension↔MIME consistency, mime ∈
   assignment's `allowedFileTypes`, size ≤ assignment's `maxFileSize`,
   filename sanitization (path separators/control chars rejected). Storage keys:
   `courses/{courseId}/assignments/{assignmentId}/submissions/{submissionId}/files/{fileId}/{safe-name}`.

## Actions

- Teacher: `src/app/teacher/assignments/actions/assignment-actions.ts`
  (`createAssignmentAction`, `updateAssignmentAction`, `publish/unpublish/
  close/reopenAssignmentAction`, `deleteAssignmentAction`,
  `gradeSubmissionAction`). All `requireTeacher()` first, zod-parse payloads,
  return `ActionResult<T>` with localized errors.
- Student: `src/app/student/actions/assignment-actions.ts`
  (`startSubmissionAction`, `submitAssignmentAction`,
  `uploadSubmissionFileAction(FormData)`, `deleteSubmissionFileAction`).
  All `requireStudent()` first; student ID always from the verified session.

## Route handler

`GET /api/assignments/submissions/[submissionId]/files/[fileId]/download` —
authenticated streaming download through the role-aware resolver
(student = own submission, teacher = owning assignment). Sanitized 404 for
missing/unauthorized; size mismatch between metadata and object refuses to
stream; `X-Content-Type-Options: nosniff`; RFC 5987 filename encoding.

## i18n

New catalog entries under `errors.assignment*` / `errors.submission*` /
`errors.lateSubmissionsNotAllowed` / `errors.invalidPointsRange` etc. in
`src/i18n/errors.ts` + en/bn dictionaries (`npm run check:i18n` green).

## Tests

`scripts/test-assignments-domain.ts` (run like the other suites):
`env NODE_OPTIONS="--require=./scripts/node-net-fix.cjs --conditions=react-server" npx tsx scripts/test-assignments-domain.ts`

Covers: cross-teacher isolation, publish preconditions, draft-freeze,
lifecycle visibility, submission lifecycle + resubmission window, upload
validation matrix (mime mismatch/oversize/traversal/failing-storage rollback),
server-time lateness (reject/allow/isLate stamp), close/reopen gating,
grading bounds/finality/stamps, download resolver authorization matrix,
statistics, cascade deletes with storage cleanup. All green alongside every
pre-existing suite.

## UI

Deliberately not implemented here (matches Phase 3A split) — see
`phase-6-assignments-ui-contract.md`.
