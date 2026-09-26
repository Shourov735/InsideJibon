import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

import { getTranslator } from "@/i18n/server";
import { buildWebsiteJsonLd, buildAlternates } from "@/lib/seo";
import { JsonLd } from "@/components/shared/json-ld";
import { Container } from "@/components/shared/ui/container";
import { Badge } from "@/components/shared/ui/badge";
import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ClipboardIcon,
  PlayIcon,
  SparklesIcon,
  TrophyIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";
import { getPublishedCourses } from "@/services/courses";

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

const SUBJECTS = [
  {
    slug: "physics",
    label: "পদার্থবিজ্ঞান",
    labelEn: "Physics",
    color: "from-blue-600 to-indigo-700",
    cover: "/images/courses/physics-cover.jpg",
    description:
      "ভেক্টর, গতি, কাজ-শক্তি, তড়িৎ এবং আধুনিক পদার্থবিজ্ঞানের গভীর আলোচনা।",
  },
  {
    slug: "chemistry",
    label: "রসায়ন",
    labelEn: "Chemistry",
    color: "from-amber-500 to-orange-600",
    cover: "/images/courses/chemistry-cover.jpg",
    description:
      "গুণগত রসায়ন, পর্যায়বৃত্ত ধর্ম এবং জৈব রসায়নের রিঅ্যাকশন মেকানিজম।",
  },
  {
    slug: "biology",
    label: "জীববিজ্ঞান",
    labelEn: "Biology",
    color: "from-emerald-500 to-green-700",
    cover: "/images/courses/biology-cover.jpg",
    description:
      "উদ্ভিদবিজ্ঞান, মানব শারীরতত্ত্ব এবং বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি।",
  },
  {
    slug: "ict",
    label: "আইসিটি",
    labelEn: "ICT",
    color: "from-cyan-500 to-sky-700",
    cover: "/images/courses/ict-cover.jpg",
    description:
      "সংখ্যা পদ্ধতি, ডিজিটাল লজিক, HTML ও সি প্রোগ্রামিংয়ের হ্যান্ডস-অন কোডিং।",
  },
  {
    slug: "mathematics",
    label: "উচ্চতর গণিত",
    labelEn: "Higher Mathematics",
    color: "from-purple-600 to-fuchsia-700",
    cover: "/images/courses/math-cover.jpg",
    description:
      "ম্যাট্রিক্স, ত্রিকোণমিতি, অন্তরীকরণ ও যোগজীকরণে দক্ষতা।",
  },
];

const METHOD_STEPS = [
  {
    n: "1",
    titleEn: "Learn with Structure",
    titleBn: "কাঠামোগত পাঠদান",
    descriptionEn:
      "Meticulously planned video lectures and comprehensive materials that build a deep understanding.",
    descriptionBn:
      "পরিকল্পিত ভিডিও লেকচার ও সমৃদ্ধ লেকচার শিট — গভীর ধারণা গড়ে তোলার জন্য।",
    icon: <BookIcon size={20} />,
  },
  {
    n: "2",
    titleEn: "Practice with Purpose",
    titleBn: "লক্ষ্যভিত্তিক অনুশীলন",
    descriptionEn:
      "Board-standard MCQ and written exams with instant auto-grading so you always know where you stand.",
    descriptionBn:
      "বোর্ড-স্ট্যান্ডার্ড MCQ ও লিখিত পরীক্ষা — তাৎক্ষণিক অটো-গ্রেডিং সহ।",
    icon: <ClipboardIcon size={20} />,
  },
  {
    n: "3",
    titleEn: "Improve with Confidence",
    titleBn: "আত্মবিশ্বাসী উন্নতি",
    descriptionEn:
      "Assignment feedback, performance analytics and direct lesson discussion with the educator.",
    descriptionBn:
      "অ্যাসাইনমেন্ট ফিডব্যাক, পারফরম্যান্স অ্যানালিটিক্স এবং শিক্ষকের সাথে সরাসরি আলোচনা।",
    icon: <TrophyIcon size={20} />,
  },
];

