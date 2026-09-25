import "server-only";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  courseModules,
  courses,
  lessons,
  type Lesson,
  type VideoProvider,
  type VideoRendition,
} from "@/db/schema";
import { publicUrl } from "@/lib/storage/public";
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from "@/lib/video/youtube";
import { isStudentEnrolled } from "@/services/enrollments";

export type { VideoProvider, VideoRendition };

/**
 * Universal video descriptor providing contract compatibility with
 * PROJECT.md, src/types/video.ts, and student lesson components.
 */
export interface VideoDescriptor {
  provider: VideoProvider;
  videoId?: string;
  youtubeVideoId?: string | null;
  manifestUrl?: string;
  videoUrl?: string | null;
  url?: string | null;
  durationS?: number | null;
  videoDurationS?: number | null;
  thumbnailUrl?: string | null;
  captionLang?: string | null;
  youtubeCaptionLang?: string | null;
  renditions?: VideoRendition[];
  videoRenditions?: VideoRendition[];
}

/**
 * Input contract for configuring a lesson's video settings.
 */
export interface SetLessonVideoInput {
  lessonId?: string;
  videoProvider?: VideoProvider;
  provider?: VideoProvider;
  youtubeUrlOrId?: string | null;
  youtubeVideoId?: string | null;
  youtubeCaptionLang?: string | null;
  videoAssetId?: string | null;
  videoDurationS?: number | null;
  durationS?: number | null;
  videoThumbnailKey?: string | null;
  thumbnailKey?: string | null;
  videoRenditions?: VideoRendition[];
  renditions?: VideoRendition[];
  videoUrl?: string | null;
  externalUrl?: string | null;
  captionLang?: string | null;
}

/**
 * Response contract returned to students fetching lesson playback metadata.
 */
export interface LessonVideoResponse {
  lessonId: string;
  isFree: boolean;
  video: VideoDescriptor | null;
  provider?: VideoProvider;
  videoId?: string;
  youtubeVideoId?: string | null;
  manifestUrl?: string;
  videoUrl?: string | null;
  url?: string | null;
  durationS?: number | null;
  videoDurationS?: number | null;
  thumbnailUrl?: string | null;
  captionLang?: string | null;
  youtubeCaptionLang?: string | null;
  renditions?: VideoRendition[];
  videoRenditions?: VideoRendition[];
}

/**
 * Verifies that a lesson belongs to a module/course owned by the calling teacher.
 */
async function verifyLessonOwnership(teacherId: string, lessonId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      lesson: lessons,
      module: courseModules,
      course: courses,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(and(eq(lessons.id, lessonId), eq(courses.teacherId, teacherId)))
    .limit(1);

  if (!row) {
    throw new Error("Lesson not found or unauthorized");
  }
  return row;
}

/**
 * Updates a lesson's video configuration with teacher ownership enforcement.
 * Supports both (input, callerTeacherId) and (lessonId, input, callerTeacherId).
 */
export async function setLessonVideo(
  input: SetLessonVideoInput,
  callerTeacherId: string
): Promise<Lesson>;
export async function setLessonVideo(
  lessonId: string,
  input: SetLessonVideoInput,
  callerTeacherId: string
): Promise<Lesson>;
export async function setLessonVideo(
  arg1: string | SetLessonVideoInput,
  arg2: SetLessonVideoInput | string,
  arg3?: string
): Promise<Lesson> {
  let lessonId: string;
  let input: SetLessonVideoInput;
  let callerTeacherId: string;

  if (typeof arg1 === "string") {
    lessonId = arg1;
    input = arg2 as SetLessonVideoInput;
    callerTeacherId = arg3 as string;
  } else {
    input = arg1;
    lessonId = input.lessonId || "";
    callerTeacherId = arg2 as string;
  }

  if (!lessonId) {
    throw new Error("Missing lessonId in setLessonVideo input.");
  }
  if (!callerTeacherId) {
    throw new Error("Missing callerTeacherId in setLessonVideo.");
  }

  await verifyLessonOwnership(callerTeacherId, lessonId);

  const provider: VideoProvider =
    input.videoProvider || input.provider || "youtube";

  let youtubeVideoId: string | null = null;
  let youtubeCaptionLang: string | null = null;
  let videoAssetId: string | null = null;
  let videoUrl: string | null = null;
  const videoDurationS: number | null =
    input.durationS ?? input.videoDurationS ?? null;
  const videoThumbnailKey: string | null =
    input.thumbnailKey ?? input.videoThumbnailKey ?? null;
  const videoRenditions: VideoRendition[] =
    input.videoRenditions ?? input.renditions ?? [];

  if (provider === "youtube") {
    const rawUrlOrId = input.youtubeUrlOrId || input.youtubeVideoId;
    if (rawUrlOrId) {
      youtubeVideoId = extractYouTubeVideoId(rawUrlOrId) || rawUrlOrId.trim();
    }
    youtubeCaptionLang = input.captionLang ?? input.youtubeCaptionLang ?? null;
    videoAssetId = input.videoAssetId ?? null;
    videoUrl = input.externalUrl ?? input.videoUrl ?? null;
  } else if (provider === "r2_hls") {
    videoAssetId = input.videoAssetId ?? null;
    youtubeVideoId = null;
    youtubeCaptionLang = null;
    videoUrl = null;
  } else if (provider === "external") {
    videoUrl = input.externalUrl ?? input.videoUrl ?? null;
    youtubeVideoId = null;
    youtubeCaptionLang = null;
    videoAssetId = null;
  }

  const db = getDb();
  const [updated] = await db
    .update(lessons)
    .set({
      videoProvider: provider,
      youtubeVideoId,
      youtubeCaptionLang,
      videoAssetId,
      videoDurationS,
      videoThumbnailKey,
      videoRenditions,
      videoUrl,
      updatedAt: new Date(),
    })
    .where(eq(lessons.id, lessonId))
    .returning();

  if (!updated) {
    const [fetched] = await db
      .select()
      .from(lessons)
      .where(eq(lessons.id, lessonId))
      .limit(1);
    return fetched;
  }

  return updated;
}

