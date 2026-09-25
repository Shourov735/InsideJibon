/**
 * YouTube oEmbed Mock Helper for Hermetic E2E Testing
 *
 * Simulates YouTube's public oEmbed endpoint:
 * https://www.youtube.com/oembed?url=...&format=json
 *
 * Guarantees zero network calls during CI/testing and deterministic test output.
 */

export interface OEmbedFixture {
  title: string;
  author_name: string;
  author_url: string;
  type: string;
  height: number;
  width: number;
  version: string;
  provider_name: string;
  provider_url: string;
  thumbnail_height: number;
  thumbnail_width: number;
  thumbnail_url: string;
  html: string;
}

export const OEMBED_FIXTURES: Record<string, OEmbedFixture> = {
  "dQw4w9WgXcQ": {
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    author_name: "Rick Astley",
    author_url: "https://www.youtube.com/@RickAstleyYT",
    type: "video",
    height: 113,
    width: 200,
    version: "1.0",
    provider_name: "YouTube",
    provider_url: "https://www.youtube.com/",
    thumbnail_height: 360,
    thumbnail_width: 480,
    thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Rick Astley - Never Gonna Give You Up (Official Music Video)"></iframe>',
  },
  "bn_lesson_01": {
    title: "বাংলা প্রোগ্রামিং টিউটোরিয়াল - পর্ব ১: ভূমিকা ও পরিবেশ প্রস্তুত",
    author_name: "InsideJibon Academy",
    author_url: "https://www.youtube.com/@InsideJibon",
    type: "video",
    height: 113,
    width: 200,
    version: "1.0",
    provider_name: "YouTube",
    provider_url: "https://www.youtube.com/",
    thumbnail_height: 360,
    thumbnail_width: 480,
    thumbnail_url: "https://i.ytimg.com/vi/bn_lesson_01/hqdefault.jpg",
    html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/bn_lesson_01?feature=oembed" frameborder="0" allowfullscreen title="বাংলা প্রোগ্রামিং টিউটোরিয়াল"></iframe>',
  },
  "short_unlisted": {
    title: "InsideJibon Quick Tip: Understanding CSS Grid",
    author_name: "Teacher Shuvo",
    author_url: "https://www.youtube.com/@InsideJibon",
    type: "video",
    height: 113,
    width: 200,
    version: "1.0",
    provider_name: "YouTube",
    provider_url: "https://www.youtube.com/",
    thumbnail_height: 360,
    thumbnail_width: 480,
    thumbnail_url: "https://i.ytimg.com/vi/short_unlisted/hqdefault.jpg",
    html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/short_unlisted?feature=oembed" frameborder="0" allowfullscreen></iframe>',
  },
};

export const PRIVATE_VIDEO_IDS = new Set(["private_vid_1", "priv_class_09", "confidential1"]);
export const NOT_FOUND_VIDEO_IDS = new Set(["00000000000", "notfound_vid", "deleted_vid_1"]);

/**
 * Creates a mock global fetch dispatcher that intercepts YouTube oEmbed requests.
 */
export function setupOEmbedMock() {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function mockFetch(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    if (urlStr.includes("youtube.com/oembed")) {
      const parsedUrl = new URL(urlStr);
      const targetUrl = parsedUrl.searchParams.get("url") || "";

      // Check if video is private
      for (const privId of PRIVATE_VIDEO_IDS) {
        if (targetUrl.includes(privId)) {
          return new Response("Unauthorized", {
            status: 401,
            statusText: "Unauthorized",
            headers: { "Content-Type": "text/plain" },
          });
        }
      }

      // Check if video is not found
      for (const nfId of NOT_FOUND_VIDEO_IDS) {
        if (targetUrl.includes(nfId)) {
          return new Response("Not Found", {
            status: 404,
            statusText: "Not Found",
            headers: { "Content-Type": "text/plain" },
          });
        }
      }

      // Check for known fixtures
      for (const [vidId, fixture] of Object.entries(OEMBED_FIXTURES)) {
        if (targetUrl.includes(vidId)) {
          return new Response(JSON.stringify(fixture), {
            status: 200,
            statusText: "OK",
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      }

      // Default fallback for any 11-char ID not explicitly marked private/404
      const idMatch = targetUrl.match(/([a-zA-Z0-9_-]{11})/);
      if (idMatch) {
        const id = idMatch[1];
        const dynamicFixture: OEmbedFixture = {
          title: `Video Title for ${id}`,
          author_name: "Instructor Account",
          author_url: "https://www.youtube.com/@Instructor",
          type: "video",
          height: 113,
          width: 200,
          version: "1.0",
          provider_name: "YouTube",
          provider_url: "https://www.youtube.com/",
          thumbnail_height: 360,
          thumbnail_width: 480,
          thumbnail_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          html: `<iframe width="200" height="113" src="https://www.youtube.com/embed/${id}?feature=oembed" frameborder="0" allowfullscreen></iframe>`,
        };
        return new Response(JSON.stringify(dynamicFixture), {
          status: 200,
          statusText: "OK",
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
      }

      // Malformed request
      return new Response("Not Found", {
        status: 404,
        statusText: "Not Found",
        headers: { "Content-Type": "text/plain" },
      });
    }

    return originalFetch(input, init);
  };

  return () => {
    globalThis.fetch = originalFetch;
  };
}
