# InsideJibon — Master Implementation Roadmap & Architecture

> **Platform:** InsideJibon — Free Educational Platform for Tanvir Hasan Jibon  
> **Tech Stack:** Next.js 16.3.1 (App Router), React 19, Tailwind CSS v4, Neon PostgreSQL + Drizzle ORM (HTTP driver), Clerk Auth, Cloudflare R2, Cloudflare Workers (OpenNext).

---

## 1. Project Overview & Architectural Conventions

InsideJibon is a completely free personal educational platform. Key conventions (enforced via `AGENTS.md`):

1. **Authentication:** Manual server-side JWT verification against Clerk JWKS via `src/lib/auth.ts` (`resolveCurrentUser()` / `getCurrentUser()`). Never introduce `clerkMiddleware()` (incompatible with Cloudflare Workers runtime).
2. **Authorization Boundary:** Enforced at every Server Action and Route Handler using `requireUser()` / `requireRole()` (`src/lib/permissions.ts`) and verified in SQL via ownership chains (`resource → course → course.teacherId`).
3. **Database & Concurrency:** Neon PostgreSQL using `drizzle-orm/neon-http`. No transaction support on the HTTP driver — race safety relies on atomic conditional `UPDATE` statements, unique constraints, and PostgreSQL error `23505` retry loops.
4. **Storage:** Cloudflare R2 (`MATERIALS_BUCKET` binding) abstracted through `src/lib/storage/` interface.
5. **UI & Design:** Academic Modernism (generous whitespace, clean typography, neutral surface tokens). No external UI component libraries (no Radix UI, no shadcn/ui). Custom Tailwind CSS only.
6. **Internationalization:** Full English (`en`) and Bangla (`bn`) parity across 1,320+ keys. Verified with `npm run check:i18n`.
7. **Deployments:** Push to `main` auto-triggers Cloudflare Workers Builds Git integration.

---

## 2. Phase Status & Progress Summary

| Phase | Domain | Status | Deliverables & Notes |
|---|---|---|---|
| **Phase 0** | Foundation & Runtime | ✅ **Completed** | Next.js 16 on Workers via OpenNext, Tailwind v4 theme, Drizzle + Neon connection |
| **Phase 1** | Auth & Identity | ✅ **Completed** | Clerk webhook user sync (`/api/webhooks/clerk`), first-user admin bootstrap, role guards |
| **Phase 2** | Courses & Learning | ✅ **Completed** | Course CRUD, module/lesson nesting, slug routing, student enrollment, lesson progress |
| **Phase 3** | Materials & Exam Domain | ✅ **Completed** | R2 streaming downloads (`/api/materials/...`), Question Bank, MCQ builder, publish validation |
| **Phase 4** | Student Exams & Grading | ✅ **Completed** | Content snapshot immutability, countdown timer, auto-grading, results breakdown |
| **Phase 4.5** | Assignments System | ✅ **Completed** | File submissions, deadlines, late policy, teacher grading drawer, R2 file streaming |
| **Phase 5** | Classes, Announcements & Admin | ✅ **Completed** | Live/recorded class sessions, course announcements, admin user directory & role switcher, loading UI |
| **Phase 6** | Search, Categories & True/False | ✅ **Completed** | Public/teacher search & filter, course subject categories, true/false question format |
| **Phase 7** | Notifications & Analytics | 📋 **Queued** | In-app notification bell & unread counts, teacher per-course progress & grade analytics |
| **Phase 8** | Profile, Export & Discussion | 📋 **Queued** | User profile view, CSV export of grades/rosters, optional lesson-level discussion |
| **Phase 9** | Production Hardening & PWA | 📋 **Queued** | PWA manifest, accessibility audit (ARIA/keyboard), rate limiting, performance audit |

---

## 3. Database Schema Map (18 Tables)

```
users (id: text PK [Clerk ID], email, name, role, imageUrl)
  │
  ├── courses (id: uuid, teacher_id -> users, title, slug, status, category, ...)
  │     ├── course_modules (id, course_id -> courses, title, position, ...)
  │     │     └── lessons (id, module_id -> course_modules, title, video_url, is_free, ...)
  │     │           └── materials (id, lesson_id -> lessons, storage_key, mime_type, ...)
  │     │
  │     ├── enrollments (id, student_id -> users, course_id -> courses, completed_at)
  │     │     └── lesson_progress (student_id -> users, lesson_id -> lessons, completed)
  │     │
  │     ├── class_sessions (id, course_id -> courses, session_type, external_url, scheduled_at, status)
  │     ├── announcements (id, course_id -> courses, title, content, is_pinned, published_at)
  │     │
  │     ├── exams (id, course_id -> courses, title, duration_minutes, max_attempts, status)
  │     │     ├── exam_questions (exam_id, question_id -> questions, position, marks)
  │     │     └── exam_attempts (id, exam_id, student_id -> users, content_snapshot, score, status)
  │     │           └── exam_answers (attempt_id, question_id, selected_option_id)
  │     │
  │     └── assignments (id, course_id -> courses, title, due_at, max_points, status)
  │           └── assignment_submissions (id, assignment_id, student_id -> users, status, points)
  │                 └── assignment_submission_files (id, submission_id, storage_key, mime_type)
  │
  └── questions (id, teacher_id, text, explanation, question_type)
        └── question_options (id, question_id -> questions, text, is_correct, position)
```

---

## 4. How to Execute Future Phases in a New Session

When starting a new session with any AI agent:
1. Provide the respective **Phase Prompt** below.
2. Instruct the agent to read `AGENTS.md` and `docs/MASTER_ROADMAP.md` before writing code.
3. Every phase must pass `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
4. Changes must be committed and pushed to `main` (`git push`).

---

## 5. Copy-Paste Prompts for Remaining Phases

### Phase 6 Prompt: Search, Categories & True/False Questions

```markdown
# Phase 6 Implementation Prompt — Search, Categories & True/False Questions

