import Link from "next/link";

const features = [
  {
    title: "কোর্স ও লেসন",
    subtitle: "Courses & Lessons",
    description:
      "সাজানো মডিউল আর লেসনে শিখুন — নিজের গতিতে, নিজের সময়ে।",
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    title: "পরীক্ষা ও মূল্যায়ন",
    subtitle: "Exams & Assessment",
    description:
      "অনলাইন পরীক্ষা দিন, উত্তর যাচাই হোক, ফলাফল জানুন তৎক্ষণাৎ।",
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "অগ্রগতি ট্র্যাকিং",
    subtitle: "Progress Tracking",
    description:
      "প্রতিটি লেসন, পরীক্ষা আর অ্যাসাইনমেন্টের অগ্রগতি এক জায়গায়।",
    icon: (
      <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function HomePage() {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-4 inline-block rounded-full border border-outline-variant bg-surface-container-low px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              Learn · Practice · Perform
            </p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-on-surface sm:text-5xl">
              জ্ঞানের ভেতরে,{" "}
              <span className="text-primary">শেখার যাত্রা</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed text-on-surface-variant sm:text-lg">
              কোর্স, পরীক্ষা, রিসোর্স আর অগ্রগতি — শিক্ষার্থী ও শিক্ষকের
              জন্য সবকিছু এক জায়গায়। InsideJibon-এ জটিল বিষয়গুলো শেখা হয় সহজ, ধারাবাহিক ও ফলপ্রসূ পদ্ধতিতে।
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/courses"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-on-primary shadow-xs transition-colors hover:bg-primary-container hover:text-on-primary-container"
              >
                <span>কোর্সসমূহ দেখুন</span>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <a
                href="#instructor"
                className="inline-flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low px-6 py-3.5 text-sm font-semibold text-secondary transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                শিক্ষক পরিচিতি
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
                    Lead Educator
                  </span>
                  <h3 className="mt-1 text-sm font-bold text-on-surface">
                    তানভীর হাসান জীবন
                  </h3>
                  <p className="text-xs text-secondary">
                    Govt. Titumir College
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-on-surface-variant border-t border-outline-variant/60 pt-3">
                উদ্ভিদবিজ্ঞান ও জীববিজ্ঞানের জটিল বিষয়গুলোর স্পষ্ট ও কাঠামোগত পাঠদান।
              </p>
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
              Platform Overview
            </span>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
              এক প্ল্যাটফর্মে পুরো শেখার চক্র
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              ধারাবাহিক পাঠ্যসূচি, লেকচার নোটস এবং স্বয়ংক্রিয় পরীক্ষার মাধ্যমে পূর্ণাঙ্গ প্রস্তুতি।
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
                  {feature.subtitle}
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
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              {/* Photo Column */}
              <div className="lg:col-span-4">
                <div className="relative mx-auto aspect-[4/5] max-w-xs overflow-hidden rounded-2xl border-2 border-outline-variant bg-surface-container-high shadow-md">
                  <img
                    src="/jibon.jpg"
                    alt="Tanvir Hasan Jibon - InsideJibon Educator"
                    className="h-full w-full object-cover object-top"
                  />
                  <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-surface-container-lowest/90 px-3 py-2 text-center backdrop-blur-xs border border-outline-variant">
                    <p className="text-xs font-bold text-primary">
                      Tanvir Hasan Jibon
                    </p>
                    <p className="text-[10px] text-secondary">
                      Department of Botany
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio & Details Column */}
              <div className="space-y-4 lg:col-span-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>শিক্ষক পরিচিতি · Meet Your Instructor</span>
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
                  তানভীর হাসান জীবন
                </h2>
                <p className="text-sm font-semibold text-secondary sm:text-base">
                  শিক্ষার্থী, উদ্ভিদবিজ্ঞান বিভাগ — সরকারি তিতুমীর কলেজ, ঢাকা (DU Affiliated)
                </p>

                <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">
                  InsideJibon প্ল্যাটফর্মে শিক্ষার্থীদের বিজ্ঞান ও জীববিজ্ঞানের গভীর বিষয়সমূহ সহজ ও আকর্ষণীয়ভাবে শেখানো হয়। প্রতিটি ক্লাসে তাত্ত্বিক ধারণার পাশাপাশি পর্যাপ্ত চিত্র, নোটস ও অনুশীলনী প্রদান করা হয় যাতে শিক্ষার্থীরা বোর্ড এবং ভর্তি পরীক্ষায় সেরা ফলাফল করতে পারে।
                </p>

                {/* Highlights */}
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-2xs">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">উদ্ভিদবিজ্ঞান বিভাগ</p>
                      <p className="text-[11px] text-secondary">সরকারি তিতুমীর কলেজ</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-2xs">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">পরিকল্পিত পাঠদান</p>
                      <p className="text-[11px] text-secondary">নোটস, শিট ও পরীক্ষা</p>
                    </div>
                  </div>
                </div>

                {/* Social & Channel Links (Extensible Placeholders) */}
                <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-outline-variant">
                  <span className="text-xs font-medium text-secondary">
                    সংযুক্ত থাকুন:
                  </span>

                  {/* YouTube Channel Link/Placeholder */}
                  <a
                    href="https://youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-red-500/40 hover:text-red-600 shadow-2xs"
                  >
                    <svg className="h-4 w-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    <span>YouTube Channel</span>
                  </a>

                  {/* Facebook Profile/Page Link/Placeholder */}
                  <a
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-blue-500/40 hover:text-blue-600 shadow-2xs"
                  >
                    <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span>Facebook</span>
                  </a>

                  <Link
                    href="/courses"
                    className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
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