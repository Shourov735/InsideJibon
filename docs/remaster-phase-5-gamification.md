# Remaster Phase R5 — Gamification (XP, Streaks, Badges, Leagues)

> **Phase:** R5 (after R4 — depends on `xp_events` table from R4 and the leaderboard snapshots).
> **Theme:** Duolingo-grade engagement loop — XP for everything, daily streaks with freezes, badges, weekly leagues with promotion/relegation, celebration moments.
> **Cost commitment:** no paid SaaS — all state lives in Postgres + Workers KV (rate-limit-friendly counters).

Read `AGENTS.md`, `docs/MASTER_ROADMAP.md`, `docs/MASTER_REMASTER.md`, and [`FREE-TIER-REFERENCE.md`](./FREE-TIER-REFERENCE.md) first.

---

## 1. Objectives

1. **XP source registry** — one place to register what earns XP and how much.
2. **Streak** — per-user `daily_streaks` row updated on first qualifying activity each day; supports streak freeze via `inventory` (a 1/week allowance).
3. **Badges** — declarative badge definitions + a `badge_progress` table + auto-award hooks.
4. **Leagues** — Bronze / Silver / Gold / Diamond cohorts auto-promoted/relegated weekly.
5. **Energy / lives on quizzes** — opt-in mode for exam/quiz retries; refills over time.
6. **Celebration moments** — confetti on milestone unlocks (level up, streak day, badge), toast + persistence.
7. **Retrofitting** — wire up XP emissions on every existing "earnable" event: lesson complete, exam pass, assignment on-time submit, Q&A accepted, etc.

---

## 2. Data Model Changes

### Migration `0005_remaster_r5_gamification.sql`

