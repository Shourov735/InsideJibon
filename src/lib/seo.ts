import type { PublicCourseDetail } from "@/types/course";

export const SITE_NAME = "InsideJibon";
export const SITE_URL = "https://insidejibon.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-image.jpg`;

/**
 * Builds a clean canonical URL for a given path.
 */
export function buildCanonicalUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath === "/" ? "" : cleanPath}`;
}

/**
 * Builds standard hreflang alternate links for the canonical path.
 */
export function buildAlternates(path: string) {
  const canonical = buildCanonicalUrl(path);
  return {
    canonical,
    languages: {
      "bn-BD": canonical,
      "en-US": canonical,
      "x-default": canonical,
    },
  };
}

/**
 * Schema.org JSON-LD for InsideJibon organization and website.
 */
export function buildWebsiteJsonLd(locale: "en" | "bn" = "bn") {
  const isBn = locale === "bn";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "EducationalOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "ইনসাইড জীবন",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/icon.png`,
          width: 512,
          height: 512,
        },
        image: DEFAULT_OG_IMAGE,
        description: isBn
          ? "এসএসসি, এইচএসসি ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির জন্য পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, আইসিটি ও উচ্চতর গণিতের পূর্ণাঙ্গ পরিকল্পিত একাডেমিক প্ল্যাটফর্ম।"
          : "Structured academic learning platform for SSC, HSC and university admission preparation in Physics, Chemistry, Biology, ICT, and Higher Mathematics in Bangladesh.",
        founder: {
          "@type": "Person",
          name: "Tanvir Hasan Jibon",
          jobTitle: "Science & ICT Educator",
          image: `${SITE_URL}/jibon.jpg`,
          sameAs: [
            "https://youtube.com/@tanvirhasanjibon5827",
            "https://facebook.com/mdtanvirhasan.jibon",
          ],
        },
        sameAs: [
          "https://youtube.com/@tanvirhasanjibon5827",
          "https://facebook.com/mdtanvirhasan.jibon",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: {
          "@id": `${SITE_URL}/#organization`,
        },
        inLanguage: ["bn-BD", "en-US"],
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/courses?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

/**
 * Schema.org JSON-LD for an individual Course page.
 */
export function buildCourseJsonLd(course: PublicCourseDetail, locale: "en" | "bn" = "bn") {
  const isBn = locale === "bn";
  const courseUrl = `${SITE_URL}/courses/${course.slug}`;
  const imageUrl = course.thumbnailUrl
    ? course.thumbnailUrl.startsWith("http")
      ? course.thumbnailUrl
      : `${SITE_URL}${course.thumbnailUrl}`
    : DEFAULT_OG_IMAGE;

  const teacherImageUrl = course.teacher.imageUrl
    ? course.teacher.imageUrl.startsWith("http")
      ? course.teacher.imageUrl
      : `${SITE_URL}${course.teacher.imageUrl}`
    : `${SITE_URL}/jibon.jpg`;

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${courseUrl}#course`,
    name: course.title,
    description:
      course.description ||
      (isBn
        ? `${course.title} — ইনসাইড জীবনে পরিকল্পিত একাডেমিক ভিডিও পাঠ, অ্যাসাইনমেন্ট ও পরীক্ষা প্রস্তুতি।`
        : `Master ${course.title} with structured video lessons, assignments, and exam practice on InsideJibon.`),
    url: courseUrl,
    image: imageUrl,
    inLanguage: isBn ? "bn" : "en",
    provider: {
      "@type": "EducationalOrganization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    instructor: {
      "@type": "Person",
      name: course.teacher.name || "Tanvir Hasan Jibon",
      image: teacherImageUrl,
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: `${course.lessonCount} lessons`,
      inLanguage: ["bn", "en"],
    },
    offers: {
      "@type": "Offer",
      category: "Free",
      price: "0",
      priceCurrency: "BDT",
      availability: "https://schema.org/InStock",
    },
  };
}

/**
 * Schema.org JSON-LD for breadcrumbs.
 */
export function buildBreadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}