const PLATFORM_FEATURES = [
  {
    icon: <VideoIcon size={20} />,
    titleEn: "Structured video lessons",
    titleBn: "সুশৃঙ্খল ভিডিও লেসন",
    descriptionEn: "Carefully sequenced lessons with chapter-wise learning paths.",
    descriptionBn: "অধ্যায়ভিত্তিক পাঠপথ সহ সুশৃঙ্খলভাবে সাজানো লেসন।",
  },
  {
    icon: <ClipboardIcon size={20} />,
    titleEn: "Assignments & auto-grading",
    titleBn: "অ্যাসাইনমেন্ট ও অটো-গ্রেডিং",
    descriptionEn: "Submit written work, get instant marks and educator feedback.",
    descriptionBn: "লিখিত কাজ জমা দিন, তাৎক্ষণিক নম্বর ও শিক্ষকের মন্তব্য পান।",
  },
  {
    icon: <CalendarIcon size={20} />,
    titleEn: "Live classes",
    titleBn: "লাইভ ক্লাস",
    descriptionEn: "Real-time sessions with chat, raise hand, and replay access.",
    descriptionBn: "চ্যাট, হাত তোলা ও রিপ্লে সুবিধাসহ রিয়েল-টাইম সেশন।",
  },
  {
    icon: <ChartIcon size={20} />,
    titleEn: "Performance analytics",
    titleBn: "পারফরম্যান্স অ্যানালিটিক্স",
    descriptionEn: "Visual progress, streaks, and league standings to keep you motivated.",
    descriptionBn: "ভিজ্যুয়াল প্রগতি, স্ট্রিক ও লিগ র‍্যাঙ্কিং — মোটিভেশন ধরে রাখতে।",
  },
  {
    icon: <SparklesIcon size={20} />,
    titleEn: "AI study assistant",
    titleBn: "AI স্টাডি অ্যাসিস্ট্যান্ট",
    descriptionEn: "Ask questions about any lesson and get contextual help, anytime.",
    descriptionBn: "যেকোনো লেসন সম্পর্কে প্রশ্ন করুন — যেকোনো সময় প্রাসঙ্গিক সাহায্য।",
  },
  {
    icon: <UsersIcon size={20} />,
    titleEn: "Parent visibility",
    titleBn: "অভিভাবকের নজরদারি",
    descriptionEn: "Parents can monitor progress, attendance and key milestones.",
    descriptionBn: "অভিভাবকরা প্রগতি, উপস্থিতি ও গুরুত্বপূর্ণ মাইলফলক দেখতে পারবেন।",
  },
];