```sql
-- Streak state per user
CREATE TABLE IF NOT EXISTS daily_streaks (
  user_id            TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_days       INTEGER NOT NULL DEFAULT 0,
  longest_days       INTEGER NOT NULL DEFAULT 0,
  last_active_day    DATE,                       -- the day the streak was extended
  freezes_available  INTEGER NOT NULL DEFAULT 2, -- weekly allowance
  freezes_used_at    TIMESTAMPTZ,
  broken_at          TIMESTAMPTZ
);

-- Badge catalog (declarative; populated by seed)
CREATE TABLE IF NOT EXISTS badges (
  id            TEXT PRIMARY KEY,                -- 'first_lesson', 'streak_7', etc.
  title_key     TEXT NOT NULL,                   -- i18n key
  description_key TEXT NOT NULL,
  icon          TEXT NOT NULL,                   -- single emoji OR token like 'flame'
  tier          TEXT NOT NULL DEFAULT 'bronze',  -- bronze|silver|gold
  points_reward INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-user badge progress and unlocks
CREATE TABLE IF NOT EXISTS badge_progress (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id    TEXT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  progress    INTEGER NOT NULL DEFAULT 0,        -- 0..target
  target      INTEGER NOT NULL,
  unlocked_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS badge_progress_unlocked_idx ON badge_progress (unlocked_at);

-- League membership (per-user, per-week)
CREATE TABLE IF NOT EXISTS league_members (
  week_start  DATE NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  league      TEXT NOT NULL DEFAULT 'bronze',    -- bronze|silver|gold|diamond
  rank        INTEGER,
  xp          INTEGER NOT NULL DEFAULT 0,
  promoted    BOOLEAN NOT NULL DEFAULT false,
  relegated    BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (week_start, user_id)
);
CREATE INDEX IF NOT EXISTS league_members_week_league_rank_idx
  ON league_members (week_start, league, rank);

-- Inventory: streak freezes, energy refills, etc.
CREATE TABLE IF NOT EXISTS user_inventory (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_key     TEXT NOT NULL,                    -- 'streak_freeze', 'energy_refill'
  quantity     INTEGER NOT NULL DEFAULT 0,
  last_grant_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, item_key)
);

-- Energy / lives for quiz mode (per exam attempt)
CREATE TABLE IF NOT EXISTS user_energy (
  user_id     TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  energy      INTEGER NOT NULL DEFAULT 5,        -- default 5 hearts/lives
  max_energy  INTEGER NOT NULL DEFAULT 5,
  next_refill_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- XP source registry (data + service-level validator in one place)
CREATE TABLE IF NOT EXISTS xp_sources (
  source_key    TEXT PRIMARY KEY,                -- 'lesson.complete'
  default_amount INTEGER NOT NULL,
  description_key TEXT NOT NULL,
  enabled       BOOLEAN NOT NULL DEFAULT true
);

-- Seed badges + xp_sources at migration time
INSERT INTO xp_sources (source_key, default_amount, description_key) VALUES
  ('lesson.complete',         10, 'gamification.xp.lessonComplete'),
  ('lesson.first_of_day',     15, 'gamification.xp.firstOfDay'),
  ('exam.passed',             50, 'gamification.xp.examPassed'),
  ('exam.perfect',           100, 'gamification.xp.examPerfect'),
  ('assignment.submitted_ontime', 20, 'gamification.xp.assignmentOnTime'),
  ('assignment.graded_a',     30, 'gamification.xp.assignmentGradedA'),
  ('qa.upvote',                5, 'gamification.xp.qaUpvote'),
  ('qa.accepted',             25, 'gamification.xp.qaAccepted'),
  ('streak.day',               2, 'gamification.xp.streakDay'),
  ('streak.week',             25, 'gamification.xp.streakWeek'),
  ('badge.unlocked',           0, 'gamification.xp.badgeUnlocked'),  -- uses badges.points_reward
  ('class.attended_60',       40, 'gamification.xp.classAttended60')
ON CONFLICT (source_key) DO NOTHING;

INSERT INTO badges (id, title_key, description_key, icon, tier, points_reward, target) VALUES
  ('first_lesson',  'gamification.badges.firstLesson.title',  'gamification.badges.firstLesson.desc',  'sprout', 'bronze', 50,  1),
  ('first_exam',    'gamification.badges.firstExam.title',    'gamification.badges.firstExam.desc',    'scroll', 'bronze', 50,  1),
  ('streak_3',      'gamification.badges.streak3.title',      'gamification.badges.streak3.desc',      'flame',  'bronze', 30,  3),
  ('streak_7',      'gamification.badges.streak7.title',      'gamification.badges.streak7.desc',      'flame',  'silver', 70,  7),
  ('streak_30',     'gamification.badges.streak30.title',     'gamification.badges.streak30.desc',     'flame',  'gold',   300, 30),
  ('qa_first_post', 'gamification.badges.qaFirstPost.title',  'gamification.badges.qaFirstPost.desc',  'chat',   'bronze', 25,  1),
  ('qa_10_accepted','gamification.badges.qa10Accepted.title', 'gamification.badges.qa10Accepted.desc', 'star',   'silver', 150, 10),
  ('class_attend_10','gamification.badges.classAttend10.title','gamification.badges.classAttend10.desc','calendar','silver',100,10)
ON CONFLICT (id) DO NOTHING;
```

`badge_progress` is seeded lazily on first read for any new user — `ensureBadgeProgressRows(userId)`.

---

## 3. Service Layer

### 3.1 `src/services/gamification/xp.ts`
- `emitXp(userId, sourceKey, opts?)` — looks up `xp_sources.default_amount`, inserts an `xp_events` row (R4), updates `daily_streaks`, evaluates badge unlocks, fires celebrations.
- `awardBadge(userId, badgeId)` — inserts `badge_progress.unlocked_at`, emits `badge.unlocked` XP if points_reward > 0.
- `getXpTotal(userId, range?)` — sum from `xp_events` for the user within range.
- `getXpBreakdown(userId, range)` — group by `source_key`, useful for analytics.

