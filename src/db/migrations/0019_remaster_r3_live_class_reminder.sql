-- R3 — Live class reminder de-dupe column.
--
-- We piggy-back on the existing `energy-refill` Cron Trigger (every 5 min,
-- already deployed — see wrangler.jsonc §triggers.crons). Every tick the
-- cron route scans `class_sessions` for sessions whose start is within
-- the next 15 minutes and whose lobby has opened; for each matching
-- session it enqueues a `class.reminder` notification.
--
-- `class_reminder_sent_at` is a one-shot gate so a session gets exactly
-- one reminder across many tick iterations.
--
-- Additive — no impact on hot paths, no backfill required.
ALTER TABLE "class_sessions"
  ADD COLUMN IF NOT EXISTS "class_reminder_sent_at" timestamptz;
--> statement-breakpoint

-- Index used by the cron tick: `WHERE class_reminder_sent_at IS NULL
-- AND scheduled_at BETWEEN now() AND now() + interval '20 minutes'`.
CREATE INDEX IF NOT EXISTS "class_sessions_reminder_idx"
  ON "class_sessions" ("scheduled_at")
  WHERE "class_reminder_sent_at" IS NULL;
