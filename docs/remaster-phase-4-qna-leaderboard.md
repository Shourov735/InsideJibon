# Remaster Phase R4 — Doubt Q&A, Comment Threading & Leaderboard

> **Phase:** R4 (after R0; can run in parallel with R3, R5, R8, R9, R10).
> **Theme:** Replace today's flat `lesson_comments` with a Stack-Overflow-style **doubt Q&A**, threading, upvotes, accepted answers, and a weekly XP leaderboard.

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, and `docs/MASTER_REMASTER.md` first.

---

## 1. Objectives

1. Promote `lesson_comments` to a **Q&A system** with: questions (top-level), answers (reply), threaded follow-up comments, upvotes/downvotes, accepted answer, status (open/resolved/closed).
2. Keep backward compat: existing comment rows migrate into top-level questions (`kind='question'`, no `parent_id`).
3. Add **moderation** (teacher pin, lock, delete; admins can soft-delete anything).
4. **Leaderboard** — two views: per-course (top 20 students this week by XP earned in that course) and global (top 20 across the platform). Powered by a `leaderboard_snapshots` materialized table refreshed every 15 min via a Cron Trigger.
5. **Gamification hooks** (XP, badges, streaks) live in their own R5 phase; this phase just emits `xp_events` for any Q&A action (earn XP for upvote received, accepted answer, etc.).

---

## 2. Data Model Changes

### Migration `0004_remaster_r4_qna.sql`

```sql
-- Replace the flat lesson_comments with a richer model.
-- Backward-compat: existing rows become top-level questions (kind='comment_legacy').

-- 1. Rename to preserve data + add new columns
ALTER TABLE lesson_comments RENAME TO qa_threads;

ALTER TABLE qa_threads
  ADD COLUMN kind            TEXT NOT NULL DEFAULT 'question', -- 'question'|'answer'|'comment_legacy'|'comment'
  ADD COLUMN parent_id       BIGINT REFERENCES qa_threads(id) ON DELETE CASCADE,
  ADD COLUMN title           TEXT,
  ADD COLUMN status          TEXT NOT NULL DEFAULT 'open',     -- 'open'|'resolved'|'closed'|'reopened'
  ADD COLUMN accepted_answer_id BIGINT REFERENCES qa_threads(id),
  ADD COLUMN upvotes         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN downvotes       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN pinned          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN pinned_at       TIMESTAMPTZ,
  ADD COLUMN pinned_by       TEXT REFERENCES users(id),
  ADD COLUMN search_tsv      TSVECTOR,
  ADD COLUMN updated_at      TIMESTAMPTZ NOT NULL DEFAULT now();

-- Top-level question rows get title; reply rows don't.
CREATE INDEX IF NOT EXISTS qa_threads_lesson_status_idx ON qa_threads (lesson_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS qa_threads_parent_idx ON qa_threads (parent_id, created_at);
CREATE INDEX IF NOT EXISTS qa_threads_user_idx ON qa_threads (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS qa_threads_search_idx ON qa_threads USING GIN (search_tsv);

-- Votes (one row per user/thread; vote value +-1 or 0 = retracted)
CREATE TABLE IF NOT EXISTS qa_votes (
  thread_id  BIGINT NOT NULL REFERENCES qa_threads(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id),
  value      SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);

-- Per-course weekly XP leaderboard (materialized)
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id          BIGSERIAL PRIMARY KEY,
  scope_kind  TEXT NOT NULL,                       -- 'course'|'global'
  scope_id    TEXT,                                -- course_id or null
  week_start  DATE NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entries     JSONB NOT NULL                       -- [{userId, xp, rank}, ...]
);
CREATE INDEX IF NOT EXISTS leaderboard_scope_week_idx
  ON leaderboard_snapshots (scope_kind, scope_id, week_start DESC);

-- XP events (also used by R5 for streaks/badges; we own the schema in R4 as the source)
CREATE TABLE IF NOT EXISTS xp_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  source      TEXT NOT NULL,                       -- 'qa.upvote'|'qa.accepted'|'lesson.complete'|'exam.pass'|'streak.day' …
  amount      INTEGER NOT NULL,
  context     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS xp_events_user_idx ON xp_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS xp_events_source_idx ON xp_events (source, created_at DESC);

-- Search trigger
CREATE OR REPLACE FUNCTION qa_threads_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.content,'')), 'B');
  RETURN NEW;
END $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qa_threads_search_update_trg ON qa_threads;
CREATE TRIGGER qa_threads_search_update_trg
  BEFORE INSERT OR UPDATE OF title, content ON qa_threads
  FOR EACH ROW EXECUTE FUNCTION qa_threads_search_update();
```

