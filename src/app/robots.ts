import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/courses",
          "/courses/*",
          "/bundles",
          "/bundles/*",
          "/legal",
          "/legal/*",
          "/_next/static/*",
          "/images/*",
          "/favicon.ico",
          "/icon.png",
          "/icon-*.png",
          "/apple-touch-icon.png",
        ],
        disallow: [
          "/student",
          "/student/*",
          "/teacher",
          "/teacher/*",
          "/admin",
          "/admin/*",
          "/parent",
          "/parent/*",
          "/account",
          "/account/*",
          "/checkout",
          "/checkout/*",
          "/leaderboard",
          "/leaderboard/*",
          "/access-denied",
          "/unauthorized",
          "/offline",
          "/account-pending",
          "/continue",
          "/sign-in",
          "/sign-in/*",
          "/sign-up",
          "/sign-up/*",
          "/api/*",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
