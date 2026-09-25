CREATE TYPE "public"."badge_tier" AS ENUM('bronze', 'silver', 'gold');--> statement-breakpoint
CREATE TYPE "public"."league_tier" AS ENUM('bronze', 'silver', 'gold', 'diamond');--> statement-breakpoint
CREATE TABLE "xp_sources" (
	"source_key" text PRIMARY KEY NOT NULL,
	"default_amount" integer NOT NULL,
	"description_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_streaks" (
	"user_id" text PRIMARY KEY NOT NULL,
	"current_days" integer DEFAULT 0 NOT NULL,
	"longest_days" integer DEFAULT 0 NOT NULL,
	"last_active_day" date,
	"freezes_available" integer DEFAULT 2 NOT NULL,
	"freezes_used_at" timestamp with time zone,
	"broken_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badge_progress" (
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"target" integer NOT NULL,
	"unlocked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "badge_progress_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"title_key" text NOT NULL,
	"description_key" text NOT NULL,
	"icon" text NOT NULL,
	"tier" "badge_tier" DEFAULT 'bronze' NOT NULL,
	"points_reward" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_members" (
	"week_start" date NOT NULL,
	"user_id" text NOT NULL,
	"league" "league_tier" DEFAULT 'bronze' NOT NULL,
	"rank" integer,
	"xp" integer DEFAULT 0 NOT NULL,
	"promoted" boolean DEFAULT false NOT NULL,
	"relegated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_members_week_start_user_id_pk" PRIMARY KEY("week_start","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_inventory" (
	"user_id" text NOT NULL,
	"item_key" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"last_grant_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_inventory_user_id_item_key_pk" PRIMARY KEY("user_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "user_energy" (
	"user_id" text PRIMARY KEY NOT NULL,
	"energy" integer DEFAULT 5 NOT NULL,
	"max_energy" integer DEFAULT 5 NOT NULL,
	"next_refill_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_streaks" ADD CONSTRAINT "daily_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badge_progress" ADD CONSTRAINT "badge_progress_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_members" ADD CONSTRAINT "league_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_energy" ADD CONSTRAINT "user_energy_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "badge_progress_user_idx" ON "badge_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "badge_progress_unlocked_idx" ON "badge_progress" USING btree ("unlocked_at");--> statement-breakpoint
CREATE INDEX "league_members_week_league_rank_idx" ON "league_members" USING btree ("week_start","league","rank");--> statement-breakpoint
CREATE INDEX "league_members_user_idx" ON "league_members" USING btree ("user_id");

-- ----------------------------------------------------------------------------
-- R5 seeds. drizzle-kit does not generate INSERT statements; the spec requires
-- xp_sources + badges to be seeded at migration time so the gamification layer
-- has data to look up on day one. Re-runs are safe (ON CONFLICT DO NOTHING).
-- ----------------------------------------------------------------------------

INSERT INTO "xp_sources" ("source_key", "default_amount", "description_key") VALUES
  ('lesson.complete',                  10, 'gamification.xp.lessonComplete'),
  ('lesson.first_of_day',              15, 'gamification.xp.firstOfDay'),
  ('exam.passed',                      50, 'gamification.xp.examPassed'),
  ('exam.perfect',                    100, 'gamification.xp.examPerfect'),
  ('assignment.submitted_ontime',      20, 'gamification.xp.assignmentOnTime'),
  ('assignment.graded_a',              30, 'gamification.xp.assignmentGradedA'),
  ('qa.upvote',                         5, 'gamification.xp.qaUpvote'),
  ('qa.accepted',                      25, 'gamification.xp.qaAccepted'),
  ('streak.day',                        2, 'gamification.xp.streakDay'),
  ('streak.week',                      25, 'gamification.xp.streakWeek'),
  ('badge.unlocked',                    0, 'gamification.xp.badgeUnlocked'),
  ('class.attended_60',                40, 'gamification.xp.classAttended60')
ON CONFLICT ("source_key") DO NOTHING;--> statement-breakpoint

-- Seed the badge catalog. The service layer mirrors these ids in
-- BADGE_METRICS (src/services/gamification/badges.ts) — keep them in sync
-- if you change a row here.
INSERT INTO "badges" ("id", "title_key", "description_key", "icon", "tier", "points_reward") VALUES
  ('first_lesson',   'gamification.badges.firstLesson.title',    'gamification.badges.firstLesson.desc',    'sprout',   'bronze',  50),
  ('first_exam',     'gamification.badges.firstExam.title',      'gamification.badges.firstExam.desc',      'scroll',   'bronze',  50),
  ('streak_3',       'gamification.badges.streak3.title',        'gamification.badges.streak3.desc',        'flame',    'bronze',  30),
  ('streak_7',       'gamification.badges.streak7.title',        'gamification.badges.streak7.desc',        'flame',    'silver',  70),
  ('streak_30',      'gamification.badges.streak30.title',       'gamification.badges.streak30.desc',       'flame',    'gold',   300),
  ('qa_first_post',  'gamification.badges.qaFirstPost.title',    'gamification.badges.qaFirstPost.desc',    'chat',     'bronze',  25),
  ('qa_10_accepted', 'gamification.badges.qa10Accepted.title',   'gamification.badges.qa10Accepted.desc',   'star',     'silver', 150),
  ('class_attend_10','gamification.badges.classAttend10.title',  'gamification.badges.classAttend10.desc',  'calendar', 'silver', 100)
ON CONFLICT ("id") DO NOTHING;