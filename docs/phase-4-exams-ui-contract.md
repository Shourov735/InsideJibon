# Phase 4 — Exams & Assessment: UI Contract (for Antigravity)

Student-facing exam attempt flows. The backend/domain is complete and
authoritative; this document defines the UI surface it expects. Visual
direction: Academic Modernism + existing `.stitch` exam designs.

## Routes

| Route | Page responsibility |
| ----- | ------------------- |
| `/student/courses/[courseId]/exams` | List of published exams for an enrolled course, with per-exam student stats. 404 when not enrolled / course not published. |
| `/student/courses/[courseId]/exams/[examId]` | Exam intro (metadata, stats, attempts history) + Start/Resume CTAs. With `?take=<attemptId>` renders the taking screen (server-fetched payload). |
| `/student/courses/[courseId]/exams/[examId]/result?attempt=<attemptId>` | Full result review (score + per-question breakdown with correct answers and explanations). Without `attempt` param it resolves the latest submitted attempt. |

Breadcrumb pattern (already used on student pages): Dashboard → My Courses →
course title → Exams.

## Server actions (client-callable)

Import from `@/app/student/actions` (`exam-actions.ts`). Both return
`ActionResult<T>` (`{ success: true, data } | { success: false, error }`).

### `startExamAction(formData: { examId: string })` → `ActionResult<StartedAttempt>`

Creates the attempt server-side (snapshot + attempt numbering + limit check).

```ts
interface StartedAttempt {
  attemptId: string;
  attemptNumber: number;
  startedAt: string;            // ISO
  durationMinutes: number | null;
  courseId: string;
  totalMarks: number;
  questions: ExamTakingQuestion[]; // NO correct answers, NO explanations
}
interface ExamTakingQuestion {
  id: string;
  questionType: "multiple_choice";
  questionText: string;
  marks: number;
  position: number;
  options: { id: string; optionText: string; position: number }[];
}
```

Errors: `"Exam not accessible."` (draft/archived/not enrolled/not published),
`"Attempt limit reached for this exam."`

### `submitExamAction(formData: { attemptId: string; answers: { questionId: string; selectedOptionId: string }[] })` → `ActionResult<SubmittedExamResult>`

**Never send score, percentage, awardedPoints, isCorrect or studentId** — the
strict schema rejects them. Grading is 100% server-side.

```ts
interface SubmittedExamResult {
  attemptId: string;
  attemptNumber: number;
  examId: string;
  courseId: string;
  score: number;          // awarded points
  totalPoints: number;    // sum of question marks
  percentage: number;     // rounded to 2 decimals
  submittedAt: string;    // ISO
  answers: { questionId: string; selectedOptionId: string | null; isCorrect: boolean; awardedPoints: number }[];
}
```

Errors: `"This attempt has already been submitted."`,
`"Attempt not found."`, `"Your submission contains an invalid answer."`,
`"Attempt limit reached for this exam."`

## Page data (server components)

All student exam reads require the authenticated student (use `requireStudent()`),
are scoped server-side and return `null` → render `notFound()`.

### Exams list — `getStudentCourseExams(studentId, courseId)`

```ts
interface StudentCourseExam {
  id: string; title: string; description: string | null;
  durationMinutes: number | null; maxAttempts: number | null;
  status: "published"; publishedAt: string | null;
  questionCount: number; totalMarks: number;
  attemptsUsed: number; bestPercentage: number | null;
  inProgressAttemptId: string | null;
}
```

### Exam intro — `getStudentExamDetail(studentId, examId)`

```ts
interface StudentExamDetail {
  id: string; title: string; description: string | null;
  durationMinutes: number | null; maxAttempts: number | null;
  status: "published"; questionCount: number; totalMarks: number;
  attemptsUsed: number;                        // submitted attempts only
  attempts: { id: string; attemptNumber: number;
              status: "in_progress" | "submitted";
              startedAt: string; submittedAt: string | null;
              score: number | null; totalPoints: number | null; percentage: number | null }[];
  inProgressAttemptId: string | null;
}
```

