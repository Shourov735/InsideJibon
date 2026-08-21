# Phase 6 — Assignments & Submissions: UI Contract (for Antigravity)

Teacher assignment management + student submission flows. Backend/domain is
complete and authoritative (see `phase-6-assignments.md`). Visual direction:
Academic Modernism + existing `.stitch` designs; Bangla + English via the
existing i18n dictionaries.

## Routes

| Route | Page responsibility |
| ----- | ------------------- |
| `/teacher/courses/[courseId]/assignments` | List of the course's assignments with status badges (draft/published/closed), submission counts, due dates, lifecycle actions. |
| `/teacher/assignments/[assignmentId]` | Assignment detail: metadata edit form (draft only), publish-precondition checklist, submissions table (student name/email, status, submitted-at, late flag, points, file count) → grading drawer/page per submission, statistics cards (enrolled / submitted / graded / late / avg). |
| `/student/courses/[courseId]/assignments` | Assignment list for an enrolled course with per-item state (not started / draft / submitted / graded, due countdown, late flag). 404 when not enrolled. |
| `/student/courses/[courseId]/assignments/[assignmentId]` | Submission workspace: instructions, constraints (allowed types, max size, max points, due), file list with upload/delete, submit/resubmit CTA, grade+feedback view when graded. |

## Server actions — teacher (`@/app/teacher/assignments/actions`)

All return `ActionResult<T>`; errors arrive **already localized**.

```ts
createAssignmentAction(input: {
  courseId; lessonId?; title(3..120); instructions(10..10000);
  dueAt?: ISO-string | "" ; maxPoints?(1..1000); allowLateSubmission?;
  allowedFileTypes?: string[] /* mime values from ASSIGNMENT_FILE_TYPES */;
  maxFileSize?(bytes ≤ 50MB);
}) → ActionResult<Assignment>
```
`updateAssignmentAction` — same shape plus `assignmentId`; **only drafts**;
`courseId` must equal the existing binding (else Not Found).
`publishAssignmentAction/unpublishAssignmentAction/closeAssignmentAction/
reopenAssignmentAction/deleteAssignmentAction({ assignmentId })`.
`gradeSubmissionAction({ submissionId; points; feedback? ≤5000 })` — points are
re-bounded server-side by the assignment's `maxPoints`
(`"Points are outside the allowed range for this assignment."`).

Publish precondition failures return a combined message listing every violated
rule (past due date etc.) — render it as a checklist, don't parse it.

## Server actions — student (`@/app/student/actions`)

```ts
startSubmissionAction({ assignmentId }) → { submissionId }   // idempotent draft
submitAssignmentAction({ assignmentId })                     // atomic submit
uploadSubmissionFileAction(FormData: file + assignmentId) → { fileId }
deleteSubmissionFileAction({ fileId })
```

Error strings to surface verbatim: `"This assignment is closed and no longer
accepts submissions."`, `"Late submissions are not allowed for this
assignment."`, `"This submission has already been graded."`,
`"This file exceeds the maximum size allowed for this assignment."`,
`"This file type is not allowed for this assignment."`,
`"Upload failed. Please try again."`

## Reads (server components)

- Teacher list/detail pages call `getTeacherAssignments(teacherId, courseId?)`,
  `getTeacherAssignmentById`, `validateAssignmentForPublishing` (render the
  checklist BEFORE publishing), `getSubmissionsForAssignment`,
  `getSubmissionDetailForTeacher`, `getAssignmentStatistics`.
- Student pages call `getStudentCourseAssignmentsWithStatus(studentId,
  courseId)` → `{ assignment, submission|null, canSubmit, canResubmit }[]`
  and `getSubmissionFilesForStudent(studentId, submissionId)`; grading views
  come from the same `submission` row (`points`, `feedback`, `gradedAt`).
  Closed assignments ARE included — show them read-only with grades visible.
- Downloads link straight to
  `/api/assignments/submissions/{submissionId}/files/{fileId}/download`
  (works for owner student and owning teacher; everyone else gets 404).
  Never construct R2 URLs client-side; `storageKey` must never reach the client
  (summary types already omit it).

## State rules for the UI

- Structural form fields disabled unless `status === "draft"`.
- Submit button enabled iff `canSubmit`; label switches to "Resubmit" when
  `canResubmit`; after grading everything is read-only.
- Show a late badge whenever `submission.isLate`.
- File inputs should advertise the assignment's `maxFileSize` and extension
  list derived from `ASSIGNMENT_FILE_TYPES` keys (pdf/png/jpg/webp/doc/docx/
  ppt/pptx/xls/xlsx/zip/txt).
