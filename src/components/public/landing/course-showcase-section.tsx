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

const DISCIPLINES = [
  {
    slug: "physics",
    nameBn: "পদার্থবিজ্ঞান",
    nameEn: "Physics",
    image: "/images/subjects/physics.jpg",
    scopeBn: "গতিবিদ্যা, কাজ-শক্তি, তরঙ্গ, স্থির ও চলতড়িৎ",
    scopeEn: "Mechanics, Work & Energy, Waves, Electromagnetism",
  },
  {
    slug: "chemistry",
    nameBn: "রসায়ন",
    nameEn: "Chemistry",
    image: "/images/subjects/chemistry.jpg",
    scopeBn: "গুণগত রসায়ন, পর্যায়বৃত্ত ধর্ম, জৈব রসায়ন মেকানিজম",
    scopeEn: "Qualitative Chemistry, Periodicity, Organic Mechanisms",
  },
  {
    slug: "biology",
    nameBn: "জীববিজ্ঞান",
    nameEn: "Biology",
    image: "/images/subjects/biology.jpg",
    scopeBn: "উদ্ভিদবিজ্ঞান, মানব শারীরতত্ত্ব, জিনতত্ত্ব ও বিবর্তন",
    scopeEn: "Botany, Human Physiology, Genetics & Evolution",
  },
  {
    slug: "ict",
    nameBn: "আইসিটি",
    nameEn: "ICT & Computing",
    image: "/images/subjects/ict.jpg",
    scopeBn: "সংখ্যা পদ্ধতি, ডিজিটাল লজিক, সি প্রোগ্রামিং, HTML",
    scopeEn: "Number Systems, Logic Gates, C Programming, Web",
  },
  {
    slug: "mathematics",
    nameBn: "উচ্চতর গণিত",
    nameEn: "Higher Mathematics",
    image: "/images/subjects/math.jpg",
    scopeBn: "ম্যাট্রিক্স, ত্রিকোণমিতি, অন্তরীকরণ ও যোগজীকরণ",
    scopeEn: "Matrices, Trigonometry, Differential & Integral Calculus",
  },
];

export function CourseShowcaseSection({ courses, isBn }: CourseShowcaseSectionProps) {
  // Show up to 6 published courses
  const displayCourses = courses.slice(0, 6);

  return (
    <section className="border-b border-outline-variant bg-surface-0 py-16 sm:py-24">
      <Container size="xl">
        {/* Section Header */}
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {isBn ? "কোর্স সূচি" : "Academic Courses"}
            </span>

            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {isBn
                ? "প্রকাশিত একাডেমিক কোর্সসমূহ"
                : "Published Curriculum & Courses"}
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base">
              {isBn
                ? "বোর্ড ও বিশ্ববিদ্যালয় ভর্তি পরীক্ষার সিলেবাসভিত্তিক গভীর ও কাঠামোগত কোর্সসমূহ।"
                : "Structured courses built around the authentic syllabus for board exams and university entrance preparations."}
            </p>
          </div>

          <Link
            href="/courses"
            className="inline-flex h-11 items-center gap-2 self-start rounded-xl border border-outline-variant bg-surface-0 px-5 text-sm font-semibold text-ink-900 transition-colors hover:bg-surface-1 sm:self-auto"
          >
            <span>{isBn ? "সকল কোর্স দেখুন" : "View All Courses"}</span>
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {/* Live Published Courses Grid */}
        {displayCourses.length > 0 ? (
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {displayCourses.map((c) => {
              const isPaid = c.requiresPayment && c.priceBdt;
              const priceLabel = isPaid ? formatBDT(Number(c.priceBdt)) : (isBn ? "ফ্রি" : "Free");

              return (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-0 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-academic"
                >
                  {/* Thumbnail / Header Area */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2">
                    {c.thumbnailUrl ? (
                      <Image
                        src={c.thumbnailUrl}
                        alt={c.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary/40">
                        <BookIcon size={36} />
                      </div>
                    )}
                    
                    {/* Category Chip */}
                    {c.category ? (
                      <div className="absolute right-3 top-3">
                        <CategoryBadge category={c.category} />
                      </div>
                    ) : null}

                    {/* Price Tag */}
                    <div className="absolute bottom-3 left-3">
                      <span className="inline-block rounded-md bg-black/60 px-2.5 py-1 font-mono text-xs font-semibold text-white backdrop-blur-sm">
                        {priceLabel}
                      </span>
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6">
                    <h3 className="font-display text-base font-bold leading-snug text-ink-900 group-hover:text-primary sm:text-lg">
                      {c.title}
                    </h3>

                    {c.description ? (
                      <p className="mt-2 text-xs leading-relaxed text-ink-500 line-clamp-2 sm:text-sm">
                        {c.description}
                      </p>
                    ) : null}

                    {/* Footer Metadata */}
                    <div className="mt-auto flex items-center justify-between border-t border-outline-variant/70 pt-4 text-xs font-semibold text-ink-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-mono">
                          <BookIcon size={13} className="text-ink-300" />
                          <span>{c.moduleCount} {isBn ? "মডিউল" : "modules"}</span>
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <PlayIcon size={13} className="text-ink-300" />
                          <span>{c.lessonCount} {isBn ? "লেসন" : "lessons"}</span>
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                        {isBn ? "বিস্তারিত" : "Details"}
                        <ArrowRightIcon size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}

        {/* Foundational Discipline Pathways */}
        <div className="mt-16 sm:mt-20">
          <div className="border-t border-outline-variant pt-10 sm:pt-12">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-ink-500">
              {isBn ? "বিষয়ভিত্তিক পাঠপথ" : "Academic Disciplines"}
            </span>

            <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              {isBn
                ? "বিজ্ঞানের ৫টি মৌলিক স্তম্ভ"
                : "The Five Core Scientific Disciplines"}
            </h3>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {DISCIPLINES.map((d) => (
                <Link
                  key={d.slug}
                  href={`/courses?category=${d.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-1 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-academic"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2">
                    <Image
                      src={d.image}
                      alt={d.nameEn}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 90vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 text-white">
                      <div className="font-display text-base font-bold sm:text-lg">
                        {isBn ? d.nameBn : d.nameEn}
                      </div>
                      <div className="text-[11px] text-white/70 font-mono">
                        {d.nameEn}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5">
                    <p className="text-[11px] leading-relaxed text-ink-500 line-clamp-2">
                      {isBn ? d.scopeBn : d.scopeEn}
                    </p>
                    <div className="mt-2.5 flex items-center gap-1 text-[11px] font-bold text-primary">
                      <span>{isBn ? "কোর্সসমূহ দেখুন" : "View Courses"}</span>
                      <ArrowRightIcon size={11} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </Container>
    </section>
  );
}