Read `AGENTS.md` and `docs/MASTER_ROADMAP.md` first. All earlier phases (0 through 5) are implemented and running.

## Objectives
1. **Search & Filter across Directories**:
   - Public Course Catalog (`/courses`): Search by title/description, filter by category.
   - Teacher Courses (`/teacher/courses`): Search by title, filter by status (`draft`, `published`, `archived`), filter by category.
   - Teacher Exams (`/teacher/exams`): Search by title, filter by status, filter by course.
   - Teacher Assignments (`/teacher/assignments`): Search by title, filter by status, filter by course.
   - Student Courses (`/student/courses`): Search enrolled courses.
   - Implementation: URL search params (`?q=...&category=...&status=...`), debounced input, and PostgreSQL `ILIKE` queries in existing service files.

2. **Course Subject Categories**:
   - Add `category` text column to `courses` table (`physics`, `chemistry`, `biology`, `mathematics`, `english`, `bangla`, `general_science`, `ict`, `other`).
   - Add category selector in course forms (`course-form.tsx`).
   - Add category badges on course cards in catalog, dashboard, and management lists.
   - Add category filter tabs in public course catalog.

3. **True/False Question Type**:
   - Add `'true_false'` value to `question_type` enum.
   - In Question Builder UI: Selecting True/False automatically sets up exactly 2 options ("True" and "False" in EN/BN).
   - In Student Exam Taker: Display clean True/False radio toggle instead of custom MCQ options.
   - Auto-grading and snapshot logic work seamlessly with the snapshot architecture.

## Verification Checklist
- Run `npm run db:generate` to generate migration.
- Add all new strings to `src/i18n/dictionaries/en.ts` and `bn.ts`.
- Verify with `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Commit and push to `main`.
```

---

### Phase 7 Prompt: Notifications & Analytics

```markdown
# Phase 7 Implementation Prompt — In-App Notifications & Teacher Analytics

Read `AGENTS.md` and `docs/MASTER_ROADMAP.md` first.

## Objectives
1. **In-App Notification System**:
   - Create `notifications` table (`id`, `user_id`, `type`, `title`, `body`, `link`, `is_read`, `created_at`).
   - Server-side trigger hooks:
     - Teacher posts announcement -> notifications created for enrolled students.
     - Teacher publishes exam -> notifications created for enrolled students.
     - Teacher publishes assignment -> notifications created for enrolled students.
     - Teacher grades submission -> notification created for that student.
     - Class session scheduled -> notification created for enrolled students.
   - UI: Notification bell in Student Navigation with unread count badge, notification dropdown, and dedicated notifications page (`/student/notifications`).
   - Actions: Mark single notification read, mark all read.

2. **Teacher Course Analytics**:
   - New route: `/teacher/courses/[courseId]/analytics`.
   - Metrics derived authoritatively from existing DB data:
     - Enrollment statistics and completion percentage.
     - Exam performance: average score, pass rate, attempt distribution.
     - Assignment submissions: on-time vs. late vs. missing ratio, average points.
   - Visualized with custom Tailwind statistic bars and metric grids (no charting libraries).

## Verification Checklist
- Run `npm run db:generate`.
- Update `en.ts` and `bn.ts` and verify with `npm run check:i18n`.
- Verify with `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Commit and push to `main`.
```

---

### Phase 8 Prompt: Profile, Discussion & Export

```markdown
# Phase 8 Implementation Prompt — Profile Management, CSV Data Export & Discussion

Read `AGENTS.md` and `docs/MASTER_ROADMAP.md` first.

## Objectives
1. **User Profile Views**:
   - Student Profile (`/student/profile`) and Teacher Profile (`/teacher/profile`).
   - Display role, user avatar, joined date, enrolled courses / authored courses count, completion summary.
   - Integration link with Clerk user profile management.

2. **CSV Data Export**:
   - Export student roster with progress percentage for a course.
   - Export exam results (student name, email, score, percentage, passed status).
   - Export assignment grade sheet (student name, submission status, points awarded, late flag).
   - Generate standard RFC 4180 CSV with UTF-8 BOM directly from server actions/handlers.

3. **Lesson Discussion**:
   - Create `lesson_comments` table (`id`, `lesson_id`, `user_id`, `content`, `created_at`).
   - Simple chronological comment thread under lesson content in learning workspace.
   - Teacher can moderate/delete any comment; students can delete their own.

## Verification Checklist
- Run `npm run db:generate`.
- Update `en.ts` and `bn.ts` and verify with `npm run check:i18n`.
- Verify with `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Commit and push to `main`.
```

---

### Phase 9 Prompt: Production Hardening, Accessibility & PWA

```markdown
# Phase 9 Implementation Prompt — Hardening, Accessibility & PWA

Read `AGENTS.md` and `docs/MASTER_ROADMAP.md` first.

## Objectives
1. **PWA Manifest & Mobile UX**:
   - Add `manifest.json` with icons, theme colors, and standalone display mode.
   - Mobile navigation and touch target optimization for exam taker and curriculum builder.

2. **Accessibility Audit**:
   - ARIA labels and roles across all interactive modals, timers, and drawers.
   - Keyboard navigation audit (focus trapping in modals, escape key handling).
   - Color contrast compliance with Academic Modernism palette.

3. **Performance & Security Review**:
   - Verify `Cache-Control: no-store` on all auth/data streaming routes.
   - Audit database query indexes for high-frequency queries.
   - Complete documentation update in `README.md`.

## Verification Checklist
- Verify with `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Commit and push to `main`.
```
