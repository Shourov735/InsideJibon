import type { MetadataRoute } from "next";
import { getPublishedCourses } from "@/services/courses";
import { listPublishedBundles } from "@/services/payments";
import { LEGAL_LAST_UPDATED, type LegalDocKey } from "@/content/legal";
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

  const legalKeys: LegalDocKey[] = ["terms", "privacy", "refund", "cookies"];
  const legalRoutes: MetadataRoute.Sitemap = legalKeys.map((doc) => {
    const legalUrl = `${SITE_URL}/legal/${doc}`;
    const dateStr = LEGAL_LAST_UPDATED[doc];
    return {
      url: legalUrl,
      lastModified: dateStr ? new Date(dateStr) : now,
      changeFrequency: "monthly",
      priority: 0.5,
      alternates: {
        languages: {
          "bn-BD": legalUrl,
          "en-US": legalUrl,
          "x-default": legalUrl,
        },
      },
    };
  });

  const baseRoutes = [...staticRoutes, ...legalRoutes];

  try {
    const [publishedCourses, publishedBundles] = await Promise.all([
      getPublishedCourses().catch((err) => {
        console.error("Failed to fetch courses for sitemap:", err);
        return [];
      }),
      listPublishedBundles().catch((err) => {
        console.error("Failed to fetch bundles for sitemap:", err);
        return [];
      }),
    ]);

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

    const bundleRoutes: MetadataRoute.Sitemap = publishedBundles.map((bundle) => {
      const bundleUrl = `${SITE_URL}/bundles/${bundle.slug}`;
      return {
        url: bundleUrl,
        lastModified: bundle.publishedAt ? new Date(bundle.publishedAt) : now,
        changeFrequency: "weekly",
        priority: 0.8,
        alternates: {
          languages: {
            "bn-BD": bundleUrl,
            "en-US": bundleUrl,
            "x-default": bundleUrl,
          },
        },
      };
    });

    return [...baseRoutes, ...courseRoutes, ...bundleRoutes];
  } catch (error) {
    console.error("Failed to generate sitemap entries:", error);
    return baseRoutes;
  }
}

