import Link from "next/link";
import Image from "next/image";

export default function MarketingPage() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-surface py-20 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col gap-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/10 border border-primary/20 text-xs font-semibold text-primary w-fit">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                বিজ্ঞান ও আইসিটি শিক্ষার পরিকল্পিত প্ল্যাটফর্ম
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-tight">
                Learn with structure.<br />
                Practice with purpose.<br />
                Improve with confidence.
                <span className="block h-1.5 w-24 bg-primary mt-6 rounded-full"></span>
              </h1>
              <p className="text-lg sm:text-xl font-medium text-secondary leading-relaxed">
                এসএসসি, এইচএসসি ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির জন্য পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, আইসিটি ও উচ্চতর গণিতের পূর্ণাঙ্গ একাডেমিক প্ল্যাটফর্ম।
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-all hover:shadow-md"
                >
                  Explore Courses / কোর্সসমূহ
                </Link>
                <a
                  href="#instructor"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-6 py-3.5 text-base font-semibold text-primary hover:bg-surface-container-low transition-colors"
                >
                  Meet Instructor
                </a>
              </div>
            </div>
            
            <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <div className="bento-card overflow-hidden shadow-academic-lg relative aspect-[4/5] rounded-2xl border border-outline-variant">
                <Image 
                  src="/jibon.jpg" 
                  alt="Tanvir Hasan Jibon" 
                  fill 
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Lead Educator</span>
                  <h3 className="font-display text-2xl font-bold mt-1">Tanvir Hasan Jibon</h3>
                  <p className="text-xs text-gray-300 mt-0.5">Science & Mathematics Educator</p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-[11px] font-medium">⚛️ Physics</span>
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-[11px] font-medium">🧪 Chemistry</span>
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-[11px] font-medium">🧬 Biology</span>
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-[11px] font-medium">💻 ICT</span>
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur rounded text-[11px] font-medium">📐 Math</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Trust Banner */}
      <section className="w-full border-y border-outline-variant bg-surface-container-low py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-outline-variant text-center">
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-primary">5</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Core Academic Subjects</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-primary">50+</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Structured Lectures</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-primary">Board</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Standard Curriculum</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-4xl font-bold text-primary">100%</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Open & Structured Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Curricula Section */}
      <section className="w-full py-20 bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-xs font-semibold text-secondary uppercase tracking-wider mb-3">
              Curriculum Discovery
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary">বিষয়ভিত্তিক পূর্ণাঙ্গ পাঠ্যক্রম</h2>
            <p className="text-secondary mt-2 text-base max-w-2xl mx-auto">
              এসএসসি ও এইচএসসি শিক্ষার্থীদের প্রতিটি অধ্যায় ও গাণিতিক সমস্যা সহজভাবে অনুধাবনের জন্য বিশেষভাবে সাজানো কোর্সসমূহ।
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Physics */}
            <div className="bento-card group flex flex-col overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                <Image
                  src="/images/courses/physics-cover.jpg"
                  alt="Physics Cover"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className="rounded bg-blue-600/90 text-white px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur">
                    Physics
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 text-white">
                  <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">পদার্থবিজ্ঞান</span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    HSC Physics Masterclass
                  </h3>
                  <p className="text-sm text-secondary mt-1.5 line-clamp-2">
                    ভেক্টর, দ্বিমাত্রিক গতি, কাজ-শক্তি, তড়িৎ এবং কোয়ান্টাম বলবিদ্যার গভীর ও বিশ্লেষণধর্মী আলোচনা।
                  </p>
                </div>
                <Link
                  href="/courses?category=physics"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-container"
                >
                  View Physics Courses →
                </Link>
              </div>
            </div>

            {/* Chemistry */}
            <div className="bento-card group flex flex-col overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                <Image
                  src="/images/courses/chemistry-cover.jpg"
                  alt="Chemistry Cover"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className="rounded bg-amber-600/90 text-white px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur">
                    Chemistry
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 text-white">
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">রসায়ন</span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    HSC Chemistry Complete Foundation
                  </h3>
                  <p className="text-sm text-secondary mt-1.5 line-clamp-2">
                    গুণগত রসায়ন, পর্যায়বৃত্ত ধর্ম, রাসায়নিক পরিবর্তন এবং জৈব রসায়নের রিঅ্যাকশন মেকানিজম।
                  </p>
                </div>
                <Link
                  href="/courses?category=chemistry"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-container"
                >
                  View Chemistry Courses →
                </Link>
              </div>
            </div>

            {/* Biology */}
            <div className="bento-card group flex flex-col overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                <Image
                  src="/images/courses/biology-cover.jpg"
                  alt="Biology Cover"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className="rounded bg-emerald-600/90 text-white px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur">
                    Biology
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 text-white">
                  <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">জীববিজ্ঞান</span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    HSC Biology Botany & Zoology Explorer
                  </h3>
                  <p className="text-sm text-secondary mt-1.5 line-clamp-2">
                    উদ্ভিদবিজ্ঞান, মানব শারীরতত্ত্ব, কোষ বিভাজন এবং মেডিকেল ও বিশ্ববিদ্যালয়ের ভর্তি প্রস্তুতি।
                  </p>
                </div>
                <Link
                  href="/courses?category=biology"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-container"
                >
                  View Biology Courses →
                </Link>
              </div>
            </div>

            {/* ICT */}
            <div className="bento-card group flex flex-col overflow-hidden">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
                <Image
                  src="/images/courses/ict-cover.jpg"
                  alt="ICT Cover"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className="rounded bg-cyan-600/90 text-white px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur">
                    ICT
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 text-white">
                  <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wide">তথ্য ও যোগাযোগ প্রযুক্তি</span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                    HSC ICT & Computer Science Accelerator
                  </h3>
                  <p className="text-sm text-secondary mt-1.5 line-clamp-2">
                    সংখ্যা পদ্ধতি, ডিজিটাল লজিক গেট, HTML ওয়েব ডিজাইন এবং সি প্রোগ্রামিং ভাষার পূর্ণাঙ্গ হ্যান্ডস-অন কোডিং।
                  </p>
                </div>
                <Link
                  href="/courses?category=ict"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-container"
                >
                  View ICT Courses →
                </Link>
              </div>
            </div>

            {/* Mathematics */}
            <div className="bento-card group flex flex-col overflow-hidden md:col-span-2 lg:col-span-2">
              <div className="relative aspect-[21/9] overflow-hidden bg-slate-900">
                <Image
                  src="/images/courses/math-cover.jpg"
                  alt="Mathematics Cover"
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
                <div className="absolute top-3 right-3">
                  <span className="rounded bg-purple-600/90 text-white px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur">
                    Mathematics
                  </span>
                </div>
                <div className="absolute bottom-4 left-5 text-white">
                  <span className="text-xs font-semibold text-purple-300 uppercase tracking-wide">উচ্চতর গণিত</span>
                  <h3 className="font-display text-xl font-bold mt-0.5">
                    HSC Higher Mathematics — Calculus & Coordinate Geometry
                  </h3>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <p className="text-sm text-secondary max-w-xl">
                  ম্যাট্রিক্স, সরলরেখা, ত্রিকোণমিতি, অন্তরীকরণ ও যোগজীকরণ ক্যালকুলাসের শর্টকাট কৌশল ও সমাধান।
                </p>
                <Link
                  href="/courses?category=mathematics"
                  className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-container whitespace-nowrap"
                >
                  View Mathematics Courses →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The InsideJibon Method */}
      <section className="w-full border-y border-outline-variant bg-surface-container-lowest py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container/10 text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              Learning Architecture
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary">পরিকল্পিত শিক্ষার পদ্ধতি · The InsideJibon Method</h2>
            <p className="text-secondary mt-2 text-base max-w-xl mx-auto">
              বিজ্ঞান শিক্ষাকে কার্যকর ও আত্মবিশ্বাসী করতে একটি সমন্বিত তিন ধাপের শিক্ষণ পদ্ধতি।
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bento-card p-6 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary text-xl font-bold mb-5 shadow-sm">
                1
              </div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-2">কাঠামোগত পাঠদান<br/><span className="text-sm font-normal text-secondary">Learn with Structure</span></h3>
              <p className="text-secondary text-sm leading-relaxed">Meticulously planned video lectures and comprehensive lecture sheet materials.</p>
            </div>

            <div className="bento-card p-6 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary text-xl font-bold mb-5 shadow-sm">
                2
              </div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-2">লক্ষ্যভিত্তিক অনুশীলন<br/><span className="text-sm font-normal text-secondary">Practice with Purpose</span></h3>
              <p className="text-secondary text-sm leading-relaxed">Board-standard MCQ and written exam engine with instant auto-grading.</p>
            </div>

            <div className="bento-card p-6 flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-on-primary text-xl font-bold mb-5 shadow-sm">
                3
              </div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-2">আত্মবিশ্বাসী উন্নতি<br/><span className="text-sm font-normal text-secondary">Improve with Confidence</span></h3>
              <p className="text-secondary text-sm leading-relaxed">Assignment feedback, performance tracking, and direct lesson discussion.</p>
            </div>
          </div>

          {/* Visual Learning Banner */}
          <div className="relative rounded-2xl overflow-hidden shadow-academic-lg border border-outline-variant aspect-[21/9] sm:aspect-[24/9]">
            <Image
              src="/images/learning-banner.jpg"
              alt="InsideJibon Student Study Experience"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/50 to-transparent flex items-center p-8 sm:p-12">
              <div className="max-w-md text-white">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">Modern Digital Learning</span>
                <h3 className="font-display text-2xl sm:text-3xl font-bold mt-1">স্ট্রাকচার্ড লার্নিং ও পরীক্ষা প্রস্তুতি</h3>
                <p className="text-sm text-gray-200 mt-2">
                  প্রতিটি লেসনের সাথে থাকছে লেকচার শিট, হ্যান্ড নোটস এবং অধ্যায়ভিত্তিক স্পেশাল মডেল টেস্ট।
                </p>
                <Link
                  href="/courses"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-bold text-primary hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Start Learning Now →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Spotlight */}
      <section id="instructor" className="w-full py-20 bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="bento-card-static p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-4 relative aspect-[4/5] rounded-2xl overflow-hidden shadow-academic border border-outline-variant">
                <Image 
                  src="/jibon.jpg" 
                  alt="Tanvir Hasan Jibon" 
                  fill 
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/95 backdrop-blur p-3 rounded-lg text-center shadow-sm">
                    <span className="text-primary font-bold font-display">Tanvir Hasan Jibon</span>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-8 flex flex-col gap-6">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-high text-xs font-semibold text-secondary w-fit">
                  শিক্ষক পরিচিতি · Meet Your Instructor
                </div>
                
                <div>
                  <h2 className="text-3xl font-bold font-display text-primary">তানভীর হাসান জীবন (Tanvir Hasan Jibon)</h2>
                  <p className="text-secondary mt-1 font-medium">শিক্ষার্থী, উদ্ভিদবিজ্ঞান বিভাগ — ঢাকা সেন্ট্রাল ইউনিভার্সিটি </p>
                  <p className="text-primary font-semibold mt-2">বিজ্ঞান, আইসিটি ও গণিত শিক্ষক · Physics, Chemistry, Biology, ICT & Mathematics Educator</p>
                </div>
                
                <div className="space-y-4 text-on-surface-variant leading-relaxed">
                  <p>
                    Passionate about making complex scientific concepts accessible to every student. With years of experience guiding students through SSC, HSC, and University Admission preparations, I believe in building a strong foundation rather than rote memorization.
                  </p>
                  <p>
                    My teaching methodology focuses on structural understanding and consistent practice. Through InsideJibon, I aim to provide high-quality education to all students across Bangladesh.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/50">
                    <div className="text-xl mb-1">⚛️</div>
                    <h4 className="font-bold text-sm text-on-surface">Physics</h4>
                    <p className="text-[11px] text-secondary mt-0.5">Mechanics & Modern Physics</p>
                  </div>
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/50">
                    <div className="text-xl mb-1">🧪</div>
                    <h4 className="font-bold text-sm text-on-surface">Chemistry</h4>
                    <p className="text-[11px] text-secondary mt-0.5">Organic & Inorganic Mastery</p>
                  </div>
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/50">
                    <div className="text-xl mb-1">🧬</div>
                    <h4 className="font-bold text-sm text-on-surface">Biology</h4>
                    <p className="text-[11px] text-secondary mt-0.5">Botany & Zoology Explorer</p>
                  </div>
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/50">
                    <div className="text-xl mb-1">💻</div>
                    <h4 className="font-bold text-sm text-on-surface">ICT</h4>
                    <p className="text-[11px] text-secondary mt-0.5">C Coding & Logic Design</p>
                  </div>
                  <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/50 sm:col-span-2">
                    <div className="text-xl mb-1">📐</div>
                    <h4 className="font-bold text-sm text-on-surface">Higher Mathematics</h4>
                    <p className="text-[11px] text-secondary mt-0.5">Calculus, Trigonometry & Coordinate Geometry</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <a href="https://youtube.com/@tanvirhasanjibon5827" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors text-sm">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    YouTube
                  </a>
                  <a href="https://facebook.com/mdtanvirhasan.jibon" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors text-sm">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    Facebook
                  </a>
                  <Link href="/courses" className="ml-auto inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors">
                    সকল কোর্স দেখুন → View All Courses
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="w-full bg-primary py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-on-primary mb-4">বিজ্ঞান ও আইসিটি শিক্ষার পরিকল্পিত পথ — InsideJibon</h2>
          <p className="text-on-primary/90 text-lg mb-8 max-w-2xl mx-auto">
            বিনামূল্যে অ্যাকাউন্ট তৈরি করুন এবং পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, আইসিটি ও উচ্চতর গণিতের সুশৃঙ্খল পাঠ শুরু করুন।
          </p>
          <Link href="/sign-up" className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-lg font-bold text-primary shadow-sm hover:bg-gray-100 transition-colors">
            Get Started Free / শুরু করুন
          </Link>
        </div>
      </section>
    </div>
  );
}