export default async function MarketingPage() {
  const t = await getTranslator();
  let featuredCourses: Awaited<ReturnType<typeof getPublishedCourses>> = [];
  try {
    featuredCourses = await getPublishedCourses();
    featuredCourses = featuredCourses.slice(0, 3);
  } catch {
    // ignore — page still works without featured courses
  }

  return (
    <div className="flex w-full flex-col">
      <JsonLd data={buildWebsiteJsonLd(t.locale as "en" | "bn")} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-0 via-surface-0 to-surface-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(15,138,95,0.08),transparent_45%),radial-gradient(circle_at_85%_30%,rgba(67,56,202,0.08),transparent_45%)]"
        />
        <Container className="relative py-12 sm:py-20 lg:py-28" size="xl">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-6 sm:space-y-7 lg:col-span-7">
              <Badge tone="primary" size="sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                বিজ্ঞান ও আইসিটি শিক্ষার পরিকল্পিত প্ল্যাটফর্ম
              </Badge>

              <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl lg:text-6xl">
                Learn with structure.
                <br />
                <span className="text-primary">Practice with purpose.</span>
                <br />
                Improve with confidence.
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-ink-500 sm:text-lg">
                এসএসসি, এইচএসসি ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির জন্য পদার্থবিজ্ঞান, রসায়ন,
                জীববিজ্ঞান, আইসিটি ও উচ্চতর গণিতের পূর্ণাঙ্গ একাডেমিক প্ল্যাটফর্ম।
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/courses"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-on-primary shadow-[0_4px_14px_-6px_rgba(0,53,85,0.45)] transition-colors hover:bg-primary/90"
                >
                  Explore Courses
                  <ArrowRightIcon size={16} />
                </Link>
                <a
                  href="#instructor"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-0 px-6 text-base font-semibold text-ink-900 hover:bg-surface-1"
                >
                  Meet Your Instructor
                </a>
              </div>

              {/* Quick stats */}
              <dl className="grid grid-cols-3 gap-3 pt-2 sm:gap-6">
                {[
                  { label: "Subjects", value: "5" },
                  { label: "Lectures", value: "50+" },
                  { label: "Board Aligned", value: "100%" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-outline-variant bg-surface-0/70 p-3 sm:p-4">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                      {s.label}
                    </dt>
                    <dd className="font-display text-xl font-bold text-ink-900 sm:text-2xl">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Hero visual */}
            <div className="relative mx-auto w-full max-w-sm sm:max-w-md lg:col-span-5 lg:max-w-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-outline-variant shadow-[0_24px_64px_-20px_rgba(0,0,0,0.18)]">
                <Image
                  src="/jibon.jpg"
                  alt="Tanvir Hasan Jibon — Lead Educator"
                  fill
                  className="object-cover"
                  priority
                  sizes="(min-width: 1024px) 40vw, 90vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5 text-white sm:p-6">
                  <Badge tone="primary" className="bg-white/15 text-white backdrop-blur">
                    Lead Educator
                  </Badge>
                  <p className="mt-3 font-display text-xl font-bold sm:text-2xl">Tanvir Hasan Jibon</p>
                  <p className="text-xs text-white/80 sm:text-sm">
                    Science &amp; Mathematics Educator
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["Physics", "Chemistry", "Biology", "ICT", "Math"].map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium backdrop-blur sm:text-[11px]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating preview chip */}
              <div className="absolute -bottom-4 -left-4 hidden rotate-[-4deg] rounded-2xl border border-outline-variant bg-surface-0 p-3 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)] sm:flex sm:items-center sm:gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--color-success)]/12 text-[color:var(--color-success)]">
                  <PlayIcon size={16} />
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                    Live now
                  </div>
                  <div className="text-sm font-semibold text-ink-900">Force &amp; Motion</div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* SUBJECTS */}
      <section className="bg-surface-1 py-14 sm:py-20">
        <Container size="xl">
          <div className="mb-8 max-w-2xl sm:mb-12">
            <Badge tone="muted" size="sm">Curriculum</Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              বিষয়ভিত্তিক পূর্ণাঙ্গ পাঠ্যক্রম
            </h2>
            <p className="mt-2 text-sm text-ink-500 sm:text-base">
              এসএসসি ও এইচএসসি শিক্ষার্থীদের প্রতিটি অধ্যায় ও গাণিতিক সমস্যা সহজভাবে
              অনুধাবনের জন্য বিশেষভাবে সাজানো কোর্সসমূহ।
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
            {SUBJECTS.slice(0, 4).map((s) => (
              <Link
                key={s.slug}
                href={`/courses?category=${s.slug}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)]"
              >
                <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${s.color}`}>
                  <Image
                    src={s.cover}
                    alt={`${s.labelEn} cover`}
                    fill
                    className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                      {s.labelEn}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 text-white">
                    <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                      {s.label}
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-between p-5">
                  <p className="text-sm text-ink-500">{s.description}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    View courses
                    <ArrowRightIcon size={14} />
                  </div>
                </div>
              </Link>
            ))}

            {/* Featured span */}
            <Link
              href="/courses?category=mathematics"
              className="group relative col-span-1 flex flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)] sm:col-span-2 lg:col-span-2"
            >
              <div className="grid grid-cols-1 sm:grid-cols-5">
                <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-purple-600 to-fuchsia-700 sm:aspect-auto sm:col-span-2">
                  <Image
                    src={SUBJECTS[4].cover}
                    alt="Mathematics cover"
                    fill
                    className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105"
                    sizes="(min-width: 1024px) 35vw, (min-width: 640px) 45vw, 90vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-4 text-white">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                      Mathematics
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-center p-5 sm:col-span-3 sm:p-6">
                  <h3 className="font-display text-lg font-bold text-ink-900 sm:text-xl">
                    HSC Higher Mathematics — Calculus &amp; Coordinate Geometry
                  </h3>
                  <p className="mt-2 text-sm text-ink-500">
                    ম্যাট্রিক্স, সরলরেখা, ত্রিকোণমিতি, অন্তরীকরণ ও যোগজীকরণে শর্টকাট
                    কৌশল ও সমাধান।
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    View Higher Math
                    <ArrowRightIcon size={14} />
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </Container>
      </section>

      {/* METHOD */}
      <section className="bg-surface-0 py-14 sm:py-20">
        <Container size="xl">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <Badge tone="primary" size="sm">Learning Architecture</Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              পরিকল্পিত শিক্ষার পদ্ধতি · The InsideJibon Method
            </h2>
            <p className="mt-2 text-sm text-ink-500 sm:text-base">
              বিজ্ঞান শিক্ষাকে কার্যকর ও আত্মবিশ্বাসী করতে একটি সমন্বিত তিন ধাপের শিক্ষণ
              পদ্ধতি।
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
            {METHOD_STEPS.map((step) => (
              <div
                key={step.n}
                className="flex flex-col rounded-3xl border border-outline-variant bg-surface-0 p-5 sm:p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-on-primary">
                  {step.icon}
                </div>
                <div className="text-micro font-semibold uppercase tracking-wide text-ink-500">
                  Step {step.n}
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-ink-900">
                  {step.titleBn}
                </h3>
                <p className="text-sm font-medium text-primary">{step.titleEn}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">
                  {step.descriptionBn}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-300">
                  {step.descriptionEn}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* PLATFORM CAPABILITIES */}
      <section className="bg-surface-1 py-14 sm:py-20">
        <Container size="xl">
          <div className="mb-8 max-w-2xl sm:mb-12">
            <Badge tone="muted" size="sm">Platform</Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              শেখার জন্য যা কিছু দরকার
            </h2>
            <p className="mt-2 text-sm text-ink-500 sm:text-base">
              Everything you need to learn, practice and improve — all in one place.
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {PLATFORM_FEATURES.map((f) => (
              <li
                key={f.titleEn}
                className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-0 p-4 sm:p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-semibold text-ink-900">
                    {f.titleBn}
                  </h3>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-500">
                    {f.titleEn}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-500">
                    {f.descriptionBn}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* FEATURED COURSES (live) */}
      {featuredCourses.length > 0 ? (
        <section className="bg-surface-0 py-14 sm:py-20">
          <Container size="xl">
            <div className="mb-8 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge tone="primary" size="sm">Featured</Badge>
                <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
                  জনপ্রিয় কোর্সসমূহ
                </h2>
                <p className="mt-2 text-sm text-ink-500 sm:text-base">
                  এই মুহূর্তে শিক্ষার্থীরা যেসব কোর্সে সবচেয়ে বেশি এগিয়ে চলেছে।
                </p>
              </div>
              <Link
                href="/courses"
                className="inline-flex h-10 items-center gap-1 self-start rounded-xl border border-outline-variant bg-surface-0 px-4 text-sm font-semibold text-ink-900 hover:bg-surface-1 sm:self-auto"
              >
                সকল কোর্স
                <ArrowRightIcon size={14} />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
              {featuredCourses.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-outline-variant bg-surface-0 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-10px_rgba(0,0,0,0.12)]"
                >
                  {c.thumbnailUrl ? (
                    <div className="relative aspect-[16/10] overflow-hidden bg-surface-2">
                      <Image
                        src={c.thumbnailUrl}
                        alt={c.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-primary/20 to-primary/5" />
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-base font-semibold text-ink-900 line-clamp-2 group-hover:text-primary">
                      {c.title}
                    </h3>
                    {c.description ? (
                      <p className="mt-2 text-sm text-ink-500 line-clamp-2">{c.description}</p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-display text-base font-bold text-primary">
                        {c.priceBdt ? `৳${c.priceBdt}` : "Free"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                        View
                        <ArrowRightIcon size={12} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* INSTRUCTOR */}
      <section id="instructor" className="bg-surface-1 py-14 sm:py-20">
        <Container size="xl">
          <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-0">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              <div className="relative aspect-[4/5] min-h-[300px] w-full lg:col-span-4 lg:aspect-auto lg:min-h-full">
                <Image
                  src="/jibon.jpg"
                  alt="Tanvir Hasan Jibon"
                  fill
                  className="object-cover"
                  sizes="(min-width: 1024px) 33vw, 100vw"
                />
              </div>
              <div className="flex flex-col gap-5 p-6 sm:p-8 lg:col-span-8 lg:p-10">
                <Badge tone="muted" size="sm">শিক্ষক পরিচিতি · Meet Your Instructor</Badge>
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                    তানভীর হাসান জীবন <span className="text-ink-500">(Tanvir Hasan Jibon)</span>
                  </h2>
                  <p className="mt-1 text-sm text-ink-500 sm:text-base">
                    শিক্ষার্থী, উদ্ভিদবিজ্ঞান বিভাগ — ঢাকা সেন্ট্রাল ইউনিভার্সিটি
                  </p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    Physics, Chemistry, Biology, ICT &amp; Mathematics Educator
                  </p>
                </div>
                <p className="text-sm leading-relaxed text-ink-500 sm:text-base">
                  Passionate about making complex scientific concepts accessible to every
                  student. With years of experience guiding students through SSC, HSC, and
                  University Admission preparations, I believe in building a strong
                  foundation rather than rote memorization.
                </p>
                <p className="text-sm leading-relaxed text-ink-500 sm:text-base">
                  Through InsideJibon, I aim to provide high-quality education to all
                  students across Bangladesh.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/courses"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary/90"
                  >
                    View All Courses
                    <ArrowRightIcon size={14} />
                  </Link>
                  <div className="flex items-center gap-2">
                    <a
                      href="https://youtube.com/@tanvirhasanjibon5827"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-0 px-4 text-sm font-semibold text-ink-900 hover:bg-surface-1"
                    >
                      YouTube
                    </a>
                    <a
                      href="https://facebook.com/mdtanvirhasan.jibon"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-outline-variant bg-surface-0 px-4 text-sm font-semibold text-ink-900 hover:bg-surface-1"
                    >
                      Facebook
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-primary py-14 sm:py-20">
        <Container size="md" className="text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-on-primary sm:text-4xl">
            বিজ্ঞান ও আইসিটি শিক্ষার পরিকল্পিত পথ — InsideJibon
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-on-primary/80 sm:text-base">
            বিনামূল্যে অ্যাকাউন্ট তৈরি করুন এবং পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, আইসিটি ও
            উচ্চতর গণিতের সুশৃঙ্খল পাঠ শুরু করুন।
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface-0 px-6 text-base font-semibold text-primary hover:bg-surface-1"
            >
              Get Started Free
              <ArrowRightIcon size={16} />
            </Link>
            <Link
              href="/courses"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-on-primary/30 bg-transparent px-6 text-base font-semibold text-on-primary hover:bg-white/10"
            >
              Browse Courses
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