> **TODO:** decide whether we want a full-text search config for Bangla. Postgres' `simple` config handles Bangla poorly. Plan: defer FTS to use **Vectorize semantic search** (post-R8) by emitting the index records through the same `qa_threads_search_update` trigger. For R4, ship ILIKE search across title + content (good enough until R8).

---

## 3. Service Layer

### 3.1 `src/services/qna/threads.ts`
- `askQuestion({ lessonId, userId, title, content, attachments })` — creates a `kind='question'` row, increments `lessons.question_count` denormalized counter.
- `postAnswer({ parentId, userId, content })` — `kind='answer'`, must reference a question.
- `postComment({ parentId, userId, content })` — `kind='comment'`, can attach to either question or answer (threaded).
- `vote({ threadId, userId, value })` — upsert into `qa_votes`; recompute thread votes; emit `xp_events(qa.upvote)` to author (+5 each new upvote).
- `acceptAnswer({ threadId, acceptedAnswerId, userId })` — author of question only; emits `xp_events(qa.accepted)` to answer author (+25).
- `setStatus({ threadId, status, userId })` — open/resolved/closed/reopened.
- `pin({ threadId, userId, pinned })` — teacher/admin only (ownership chain via `lessons → module → course → teacherId`).
- `searchQuestions({ q, lessonId?, courseId?, scope })` — ILIKE on title/content; projects only needed columns.

### 3.2 `src/services/qna/moderation.ts`
- `softDeleteThread(threadId, userId)` — sets `deleted_at` (extend schema with this column; add via the same migration).
- `lockThread(threadId, userId)` — prevents further replies.
- Bulk operations for admins.

### 3.3 `src/services/leaderboard/index.ts`
- `getWeeklyLeaderboard({ scopeKind: 'course'|'global', scopeId?, weekStart })` — reads `leaderboard_snapshots` if present; falls back to a live aggregate (cheap weekly query by `xp_events`).
- `computeWeeklyLeaderboard(scopeKind, scopeId, weekStart)` — sums `xp_events` for the week, ranks users, writes `leaderboard_snapshots` row (idempotent via `ON CONFLICT (scope_kind, scope_id, week_start) DO UPDATE`).

### 3.4 Cron Trigger
`wrangler.jsonc`:
```jsonc
{
  "triggers": {
    "crons": ["13 */2 * * *"]   // every 2 hours, hh:13
  }
}
```
Worker entry `src/app/api/cron/leaderboard/route.ts` (or a standalone handler if easier in OpenNext): enqueues `EXPORT_QUEUE` `computeWeeklyLeaderboard('global', null, monday)` and per-course scopes for active courses (active = enrolled-or-authored within 30 days).

### 3.5 XP event emitter
Tiny helper `src/services/xp/emit.ts`:
```ts
export async function emitXp(userId: string, source: string, amount: number, context = {}) {
  await db.insert(xpEvents).values({ userId, source, amount, context });
}
```
Called from existing completion paths (lesson complete, exam pass) — in this phase only Q&A paths emit it; R5 retrofits the rest.

---

## 4. UI/UX Changes

### 4.1 Lesson page (`/student/courses/[courseId]/learn/[lessonId]`)
Below the lesson content, replace the existing comment thread with a **Q&A panel**:

```
+-------------------------------------------------+
|  Ask a doubt        23 open  ·  7 resolved       |
+-------------------------------------------------+
|  [Sort: Top ▾]  [Filter: All questions ▾]       |
|                                                  |
|  🔥 Why does photosynthesis stop at high temp?  |  ← pinned/resolved, accepted answer, upvotes
|    18 ▲  · asked 2d ago  · Resolved by T. Sir    |
|    ────────                                       |
|    3 answers · 1 accepted                         |
|    ⭐ (accepted) Higher temp denatures enzymes…  |
|    ↑ 24 ▲   reply ↩                                |
|    ↳ 2 comments                                    |
+-------------------------------------------------+
|  [+ Ask a question]                                |
+-------------------------------------------------+
```

States:
- Empty: illustration of two speech bubbles, "No doubts yet — be the first to ask."
- Loading: skeleton threads.
- Resolved / Open filter chips + sort (Top / New / Unanswered).

### 4.2 Compose modals
- **Ask question**: title + content (md supported later; plain text in R4) + tag picker (`easy`, `exam-style`, `mistake`, `conceptual`, `numerical`) + optional attachments (re-use R2 materials bucket).
- **Post answer**: triggers a teacher XP toast if the answer author is a teacher.
- **Comment**: small inline box; threading depth capped at 3 (deeper replies collapse).

