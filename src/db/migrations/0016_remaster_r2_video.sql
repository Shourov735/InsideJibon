CREATE TABLE "cache_invalidations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tag" text NOT NULL,
	"reason" text,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_assets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" bigint NOT NULL,
	"owner_kind" text NOT NULL,
	"owner_id" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_assets_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "video_provider" text DEFAULT 'youtube' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "youtube_video_id" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "youtube_caption_lang" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "video_asset_id" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "video_duration_s" integer;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "video_thumbnail_key" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "video_renditions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "cache_invalidations_tag_idx" ON "cache_invalidations" USING btree ("tag","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "public_assets_owner_idx" ON "public_assets" USING btree ("owner_kind","owner_id");--> statement-breakpoint
CREATE INDEX "public_assets_tags_idx" ON "public_assets" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "lessons_video_provider_idx" ON "lessons" USING btree ("video_provider");