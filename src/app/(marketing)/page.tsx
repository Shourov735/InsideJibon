import type { Metadata } from "next";

import { getTranslator } from "@/i18n/server";
import { buildWebsiteJsonLd, buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { getPublishedCourses } from "@/services/courses";

import { HeroSection } from "@/components/public/landing/hero-section";
import { ValuePillarsStrip } from "@/components/public/landing/value-pillars-strip";
import { SubjectDiscoverySection } from "@/components/public/landing/subject-discovery-section";
import { CourseShowcaseSection } from "@/components/public/landing/course-showcase-section";
import { PlatformExperienceSection } from "@/components/public/landing/platform-experience-section";
import { MethodSection } from "@/components/public/landing/method-section";
import { EducatorSection } from "@/components/public/landing/educator-section";
import { CtaSection } from "@/components/public/landing/cta-section";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator();
  const isBn = t.locale === "bn";
  const title = isBn
    ? "ইনসাইডজীবন | উদ্দেশ্য নিয়ে শেখা, জীবনের জন্য এগিয়ে যাওয়া"
    : "InsideJibon | Learn with Purpose. Grow for Life.";
  const description = isBn
    ? "পরিকল্পিত কোর্স, সরাসরি লাইভ ক্লাস, বোর্ড ও ভর্তি পরীক্ষার অনুশীলন — সব কিছু এক প্ল্যাটফর্মে, বাংলাদেশের শিক্ষার্থী ও শিক্ষকদের জন্য।"
    : "Structured courses, live classes, practice exams and handwritten reviews — designed for Bangladeshi students and educators.";

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

      {/* 01. Editorial Hero & Purpose */}
      <HeroSection isBn={isBn} />

      {/* 02. The 4 Value Pillars Floating Strip */}
      <ValuePillarsStrip isBn={isBn} />

      {/* 03. Explore Subjects & Learning Paths */}
      <SubjectDiscoverySection isBn={isBn} />

      {/* 04. Published Courses Catalog */}
      <CourseShowcaseSection courses={publishedCourses} isBn={isBn} />

      {/* 05. Platform Architecture & Live Interactive Experience */}
      <PlatformExperienceSection isBn={isBn} />

      {/* 06. The 4-Stage Learning Architecture */}
      <MethodSection isBn={isBn} />

      {/* 07. Lead Educator Monograph */}
      <EducatorSection isBn={isBn} />

      {/* 08. Concluding Call to Action */}
      <CtaSection isBn={isBn} />
    </main>
  );
}
