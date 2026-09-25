/**
 * Test Fixtures and Test Vectors for Remaster Phase R2
 */

export const YOUTUBE_URL_FIXTURES = {
  validStandard: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  validStandardHttp: "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
  validShort: "https://youtu.be/dQw4w9WgXcQ",
  validEmbed: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  validNocookieEmbed: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  validShorts: "https://youtube.com/shorts/dQw4w9WgXcQ",
  validLive: "https://www.youtube.com/live/dQw4w9WgXcQ",
  validRawId: "dQw4w9WgXcQ",
  validWithPrefixQuery: "https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ&t=42s",
  validWithMultipleParams: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL12345&index=2",
  validShortWithParam: "https://youtu.be/dQw4w9WgXcQ?t=120",
  validEmbedWithControls: "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=0",
  validBengaliTitleId: "bn_lesson_01",
  validShortId: "short_unlisted",

  // Boundaries & edge cases
  withLeadingWhitespace: "   https://www.youtube.com/watch?v=dQw4w9WgXcQ   ",
  withTrailingSlash: "https://youtu.be/dQw4w9WgXcQ/",
  withHtmlIframe: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>',
  invalidTenChars: "dQw4w9WgXc",
  invalidTwelveChars: "dQw4w9WgXcQQ",
  invalidDomainVimeo: "https://vimeo.com/12345678",
  invalidDomainDailymotion: "https://www.dailymotion.com/video/x7tgad0",
  invalidEmptyString: "",
  invalidWhitespaceOnly: "     ",
  invalidSpecialChars: "https://www.youtube.com/watch?v=$$$$$$$$$$$",
  invalidNull: null as unknown as string,
};

export const CACHE_TAG_FIXTURES = {
  marketingLanding: "marketing:landing",
  catalogList: "catalog:list",
  courseDetail: "course:hsc-physics-2026",
  courseDetailComposite: "course:intro-to-web-dev_v2",
  teacherHandle: "teacher:shourov-sir",
  assetKey: "asset:thumbnails/courses/physics-hsc.webp",
  multipleTags: [
    "marketing:landing",
    "catalog:list",
    "course:hsc-physics-2026",
    "teacher:shourov-sir",
  ],
  duplicateTags: ["catalog:list", "catalog:list", "catalog:list"],
  specialCharTag: "course:math_101-algebra:advanced",
};

export const ASSET_KEY_FIXTURES = {
  standard: "thumbnails/courses/physics-101.jpg",
  leadingSlash: "/thumbnails/courses/physics-101.jpg",
  deeplyNested: "courses/2026/hsc/modules/01/video-poster.png",
  unicodeName: "thumbnails/বাংলা-টিউটোরিয়াল.png",
  nonImage: "documents/syllabus-2026.pdf",
  captionVtt: "captions/lesson-01-en.vtt",
};

export const PROGRESS_SYNC_FIXTURES = {
  initialResume: 45, // resume at 45 seconds
  debounceIntervalMs: 5000, // 5s debounce threshold
  totalDuration: 600, // 10 minutes (600s)
  completeThresholdSeconds: 541, // >90% of 600 is >540s
};
