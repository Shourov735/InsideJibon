import Link from "next/link";
import { getTranslator } from "@/i18n/server";

export default async function HomePage() {
  const t = await getTranslator();
  const features = [
    {
      eyebrow: t("marketing.feature1Subtitle"),
      title: t("marketing.feature1Title"),
      description: t("marketing.feature1Desc"),
      icon: (
        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      eyebrow: t("marketing.feature2Subtitle"),
      title: t("marketing.feature2Title"),
      description: t("marketing.feature2Desc"),
      icon: (
        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      eyebrow: t("marketing.feature3Subtitle"),
      title: t("marketing.feature3Title"),
      description: t("marketing.feature3Desc"),
      icon: (
        <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 inline-block rounded-full border border-outline-variant bg-surface-container-low px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              {t("marketing.heroBadge")}
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-on-surface sm:text-5xl">
              {t("marketing.heroTitleA")}{" "}
              <span className="text-primary">{t("marketing.heroTitleB")}</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {t("marketing.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
              >
                <span>{t("marketing.heroCta")}</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <a
                href="#instructor"
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-6 py-3.5 text-sm font-semibold text-secondary transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                {t("marketing.heroSecondaryCta")}
              </a>
            </div>
          </div>

          {/* Quick Hero Banner / Instructor Teaser Card */}
          <div className="w-full lg:max-w-sm">
            <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-low p-6 shadow-xs">
              <div className="flex items-center gap-4">
                <img
                  src="/jibon.jpg"
                  alt="Tanvir Hasan Jibon"
                  className="h-16 w-16 rounded-xl border border-outline-variant object-cover shadow-2xs"
                />
                <div>
                  <span className="rounded bg-primary-container px-2 py-0.5 text-[10px] font-bold text-on-primary-container uppercase">
                    {t("marketing.leadEducator")}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-on-surface">
                    তানভীর হাসান জীবন
                  </h3>
                  <p className="text-xs text-secondary">
                    Dhaka Central University
                  </p>
                  <p className="text-[11px] text-on-surface-variant/80">
                    (Govt. Titumir College)
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-outline-variant/60 pt-3">
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-primary">পদার্থবিজ্ঞান</span>
                  <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-primary">রসায়ন</span>
                  <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-primary">জীববিজ্ঞান</span>
                  <span className="rounded-md bg-surface-container-high px-2 py-0.5 text-[11px] font-medium text-primary">গণিত</span>
                </div>
                <p className="text-xs leading-relaxed text-on-surface-variant">
                  পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান ও গণিতের মৌলিক ধারণা এবং বোর্ড পরীক্ষার সুশৃঙ্খল পাঠদান।
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section
        id="features"
        className="border-b border-outline-variant bg-surface py-16 sm:py-24"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="max-w-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {t("marketing.featuresEyebrow")}
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {t("marketing.featuresTitle")}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              {t("marketing.featuresSubtitle")}
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xs transition-all hover:border-primary/30 hover:shadow-xs"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container-high border border-outline-variant/50">
                  {feature.icon}
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">
                  {feature.eyebrow}
                </p>
                <h3 className="mt-1.5 text-lg font-bold text-on-surface">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Instructor Section / শিক্ষক পরিচিতি */}
      <section
        id="instructor"
        className="bg-surface-container-lowest py-16 sm:py-24"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl border border-outline-variant bg-surface-container-low p-6 sm:p-10 lg:p-12 shadow-xs">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
              {/* Photo Column */}
              <div className="lg:col-span-4">
                <div className="relative mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-2xl border-2 border-outline-variant bg-surface-container-high shadow-md">
                  <img
                    src="/jibon.jpg"
                    alt="Tanvir Hasan Jibon - InsideJibon Educator"
                    className="h-full w-full object-cover object-top"
                  />
                  <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-surface-container-lowest/95 px-3.5 py-2.5 text-center backdrop-blur-xs border border-outline-variant shadow-xs">
                    <p className="text-xs font-bold text-primary">
                      Tanvir Hasan Jibon
                    </p>
                    <p className="text-[10px] font-medium text-secondary">
                      Dhaka Central University
                    </p>
                    <p className="text-[9px] text-on-surface-variant">
                      (Govt. Titumir College)
                    </p>
                  </div>
                </div>

                {/* Direct Channel & Social Cards */}
                <div className="mt-4 space-y-2.5 max-w-xs mx-auto">
                  <a
                    href="https://youtube.com/@tanvirhasanjibon5827"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-xs font-medium text-on-surface transition-all hover:border-red-500/50 hover:bg-surface hover:shadow-xs group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-on-surface truncate">YouTube Channel</p>
                      <p className="text-[11px] text-secondary truncate">@tanvirhasanjibon5827</p>
                    </div>
                    <svg className="h-4 w-4 text-outline shrink-0 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>

                  <a
                    href="https://facebook.com/mdtanvirhasan.jibon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-xs font-medium text-on-surface transition-all hover:border-blue-500/50 hover:bg-surface hover:shadow-xs group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-on-surface truncate">Facebook Profile</p>
                      <p className="text-[11px] text-secondary truncate">mdtanvirhasan.jibon</p>
                    </div>
                    <svg className="h-4 w-4 text-outline shrink-0 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Bio & Details Column */}
              <div className="space-y-5 lg:col-span-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>শিক্ষক পরিচিতি · Meet Your Instructor</span>
                  </div>

                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                    তানভীর হাসান জীবন (Tanvir Hasan Jibon)
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-primary sm:text-base">
                    শিক্ষার্থী, উদ্ভিদবিজ্ঞান বিভাগ — ঢাকা সেন্ট্রাল ইউনিভার্সিটি (সরকারি তিতুমীর কলেজ)
                  </p>
                  <p className="text-xs text-secondary mt-0.5">
                    বিজ্ঞান ও গণিত শিক্ষক · Physics, Chemistry, Biology & Mathematics Educator
                  </p>
                </div>

                <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
                  তানভীর হাসান জীবন ঢাকা সেন্ট্রাল ইউনিভার্সিটির (সরকারি তিতুমীর কলেজ) শিক্ষার্থী এবং একজন একনিষ্ঠ বিজ্ঞান শিক্ষক। তিনি মাধ্যমিক ও উচ্চ মাধ্যমিক (SSC & HSC) পর্যায়ের শিক্ষার্থীদের <strong>পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান এবং গণিত (Physics, Chemistry, Biology & Math)</strong> অত্যন্ত যত্ন ও কাঠামোগত পদ্ধতিতে পাঠদান করান।
                </p>

                <p className="text-sm leading-relaxed text-on-surface-variant">
                  InsideJibon প্ল্যাটফর্মে বিজ্ঞান শিক্ষার প্রতিটি অধ্যায় তাত্ত্বিক বিশ্লেষণ, অ্যানিমেশন ও চিত্রনির্ভর ব্যাখ্যা, এক্সক্লুসিভ নোটস এবং স্ট্যান্ডার্ড পরীক্ষার সমন্বয়ে সাজানো হয়েছে — যাতে শিক্ষার্থীরা প্রতিটি ধারণার গভীরে পৌঁছাতে পারে এবং যেকোনো পরীক্ষায় সেরা ফলাফল অর্জন করতে পারে।
                </p>

                {/* 4 Subjects Taught Grid */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-secondary mb-3">
                    পাঠদানের বিষয়সমূহ · Subjects Taught
                  </h3>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2 font-bold text-sm text-on-surface">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-800 text-xs">⚛️</span>
                        <span>পদার্থবিজ্ঞান (Physics)</span>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        গতিবিদ্যা, বলবিদ্যা, কাজ-শক্তি, তড়িৎ ও গাণিতিক সমস্যার সুস্পষ্ট সমাধান।
                      </p>
                    </div>

                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2 font-bold text-sm text-on-surface">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-xs">🧪</span>
                        <span>রসায়ন (Chemistry)</span>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        মৌলের পর্যায়বৃত্ত ধর্ম, রাসায়নিক গণনা, বিক্রিয়ার কৌশল ও জৈব রসায়ন।
                      </p>
                    </div>

                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2 font-bold text-sm text-on-surface">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 text-xs">🧬</span>
                        <span>জীববিজ্ঞান (Biology)</span>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        উদ্ভিদবিজ্ঞান, প্রাণিবিজ্ঞান ও সচিত্র শারীরিক প্রক্রিয়ার বোধগম্য উপস্থাপন।
                      </p>
                    </div>

                    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 shadow-2xs">
                      <div className="flex items-center gap-2 font-bold text-sm text-on-surface">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-800 text-xs">📐</span>
                        <span>গণিত (Mathematics)</span>
                      </div>
                      <p className="mt-1 text-xs text-on-surface-variant">
                        বীজগণিত, ত্রিকোণমিতি, জ্যামিতি ও উচ্চতর গণিতের শর্টকাট ও বেসিক ধারণা।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Highlights / Key Features */}
                <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-2xs">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">ঢাকা সেন্ট্রাল ইউনিভার্সিটি</p>
                      <p className="text-[11px] text-secondary">সরকারি তিতুমীর কলেজ · উদ্ভিদবিজ্ঞান</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-2xs">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">পরিকল্পিত পাঠদান ও পরীক্ষা</p>
                      <p className="text-[11px] text-secondary">লেকচার শিট, হ্যান্ডনোট ও মূল্যায়ন</p>
                    </div>
                  </div>
                </div>

                {/* Footer Navigation within Instructor Section */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-outline-variant">
                  <span className="text-xs text-secondary">
                    বিজ্ঞান শিক্ষার সহজ ও সঠিক পথ — InsideJibon
                  </span>

                  <Link
                    href="/courses"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-2xs"
                  >
                    <span>সকল কোর্স দেখুন</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}