### 4.3 Voting UX
- Click ▲ / ▼ buttons; optimistic update via `useOptimistic`.
- Hover shows "+5 XP for the author" hint.
- Already voted: filled state; clicking again retracts.
- Own thread: vote buttons hidden.

### 4.4 Leaderboard UI
- `/leaderboard` (logged-in users) — segmented control (Global / per-course).
- Each row: rank, avatar, name, XP for the week, sparkline of last 4 weeks.
- Top 3 get a podium (1 gold / 2 silver / 3 bronze). 
- Below top 20: "Your rank is 47 / 1,283" link.
- Teacher-side: a "Class leaderboard" view inside the course analytics page (R7 also uses this).

### 4.5 Notifications
- When your question is answered: in-app + email (after R10).
- When your answer is accepted: in-app + XP toast.
- When your question hits 5 upvotes: "Trending doubt" badge + notification.

---

## 5. Security & Performance Considerations

- **Vote integrity:** votes table has composite PK `(thread_id, user_id)`; updating `value` increments/decrements `qa_threads.upvotes`/`downvotes` counters atomically **inside a single transaction-shaped sequence**: SELECT vote row → UPDATE counter with `WHERE upvotes = expected` (compare-and-swap). Failure (counter drift) → background reconciliation from `qa_votes`.
  - **Limitation note:** Drizzle `neon-http` driver has no transactions; we accept rare drift and reconcile via a daily scheduled job.
- **Anti-spam votes:** `vote()` rate-limited via the R0 KV helper — 1 vote/same-thread per user per 2s.
- **Soft delete:** add `qa_threads.deleted_at TIMESTAMPTZ`; UI hides them.
- **Search:** ILIKE is fine for <100k threads; once we exceed, switch to Vectorize semantic (R8).
- **Realtime updates:** for R4 we use SWR-style polling on the lesson page (`revalidate=10s`). R8 could upgrade to live push via DO later.

---

## 6. i18n Keys Required (R4)

- `qna.tab.open`, `resolved`, `closed`
- `qna.sort.top`, `new`, `unanswered`
- `qna.filter.all`, `myQuestions`, `unanswered`
- `qna.empty.title`, `qna.empty.description`
- `qna.compose.titleLabel`, `contentLabel`, `tagsLabel`, `attachmentHelp`
- `qna.actions.ask`, `answer`, `comment`, `acceptAnswer`, `pin`, `unpin`, `lock`, `unlock`, `delete`
- `qna.vote.up`, `down`, `alreadyVoted`
- `qna.notifications.answered`, `accepted`, `trending`
- `leaderboard.title`, `leaderboard.scope.global`, `leaderboard.scope.course`, `leaderboard.empty`, `leaderboard.yourRank`
- `xp.events.qaUpvote`, `xp.events.qaAccepted` (for toasts)

---

## 7. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
2. Migration `0004_remaster_r4_qna.sql` runs cleanly; old `lesson_comments` rows become questions.
3. Ask → answer → upvote → accept flow works end-to-end with two browsers.
4. Vote counter matches `qa_votes` aggregate at any moment.
5. Leaderboard shows the correct top users after Cron Trigger fires once (manually invoke to test).
6. Notifications arrive (in-app + persisted) when your question is answered.
7. Search via `/api/qna/search?q=...` returns ILIKE matches against title + content.
8. Pinned questions stay pinned after teacher unpublishes republishes the lesson.
9. Soft delete hides from UI; row still exists for audit.
10. LCP of lesson page with Q&A open ≤ 1.5s on 4G mobile.

---

## 8. Copy-Paste Prompt

```markdown
# Phase R4 — Doubt Q&A, Comment Threading & Leaderboard

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, and `docs/MASTER_REMASTER.md` first.

## Tasks
1. Run migration `0004_remaster_r4_qna.sql`.
2. Add `qa_threads`, `qa_votes`, `leaderboard_snapshots`, `xp_events` to `src/db/schema/`.
3. Build `src/services/qna/{threads,moderation}.ts` per §3.1, §3.2.
4. Build `src/services/leaderboard/index.ts` and XP emitter `src/services/xp/emit.ts`.
5. Add Cron Trigger to `wrangler.jsonc` and the route handler.
6. Replace lesson comment thread with Q&A panel per §4.1.
7. Build compose modals + voting UX with optimistic updates.
8. Build `/leaderboard` page per §4.4.
9. Wire notifications: question answered, answer accepted.
10. Add i18n keys per §6.
11. Run §7 verification checklist.
12. Commit + push.
```
