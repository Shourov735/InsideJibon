import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/courses", "/courses/*"],
        disallow: [
          "/student",
          "/student/*",
          "/teacher",
          "/teacher/*",
          "/admin",
          "/admin/*",
          "/api/*",
          "/sign-in",
          "/sign-in/*",
          "/sign-up",
          "/sign-up/*",
          "/continue",
          "/account-pending",
        ],
      },
    ],
    sitemap: "https://insidejibon.com/sitemap.xml",
    host: "https://insidejibon.com",
  };
}
