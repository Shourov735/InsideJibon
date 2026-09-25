# Remaster Phase R7 — Parent Panel & Linked Accounts

> **Phase:** R7 (after R6 so we have notifications infrastructure for digest emails).
> **Theme:** Bring parents into the loop with a read-only dashboard plus daily email digest. Free-tier only — emails via **Cloudflare Email Service** (replaces Resend).

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first.

---

## 1. Objectives

1. New `parent` role in the existing `users.role` enum (Clerk metadata → Drizzle sync via webhook).
2. `parent_student_links` table — many-to-many parent ↔ student with **invitation token** flow (so a parent must prove they can act on behalf of the child's account via an in-app link request, approved by the student).
3. **Read-only parent dashboard** at `/parent` — see linked children's per-course progress, upcoming deadlines, grade trend, attendance, streak; never write to student data.
4. **Daily digest email** — sent via Cloudflare Email Service (free): per child, top 3 metrics + alerts (missing assignment 2+ days, attendance drop, exam fail).
5. **In-app notification mirrors** for parents.
6. **No write API**: every parent endpoint is `GET`-only; server actions are restricted to the dashboard.

---

## 2. Data Model Changes

### Migration `0007_remaster_r7_parent.sql`

```sql
-- Add 'parent' to the role enum (enum names are immutable in some pg versions; we'll do a safe migration: add as text + CHECK)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ALTER COLUMN role TYPE TEXT;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('student', 'teacher', 'admin', 'parent'));

-- Parent ↔ student links
CREATE TABLE IF NOT EXISTS parent_student_links (
  id               UUID PRIMARY KEY,
  parent_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending',     -- pending|active|revoked
  invite_token     TEXT,                                  -- single-use token emailed to parent when they initiate
  invited_at       TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ,
  revoked_at       TIMESTAMPTZ,
  UNIQUE (parent_id, student_id)
);
CREATE INDEX IF NOT EXISTS parent_student_links_parent_idx ON parent_student_links (parent_id, status);
CREATE INDEX IF NOT EXISTS parent_student_links_student_idx ON parent_student_links (student_id, status);
CREATE INDEX IF NOT EXISTS parent_student_links_token_idx ON parent_student_links (invite_token) WHERE invite_token IS NOT NULL;

-- Parent digest subscription preferences per child
CREATE TABLE IF NOT EXISTS parent_digest_prefs (
  parent_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cadence       TEXT NOT NULL DEFAULT 'daily',            -- daily|weekly|off
  send_hour_utc SMALLINT NOT NULL DEFAULT 6,
  PRIMARY KEY (parent_id, student_id)
);

-- Audit (uses R0's table) — already created. We record every read of student data by parent for compliance.
-- `audit_log.action` values added: 'parent.link.request', 'parent.link.accept', 'parent.link.revoke', 'parent.dashboard.view'
```

### Clerk metadata
- Clerk user `public_metadata.role` carries 'parent' (mirrored to Drizzle `users.role` via the R0 webhook handler).
- Parents sign in with the same Clerk flow; `requireRole('parent')` gates their routes.

---

## 3. Service Layer

### 3.1 `src/services/parent/links.ts`
- `requestLink({ parentId, studentEmail })` — looks up student by email, creates `parent_student_links(status='pending')` with a 32-char `invite_token`. Emits in-app + email to student ("{ParentName} requested to view your progress. Approve?").
- `acceptLink({ studentId, linkId })` — student-only; flips status `active`, sets `accepted_at`, sets `parent_digest_prefs` defaults to `daily`.
- `revokeLink({ studentId, linkId })` — student can revoke at any time.
- `getLinkedStudents(parentId)` — returns `students[]` with summary cards.

### 3.2 `src/services/parent/dashboard.ts`
- `getParentOverview(parentId)` — read-only:
  - For each linked student: enrolled courses + completion%, current streak, last 7d XP, upcoming deadlines (next 5), missing assignments (>1 day overdue), last attendance record per course, last 3 grades.
  - Implemented as **three** `getChild*` read-only service functions composed per child to keep CPU ≤ 10ms.
- `recordParentDashboardView(parentId)` — writes `audit_log`.

### 3.3 `src/services/parent/digest.ts`
- `buildDigest(parentId, studentId, day)` — returns the email HTML + plain text body.
- `sendDailyDigests()` — Cron-triggered daily at 06:00 UTC: iterate `parent_digest_prefs WHERE cadence='daily'`, call `sendEmail` via Cloudflare Email Service. Emits `notifications` mirror.
- `sendWeeklyDigests()` — Cron-triggered Mondays at 06:00 UTC for `cadence='weekly'`.
- **Anti-flood**: if no new activity in 24h, skip the digest (in-app notification only).

### 3.4 `src/services/parent/access-control.ts`
- `assertCanReadStudent(parentId, studentId)` — throws `403` if `parent_student_links` doesn't show `status='active'`. Called at the top of every parent-side read service.

---

## 4. UI/UX Changes

### 4.1 Parent dashboard `/parent`
```
+----------------------------------------------------+
| Welcome, Mr. Karim                                |
+----------------------------------------------------+
|  Child: Lamisa (Class 9)            [Switch ▾]   |
+----------------------------------------------------+
|  Streak 7 🔥   |  XP this week 320  | Avg 78%      |
+----------------------------------------------------+
|  Upcoming                                        |
|  • Physics Chapter 4 Test — Wed 4:30 PM           |
|  • Math HW-7 — Thu 11:59 PM                      |
|  • Live Class: Biology — Fri 8:00 PM              |
+----------------------------------------------------+
|  Grade trend (last 8 graded items)                |
|   90 ─                                           |
|   80 ─   ▂▄▆▆▇▇▇                                   |
|   70 ─                                           |
+----------------------------------------------------+
|  Attendance                                      |
|  • Physics — last attended 2 days ago            |
|  • Live classes — 87% attended (last 30d)         |
+----------------------------------------------------+
```

### 4.2 Child switcher
If parent has >1 child linked: top dropdown or side tab to switch which child's overview is shown.

### 4.3 Student-side flow
- Student profile page (`/student/profile`) gains a "Linked family" section.
- Lists active parents and pending link requests.
- Buttons: "Approve", "Revoke".

### 4.4 Email digest
- HTML + plaintext.
- Sections: streak alert, missed assignments, last exam result, next live class.
- Footer: link to `/parent` + link to "Manage alerts".

### 4.5 Settings
- `/parent/settings` — toggle cadence per child, quiet hours, child link management.

### 4.6 ⌘K integration
- "Switch to {child's name}" command.
- "My children's reports" jumps to overview.

---

## 5. Security & Performance Considerations

- **No write access** anywhere in the parent service tree. Statics checked by `defineServerAction` wrappers that throw on `req.method !== 'GET'` for parent role.
- **Rate limiting** (R0 KV): `/parent/*` reads 30/min/user; digest send 1/email/parent/24h.
- **PII audit**: every read writes `audit_log(action='parent.dashboard.view', subject_id=studentId)`.
- **Email enumeration:** the parent request flow looks up the student by exact email; we respond with a generic "If the email belongs to a registered student, an invitation has been sent." — always 200.
- **Digest budget**: with the free Email Service tier (100 sends/day), we cap active `cadence='daily'` parents ≤ 80 to stay safe. Weekly + off-cadence preferred for parents beyond that. **Documented in FREE-TIER-REFERENCE.md alert thresholds.**
- **CSP**: same as R0/R1; email links are signed short-lived tokens via /api/links/[token] which redirect to `/parent` after a one-time cookie session token is set (no query-string student IDs in URLs).
- **No SQL joins crossing parent → student that aren't pre-validated by `parent_student_links.status='active'`**.

---

## 6. i18n Keys Required (R7)

- `parent.dashboard.title`, `welcome`, `switchChild`
- `parent.cards.streak`, `xpWeek`, `avgGrade`, `attendance`
- `parent.upcoming.empty`, `parent.upcoming.item` (deadline/live/exam templates)
- `parent.alerts.missingAssignment`, `attendanceDropped`, `examFail`
- `parent.email.subject`, `parent.email.intro`, `parent.email.footer`
- `parent.link.requested`, `accepted`, `revoked`, `pendingForStudent`
- `parent.settings.cadence.daily`, `weekly`, `off`, `quietHours`

---

## 7. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
2. Parent signs up → `role='parent'` mirrored via webhook.
3. Parent initiates link → student gets in-app + email notification → student approves → parent sees dashboard.
4. Parent tries to call a write action → server returns 403.
5. Cron-triggered digest sends an HTML email to a test parent; bucket count ≤ 80 if using `daily`, no duplicates per 24h.
6. Rate-limit triggered on a high-frequency read loop.
7. `audit_log` shows `parent.dashboard.view` entries.
8. Switching children is instant (cached query, ≤ 1 round trip).
9. CSP allows the Email Service /api/send endpoint's expected response.
10. Email free quota alerts at 70 / day (see FREE-TIER-REFERENCE §19).

---

## 8. Copy-Paste Prompt

```markdown
# Phase R7 — Parent Panel & Linked Accounts

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, `docs/MASTER_REMASTER.md`, and `docs/FREE-TIER-REFERENCE.md` first.

## Tasks
1. Run migration `0007_remaster_r7_parent.sql`.
2. Update Clerk webhook mapping so `public_metadata.role='parent'` is mirrored to `users.role`.
3. Add `src/services/parent/{links,dashboard,digest,access-control}.ts`.
4. Set up **Cloudflare Email Service** integration per `FREE-TIER-REFERENCE.md` §7. Bind `email` to `sendEmail()` helper at `src/lib/cloudflare/email.ts`.
5. Build `/parent` dashboard per §4.1.
6. Build child-switcher + linked-family UI on student profile.
7. Build parent `/settings` per §4.5.
8. Add Cron Triggers: daily digest (06:00 UTC), weekly digest (Mon 06:00 UTC).
9. Add i18n keys per §6.
10. Run §7 verification checklist.
11. Commit + push.
```