/**
 * Resolves the authorized video playback descriptor for a student viewing a lesson.
 * Enforces course enrollment entitlement for non-free lessons.
 */
export async function getLessonVideoForStudent(
  lessonId: string,
  studentId?: string | null
): Promise<LessonVideoResponse> {
  const db = getDb();
  const [row] = await db
    .select({
      lesson: lessons,
      module: courseModules,
      course: courses,
    })
    .from(lessons)
    .innerJoin(courseModules, eq(lessons.moduleId, courseModules.id))
    .innerJoin(courses, eq(courseModules.courseId, courses.id))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  if (!row) {
    throw new Error("Lesson not found");
  }

  // Entitlement check: Free lessons are public; paid lessons require active enrollment
  if (!row.lesson.isFree) {
    if (!studentId) {
      throw new Error("Access denied: You must be enrolled to view this lesson.");
    }
    const enrolled = await isStudentEnrolled(studentId, row.course.id);
    if (!enrolled) {
      throw new Error("Access denied: You must be enrolled to view this lesson.");
    }
  }

  const provider = (row.lesson.videoProvider as VideoProvider) || "youtube";

  let thumbnailUrl: string | null = null;
  if (row.lesson.videoThumbnailKey) {
    thumbnailUrl = publicUrl(row.lesson.videoThumbnailKey);
  } else if (provider === "youtube" && row.lesson.youtubeVideoId) {
    thumbnailUrl = getYouTubeThumbnailUrl(row.lesson.youtubeVideoId, "maxresdefault");
  }

  let videoDescriptor: VideoDescriptor | null = null;

  if (provider === "youtube" && row.lesson.youtubeVideoId) {
    videoDescriptor = {
      provider: "youtube",
      videoId: row.lesson.youtubeVideoId,
      youtubeVideoId: row.lesson.youtubeVideoId,
      durationS: row.lesson.videoDurationS,
      videoDurationS: row.lesson.videoDurationS,
      thumbnailUrl,
      captionLang: row.lesson.youtubeCaptionLang,
      youtubeCaptionLang: row.lesson.youtubeCaptionLang,
      renditions: row.lesson.videoRenditions ?? [],
      videoRenditions: row.lesson.videoRenditions ?? [],
      url: null,
    };
  } else if (provider === "r2_hls" && row.lesson.videoAssetId) {
    const manifest = publicUrl(row.lesson.videoAssetId);
    videoDescriptor = {
      provider: "r2_hls",
      manifestUrl: manifest,
      url: manifest,
      durationS: row.lesson.videoDurationS,
      videoDurationS: row.lesson.videoDurationS,
      thumbnailUrl,
      renditions: row.lesson.videoRenditions ?? [],
      videoRenditions: row.lesson.videoRenditions ?? [],
    };
  } else if (provider === "external" && row.lesson.videoUrl) {
    videoDescriptor = {
      provider: "external",
      videoUrl: row.lesson.videoUrl,
      url: row.lesson.videoUrl,
      durationS: row.lesson.videoDurationS,
      videoDurationS: row.lesson.videoDurationS,
      thumbnailUrl,
      renditions: [],
      videoRenditions: [],
    };
  } else if (row.lesson.videoUrl) {
    // Legacy fallback for records with videoUrl but unset or default provider
    videoDescriptor = {
      provider: "external",
      videoUrl: row.lesson.videoUrl,
      url: row.lesson.videoUrl,
      durationS: row.lesson.videoDurationS,
      videoDurationS: row.lesson.videoDurationS,
      thumbnailUrl,
      renditions: [],
      videoRenditions: [],
    };
  }

  return {
    lessonId: row.lesson.id,
    isFree: row.lesson.isFree,
    video: videoDescriptor,
    ...(videoDescriptor || {}),
  } as LessonVideoResponse;
}
