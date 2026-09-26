import type { Metadata } from "next";

import { getTranslator } from "@/i18n/server";
import { buildWebsiteJsonLd, buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { getPublishedCourses } from "@/services/courses";

import { HeroSection } from "@/components/public/landing/hero-section";
import { PhilosophySection } from "@/components/public/landing/philosophy-section";
import { CourseShowcaseSection } from "@/components/public/landing/course-showcase-section";
import { MethodSection } from "@/components/public/landing/method-section";
import { EducatorSection } from "@/components/public/landing/educator-section";
import { FeaturesSection } from "@/components/public/landing/features-section";
import { CtaSection } from "@/components/public/landing/cta-section";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  const isBn = t.locale === "bn";
  const title = t("seo.home.title");
  const description = t("seo.home.description");

  return {
    title: { absolute: title },
    description,
    alternates: buildAlternates("/"),
    openGraph: {
      title,
      description,
      url: "https://insidejibon.com",
      siteName: "InsideJibon",
      locale: isBn ? "bn_BD" : "en_US",
      alternateLocale: [isBn ? "en_US" : "bn_BD"],
      type: "website",
      images: [
        {
          url: "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/og-image.jpg"],
    },
  };
}

export default async function MarketingPage() {
  const t = await getTranslator();
  const isBn = t.locale === "bn";

  let publishedCourses: Awaited<ReturnType<typeof getPublishedCourses>> = [];
  try {
    publishedCourses = await getPublishedCourses();
  } catch (err) {
    console.error("[MarketingPage] Failed to fetch published courses:", err);
  }

  return (
    <main className="flex w-full flex-col min-h-screen">
      <JsonLd data={buildWebsiteJsonLd(t.locale as "en" | "bn")} />

      {/* 01. Editorial Hero & Thesis */}
      <HeroSection isBn={isBn} />

      {/* 02. The Academic Philosophy */}
      <PhilosophySection isBn={isBn} />

      {/* 03. Core Published Courses & Discipline Pathways */}
      <CourseShowcaseSection courses={publishedCourses} isBn={isBn} />

      {/* 04. The 4-Stage Learning Architecture */}
      <MethodSection isBn={isBn} />

      {/* 05. Lead Educator Monograph */}
      <EducatorSection isBn={isBn} />

      {/* 06. Engineering & Academic Capabilities */}
      <FeaturesSection isBn={isBn} />

      {/* 07. Concluding Editorial Call to Action */}
      <CtaSection isBn={isBn} />
    </main>
  );
}
