"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { PublicCourseSummary } from "@/types/course";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon, BookIcon, PlayIcon } from "@/components/shared/ui/icons";
import { CategoryBadge } from "@/components/shared/category-badge";
import { formatBDT } from "@/lib/utils";

interface CourseShowcaseSectionProps {
  courses: PublicCourseSummary[];
  isBn: boolean;
}

function getCourseThumbnail(
  thumbnailUrl: string | null | undefined,
  category: string | null | undefined
): string {
  if (thumbnailUrl && !thumbnailUrl.includes("ssl.du.ac.bd")) {
    return thumbnailUrl;
  }
  switch (category) {
    case "physics":
      return "/images/courses/physics-cover.jpg";
    case "chemistry":
      return "/images/courses/chemistry-cover.jpg";
    case "biology":
      return "/images/courses/biology-cover.jpg";
    case "ict":
      return "/images/courses/ict-cover.jpg";
    case "mathematics":
      return "/images/courses/math-cover.jpg";
    default:
      return "/images/courses/physics-cover.jpg";
  }
}

export function CourseShowcaseSection({ courses, isBn }: CourseShowcaseSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", labelBn: "সকল বিষয়", labelEn: "All Subjects" },
    { id: "physics", labelBn: "পদার্থবিজ্ঞান", labelEn: "Physics" },
    { id: "chemistry", labelBn: "রসায়ন", labelEn: "Chemistry" },
    { id: "ict", labelBn: "আইসিটি", labelEn: "ICT" },
    { id: "mathematics", labelBn: "উচ্চতর গণিত", labelEn: "Mathematics" },
    { id: "biology", labelBn: "জীববিজ্ঞান", labelEn: "Biology" },
  ];

  const filteredCourses =
    selectedCategory === "all"
      ? courses
      : courses.filter((c) => c.category === selectedCategory);

  const displayCourses = filteredCourses.slice(0, 6);

  return (
    <section id="courses" className="py-16 sm:py-24 border-t border-outline-variant/60 bg-surface-0 dark:bg-surface-0">
      <Container size="xl">
        {/* Section Heading & Category Filter Row */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-3.5 py-0.5 text-xs font-semibold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <span>{isBn ? "কোর্স সূচি" : "Academic Courses"}</span>
            </div>

            <h2 className="mt-3 font-serif text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              {isBn ? "জনপ্রিয় ও চলমান কোর্সসমূহ" : "Curriculum & Enrolling Courses"}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-500 sm:text-base dark:text-ink-400">
              {isBn
                ? "বোর্ড ও বিশ্ববিদ্যালয় ভর্তি পরীক্ষার সিলেবাসভিত্তিক গভীর ও কাঠামোগত অনলাইন কোর্স।"
                : "Structured courses built around the authentic NCTB curriculum for SSC, HSC, and university admission preparations."}
            </p>
          </div>

          <Link
            href="/courses"
            className="inline-flex h-11 items-center gap-2 self-start rounded-full border border-outline-variant bg-surface-0 px-5 text-sm font-semibold text-ink-900 shadow-2xs transition-all hover:bg-surface-1 hover:border-ink-500 sm:self-auto dark:bg-surface-1 dark:text-ink-100"
          >
            <span>{isBn ? "সকল কোর্স দেখুন" : "View All Courses"}</span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {/* Category Pills Filter */}
        <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-surface-1 text-ink-700 hover:bg-surface-2 dark:bg-surface-2 dark:text-ink-300"
              }`}
            >
              {isBn ? cat.labelBn : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        {displayCourses.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayCourses.map((c) => {
              const isPaid = c.requiresPayment && c.priceBdt;
              const priceLabel = isPaid ? formatBDT(Number(c.priceBdt)) : (isBn ? "ফ্রি" : "Free");
              const effectiveThumbnail = getCourseThumbnail(c.thumbnailUrl, c.category);

              return (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  prefetch={false}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant/70 bg-surface-0 shadow-2xs transition-all duration-200 hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-lg dark:bg-surface-1 dark:hover:border-blue-500/40"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
                    <Image
                      src={effectiveThumbnail}
                      alt={c.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />

                    {/* Category Chip */}
                    {c.category ? (
                      <div className="absolute right-3 top-3">
                        <CategoryBadge category={c.category} />
                      </div>
                    ) : null}

                    {/* Price Tag */}
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-block rounded-md bg-white/95 px-2.5 py-1 font-mono text-xs font-bold text-blue-900 shadow-sm backdrop-blur-sm dark:bg-black/80 dark:text-white">
                        {priceLabel}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="font-display text-base font-bold text-ink-900 leading-snug group-hover:text-blue-600 transition-colors sm:text-lg">
                      {c.title}
                    </h3>

                    {c.description ? (
                      <p className="mt-2 text-xs leading-relaxed text-ink-500 line-clamp-2 sm:text-sm dark:text-ink-400">
                        {c.description}
                      </p>
                    ) : null}

                    {/* Metadata & Actions */}
                    <div className="mt-auto flex items-center justify-between border-t border-outline-variant/60 pt-4 text-xs font-medium text-ink-500 dark:text-ink-400">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <BookIcon size={14} className="text-ink-400" />
                          <span>{c.moduleCount} {isBn ? "মডিউল" : "modules"}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <PlayIcon size={14} className="text-ink-400" />
                          <span>{c.lessonCount} {isBn ? "লেসন" : "lessons"}</span>
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 font-bold text-blue-600 transition-transform group-hover:translate-x-1 dark:text-blue-400">
                        <span>{isBn ? "বিস্তারিত" : "Details"}</span>
                        <ArrowRightIcon size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty or filtered state */
          <div className="mt-12 rounded-3xl border border-dashed border-outline-variant p-8 text-center sm:p-12">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300">
              <BookIcon size={24} />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink-900 sm:text-xl">
              {isBn ? "এই বিভাগে শীঘ্রই নতুন কোর্স আসছে" : "New Courses Coming Soon"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-ink-500 sm:text-sm dark:text-ink-400">
              {isBn
                ? "আমাদের সকল কোর্স এবং সিলেবাসের বিস্তারিত জানতে কোর্স ক্যাটালগ পেজ ব্রাউজ করুন।"
                : "Browse our complete catalog to see all available academic modules and preparation tracks."}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
              >
                {isBn ? "সকল কোর্স দেখুন" : "Show All Courses"}
              </button>
            </div>
          </div>
        )}

      </Container>
    </section>
  );
}
