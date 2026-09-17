import type { MetadataRoute } from "next";
import { getPublishedCourses } from "@/services/courses";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: {
          "bn-BD": SITE_URL,
          "en-US": SITE_URL,
          "x-default": SITE_URL,
        },
      },
    },
    {
      url: `${SITE_URL}/courses`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          "bn-BD": `${SITE_URL}/courses`,
          "en-US": `${SITE_URL}/courses`,
          "x-default": `${SITE_URL}/courses`,
        },
      },
    },
  ];

  try {
    const publishedCourses = await getPublishedCourses();
    const courseRoutes: MetadataRoute.Sitemap = publishedCourses.map((course) => {
      const courseUrl = `${SITE_URL}/courses/${course.slug}`;
      return {
        url: courseUrl,
        lastModified: course.publishedAt ? new Date(course.publishedAt) : now,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: {
            "bn-BD": courseUrl,
            "en-US": courseUrl,
            "x-default": courseUrl,
          },
        },
      };
    });

    return [...staticRoutes, ...courseRoutes];
  } catch (error) {
    console.error("Failed to generate course sitemap entries:", error);
    return staticRoutes;
  }
}