### 3.2 `src/services/gamification/streaks.ts`
- `recordActivity(userId, day)` — called from `emitXp`. Logic:
  - If `last_active_day = today` → no-op.
  - If `last_active_day = yesterday` → `current_days += 1`.
  - Else → offer streak freeze: if `freezes_available > 0` and `now - last_active_day <= 2 days`, consume a freeze and `current_days += 1`. Else → `current_days = 1` and `broken_at = now`.
  - Update `longest_days = max(longest_days, current_days)`.
  - Emit `streak.day` XP for each day advanced; `streak.week` bonus at 7-day boundary.
- `grantWeeklyFreezes()` — Cron Trigger runs Monday 00:00 UTC: `UPDATE daily_streaks SET freezes_available = 2, freezes_used_at = NULL WHERE last_active_day < current_date - 8`.

### 3.3 `src/services/gamification/badges.ts`
- `ensureBadgeProgressRows(userId)` — upserts 0/target rows for all badges not yet tracked for the user.
- `evaluateBadge(userId, badgeId)` — increments `progress` based on the badge's metric; if `progress >= target` and not unlocked, calls `awardBadge`.
- One **declarative badge-metric table** mapping each badge to its data source:
  ```ts
  // in code (not DB) — small enough to keep in source
  const BADGE_METRICS: Record<string, (userId) => Promise<number>> = {
    first_lesson:  uid => countLessonsCompleted(uid),
    first_exam:    uid => countExamsPassed(uid),
    streak_3:      uid => getCurrentStreak(uid).then(s => s >= 3 ? 3 : 0),
    qa_first_post: uid => countQuestionsAsked(uid),
    qa_10_accepted:uid => countAcceptedAnswers(uid),
    class_attend_10: uid => countClassAttendance(uid),
  };
  ```

### 3.4 `src/services/gamification/leagues.ts`
- `computeWeeklyLeagues(weekStart)` — Cron-triggered Sunday 23:59 UTC: reads `xp_events` for the week, ranks users, partitions into Bronze (top 70%), Silver (next 20%), Gold (next 8%), Diamond (top 2%), writes `league_members`. Markers `promoted`/`relegated` by comparing to previous week's league.
- `getCurrentLeague(userId)` — returns `{ league, rank, xp }` for this week.

### 3.5 `src/services/gamification/energy.ts`
- `consumeEnergy(userId, n)` — used when an exam/quiz has `costPerAttempt > 0` set by the teacher.
- `refillTick()` — Cron every 5 min: where `now >= next_refill_at`, increment `energy` by 1, push `next_refill_at = now + 30min` until full.

### 3.6 `src/services/gamification/notifications.ts`
- `emitCelebration(userId, type, payload)` — writes a `notifications` row flagged as `kind='celebration'`, plus an in-app toast + Web Push (R9) if subscribed.

---

## 4. UI/UX Changes

### 4.1 Right-rail streak/XP card
- Visible on student dashboard and lesson page.
- Flame icon + `current_days` + "🔥 Freeze used" pill when applicable.
- XP card shows current week total + delta vs. last week.
- League pill (Bronze/Silver/Gold/Diamond) with current rank "47 of 1,283".

### 4.2 Streak repair modal
When `recordActivity` detects a broken streak and the user has freezes, show a one-click **"Repair streak"** modal — uses 1 freeze, restores streak, emits `gamification.streak.repair.success` toast.

### 4.3 League leaderboard tab
- Adds a new tab on `/leaderboard` (from R4) showing the user's current league cohort.
- Top 7 promoted to next league next week (animated); bottom 5 relegated (subtle, no shame).

### 4.4 Badge shelf
- `/student/badges` — grid of badges with locked state silhouettes + unlock animations.
- Earned badge cards reveal their story: "Earned on 5 Aug 2026 — Streak 7 days".