### Take screen — `getAttemptForTaking(studentId, attemptId)` (resume)

Same shape as `StartedAttempt` (never includes correct answers or
explanations). URL: `?take=<attemptId>`.

### Result — `getAttemptResult(studentId, attemptId)`

```ts
interface AttemptResult {
  attemptId: string; attemptNumber: number; examId: string;
  examTitle: string; courseId: string;
  score: number; totalPoints: number; percentage: number;
  startedAt: string; submittedAt: string;
  questions: {
    questionId: string; questionText: string; explanation: string | null;
    marks: number; position: number;
    options: { id: string; optionText: string; isCorrect: boolean; position: number }[];
    selectedOptionId: string | null;   // null = unanswered (0 marks)
    correctOptionId: string | null;
    awardedPoints: number; isCorrect: boolean;
  }[];
}
```

## Loading / error / empty states

- **Exams list:** empty state "No exams available yet." (server-rendered when
  `examsList.length === 0`).
- **Start button:** busy label "Starting…", disabled while pending; error text
  below the button on failure. On success navigate to `?take=<attemptId>`
  (`router.replace` + `router.refresh`).
- **Take screen:** "N of M answered" summary; submit button busy label
  "Submitting…", disabled while pending; error text on failure. On success
  navigate to the result URL (`?attempt=<attemptId>`). Unanswered questions
  are allowed and score 0 — surface that ("Unanswered questions score 0.
  Submission is final.").
- **Result:** 404 via `notFound()` for foreign/missing/unsubmitted attempts.
- **Attempt limit reached:** intro shows a message ("You have used all your
  attempts for this exam.") instead of the Start button.

## Permission behavior (already enforced server-side — UI must not leak, but also must not rely on hiding)

- Students see only `published` exams of `published` courses they are enrolled in.
- Draft/archived exams and unenrolled students: 404 (not "forbidden").
- No correct answers or explanations may be rendered before submission —
  the server payloads never contain them; do not compute them client-side.
- After submission the result page MAY show correct answers, explanations
  and the full option set — from the server payload (historically snapshotted).

## Exam lifecycle (teacher side — read-only for students)

`draft → published → archived` (draft → published via `publishExamAction`,
published → draft via `unpublishExamAction`, published/archived ↔ via
`archiveExamAction`/`restoreExamAction`). Students only ever interact with
`published` exams. Published exams are structurally frozen for teachers
(questions/options/reorder blocked until unpublish). Exam metadata (title,
description, duration, maxAttempts) is editable while published.

## Teacher workflows (backend already shipped in Phase 3A)

`/teacher/exams` → list; `/teacher/exams/new` → create (course picker, title,
description, duration, maxAttempts); `/teacher/exams/[examId]` → detail +
lifecycle; `/teacher/exams/[examId]/builder` → question/option builder +
reorder; `/teacher/exams/[examId]/edit` → metadata. Publishing requires ≥1
question, valid options, exactly one correct answer per MCQ, title ≥ 3 chars,
description ≥ 10 chars. No student attempt management UI exists yet for
teachers (future phase).

## Student workflows (this phase)

1. Enrolled student opens course → Exams entry (sidebar link on the learn page).
2. Exam intro → "Start Exam" (or "Resume Attempt" / "Start New Attempt").
3. Take screen: answer MCQs (one option per question), submit.
4. Result page: percentage, score/total, per-question review with correct
   answer + explanation, previous attempts list on the intro page.

## Important constraints for UI work

- Keep the take flow on the exact routes above (deep-linkable, refresh-safe:
  `?take=<attemptId>` resumes the attempt).
- Do not add client-side grading or scoring logic of any kind.
- Do not add fields to the action payloads (strict schemas reject them).
- Do not render anything from `contentSnapshot`-like data pre-submission —
  there is no such field in any pre-submission payload by design.
- Duration is a hint: `durationMinutes` is displayed but not server-enforced
  this phase (countdown UI is optional; do not block submission).
- Bangla + English UI, Academic Modernism, `.stitch/designs/online_examination_interface_*` as visual reference.