### 4.5 Energy / lives
- Quiz UI shows hearts (5); each wrong answer (in `costPerAttempt > 0` quizzes) consumes one.
- When hearts hit 0, "Refill now" CTA → opens `inventory`-based item grant (teacher can grant a refill, or it's time-based).

### 4.6 Celebration moments
- Milestone unlocks fire a `<CelebrationOverlay>` — soft confetti (canvas-based, ~150 particles, no library), large toast, optional Web Push (R9).
- Re-trigger celebrations respect a 24h cooldown per user per type (avoid notification fatigue).

### 4.7 ⌘K integration (R1)
- "Show my badges" command.
- "Show my streak" command.

---

## 5. Security & Performance Considerations

- **`emitXp` is idempotent per (userId, sourceKey, contextId)** — the `context` JSONB includes a deduplication key (e.g. `lesson_complete:<lessonId>:<firstAt>`). Replays produce 0 new XP.
- **Atomicity caveat** (neon-http has no transactions): the streak update + XP insert + badge eval are 3 separate statements. Streak drift is corrected by the weekly Cron. Same risk profile as R4.
- **Rate limit** the celebration emit (R0 KV helper) to prevent toast spam if a teacher uploads a bulk class.
- **Performance:** `xp_events` writes are batched per request via a small in-memory accumulator flushed on response close (Workers `ctx.waitUntil`).
- **PII:** no PII in XP context beyond the userId + opaque dedupe key.

---

## 6. i18n Keys Required (R5)

- `gamification.streak.title`, `days`, `freezeUsed`, `freezeAvailable`, `repairStreak`
- `gamification.xp.*` (one per `xp_sources` row, see migration)
- `gamification.badges.<id>.title`, `<id>.desc` (one pair per badge in migration)
- `gamification.league.bronze`, `silver`, `gold`, `diamond`, `promoted`, `relegated`, `rankOfTotal`
- `gamification.energy.heart`, `refillIn`, `outOfHearts`
- `gamification.celebration.streakDay`, `levelUp`, `badgeUnlocked`, `leaguePromoted`

---

## 7. Verification Checklist

1. `npm run check:i18n`, `npx tsc --noEmit`, `npm run lint`, `npm run build` green.
2. XP flow: complete a lesson → `xp_events` row + `daily_streaks.current_days=1` + `lesson.complete` toast.
3. Streak: simulate two consecutive days → day 2 streak advances + `streak.day` XP. Skip a day → broken streak (or freeze consumption).
4. Badge: cross `streak_3` threshold → confetti + push + badge shelf update.
5. League: trigger Cron manually for current week; top X% placed in correct tier; `promoted`/`relegated` set correctly when comparing to last week.
6. Energy: take a `costPerAttempt=1` quiz 5 times → 6th attempt blocked unless teacher grants refill.
7. Replay safety: emit XP for the same `(userId, sourceKey, contextId)` twice → only one `xp_events` row.
8. Notification cooldown: 3 celebrations in 30s → only 1 surfaced in UI.
9. R4's `xp_events` table usage stays inside free tier (we keep < 100k rows hot per user via monthly archival to `xp_events_archive`).
10. Per-day Cron triggers run within Workers free quotas (cron execution counts toward requests; daily triggers × 3 = < 4 req/day — well within budget).

---

## 8. Copy-Paste Prompt

```markdown
# Phase R5 — Gamification (XP, Streaks, Badges, Leagues)

Read `AGENTS.md`, `docs/MASTER_READMAP.md`, `docs/MASTER_REMASTER.md`, and `docs/FREE-TIER-REFERENCE.md` first.

## Tasks
1. Run migration `0005_remaster_r5_gamification.sql`.
2. Add `src/db/schema/{streaks,badges,leagues,inventory,energy,xp_sources}.ts`.
3. Build `src/services/gamification/{xp,streaks,badges,leagues,energy,notifications}.ts`.
4. Register XP emissions on existing earn paths: lesson complete, exam pass, assignment submit/grade, Q&A events (R4), class attendance (R3).
5. Add Cron Triggers: weekly freezes (Mon 00:00), weekly leagues (Sun 23:59), energy refill tick (every 5 min).
6. Build the right-rail streak/XP card on student dashboard + lesson page.
7. Build streak-repair modal + celebration overlay.
8. Build `/student/badges` page.
9. Extend `/leaderboard` with current-league tab.
10. Wire ⌘K commands.
11. Add i18n keys per §6.
12. Run §7 verification checklist.
13. Commit + push.
```
