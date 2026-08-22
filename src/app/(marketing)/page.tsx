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
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-tight">
                Learn with structure.<br />
                Practice with purpose.<br />
                Improve with confidence.
                <span className="block h-1 w-24 bg-primary mt-6 rounded-full"></span>
              </h1>
              <p className="text-xl sm:text-2xl font-medium text-secondary">
                এসএসসি, এইচএসসি ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির জন্য একটি পূর্ণাঙ্গ প্ল্যাটফর্ম।
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <Link
                  href="/courses"
                  className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-base font-semibold text-on-primary shadow-sm hover:bg-primary-container hover:text-on-primary-container transition-colors"
                >
                  Explore Courses
                </Link>
                <a
                  href="#instructor"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-6 py-3 text-base font-semibold text-primary hover:bg-surface-container-low transition-colors"
                >
                  Meet Instructor
                </a>
              </div>
            </div>
            
            <div className="relative w-full max-w-md mx-auto lg:mx-0 lg:ml-auto">
              <div className="bento-card overflow-hidden shadow-academic-lg relative aspect-[4/5]">
                <Image 
                  src="/jibon.jpg" 
                  alt="Tanvir Hasan Jibon" 
                  fill 
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <h3 className="font-display text-2xl font-bold">Tanvir Hasan Jibon</h3>
                  <p className="text-sm text-gray-300">Physics, Chemistry, Biology & Math Educator</p>
                  <div className="flex gap-2 mt-3">
                    <span className="px-2 py-1 bg-white/20 backdrop-blur rounded text-xs font-medium">⚛️ Physics</span>
                    <span className="px-2 py-1 bg-white/20 backdrop-blur rounded text-xs font-medium">🧪 Chemistry</span>
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
              <span className="text-3xl font-bold text-primary">10+</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Courses</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-primary">100%</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Free Access</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-primary">Board</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Standard Exams</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-primary">4</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary mt-2">Science Subjects</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Curricula Section */}
      <section className="w-full py-20 bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-primary">Featured Curricula</h2>
            <p className="text-secondary mt-2">বিষয়ভিত্তিক কোর্সসমূহ</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bento-card p-6 bg-blue-50 border-blue-200">
              <div className="text-4xl mb-4">⚛️</div>
              <h3 className="font-display text-xl font-bold text-gray-900">Physics · পদার্থবিজ্ঞান</h3>
              <p className="text-gray-700 mt-2">Master mechanics, electromagnetism, and modern physics.</p>
              <Link href="/courses?subject=physics" className="inline-block mt-4 text-sm font-semibold text-blue-700 hover:underline">View Courses →</Link>
            </div>
            <div className="bento-card p-6 bg-amber-50 border-amber-200">
              <div className="text-4xl mb-4">🧪</div>
              <h3 className="font-display text-xl font-bold text-gray-900">Chemistry · রসায়ন</h3>
              <p className="text-gray-700 mt-2">Understand organic, inorganic, and physical chemistry deeply.</p>
              <Link href="/courses?subject=chemistry" className="inline-block mt-4 text-sm font-semibold text-amber-700 hover:underline">View Courses →</Link>
            </div>
            <div className="bento-card p-6 bg-emerald-50 border-emerald-200">
              <div className="text-4xl mb-4">🧬</div>
              <h3 className="font-display text-xl font-bold text-gray-900">Biology · জীববিজ্ঞান</h3>
              <p className="text-gray-700 mt-2">Explore the wonders of life, genetics, and ecology.</p>
              <Link href="/courses?subject=biology" className="inline-block mt-4 text-sm font-semibold text-emerald-700 hover:underline">View Courses →</Link>
            </div>
            <div className="bento-card p-6 bg-purple-50 border-purple-200">
              <div className="text-4xl mb-4">📐</div>
              <h3 className="font-display text-xl font-bold text-gray-900">Mathematics · গণিত</h3>
              <p className="text-gray-700 mt-2">Build strong foundations in calculus, algebra, and geometry.</p>
              <Link href="/courses?subject=math" className="inline-block mt-4 text-sm font-semibold text-purple-700 hover:underline">View Courses →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* The InsideJibon Method */}
      <section className="w-full border-y border-outline-variant bg-surface-container-lowest py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl font-bold text-primary">পরিকল্পিত শিক্ষার পদ্ধতি · The InsideJibon Method</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container text-2xl font-bold mb-6">
                1
              </div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-3">কাঠামোগত পাঠদান<br/>Learn with Structure</h3>
              <p className="text-secondary">Meticulously planned video lectures and comprehensive lecture sheet materials.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container text-2xl font-bold mb-6">
                2
              </div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-3">লক্ষ্যভিত্তিক অনুশীলন<br/>Practice with Purpose</h3>
              <p className="text-secondary">Board-standard MCQ and written exam engine with instant auto-grading.</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container text-2xl font-bold mb-6">
                3
              </div>
              <h3 className="font-display text-xl font-bold text-on-surface mb-3">আত্মবিশ্বাসী উন্নতি<br/>Improve with Confidence</h3>
              <p className="text-secondary">Assignment feedback, performance tracking, and direct lesson discussion.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Instructor Spotlight */}
      <section id="instructor" className="w-full py-20 bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="bento-card-static p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-4 relative aspect-[4/5] rounded-2xl overflow-hidden shadow-academic">
                <Image 
                  src="/jibon.jpg" 
                  alt="Tanvir Hasan Jibon" 
                  fill 
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white/90 backdrop-blur p-3 rounded-lg text-center">
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
                  <p className="text-secondary mt-1 font-medium">শিক্ষার্থী, উদ্ভিদবিজ্ঞান বিভাগ — ঢাকা সেন্ট্রাল ইউনিভার্সিটি (সরকারি তিতুমীর কলেজ)</p>
                  <p className="text-primary font-semibold mt-2">বিজ্ঞান ও গণিত শিক্ষক · Physics, Chemistry, Biology & Mathematics Educator</p>
                </div>
                
                <div className="space-y-4 text-on-surface-variant leading-relaxed">
                  <p>
                    Passionate about making complex scientific concepts accessible to every student. With years of experience guiding students through SSC, HSC, and University Admission preparations, I believe in building a strong foundation rather than rote memorization.
                  </p>
                  <p>
                    My teaching methodology focuses on structural understanding and consistent practice. Through InsideJibon, I aim to provide high-quality education to all students across Bangladesh.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <div className="text-2xl mb-2">⚛️</div>
                    <h4 className="font-semibold text-on-surface">Physics</h4>
                    <p className="text-xs text-secondary mt-1">Conceptual clarity in mechanics & modern physics.</p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <div className="text-2xl mb-2">🧪</div>
                    <h4 className="font-semibold text-on-surface">Chemistry</h4>
                    <p className="text-xs text-secondary mt-1">Mastering reactions and chemical equations.</p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <div className="text-2xl mb-2">🧬</div>
                    <h4 className="font-semibold text-on-surface">Biology</h4>
                    <p className="text-xs text-secondary mt-1">In-depth exploration of life sciences.</p>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <div className="text-2xl mb-2">📐</div>
                    <h4 className="font-semibold text-on-surface">Mathematics</h4>
                    <p className="text-xs text-secondary mt-1">Problem-solving strategies and core concepts.</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <a href="https://youtube.com/@tanvirhasanjibon5827" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition-colors">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    YouTube
                  </a>
                  <a href="https://facebook.com/mdtanvirhasan.jibon" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium transition-colors">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
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
          <h2 className="font-display text-3xl font-bold text-on-primary mb-4">বিজ্ঞান শিক্ষার পরিকল্পিত পথ — InsideJibon</h2>
          <p className="text-on-primary/90 text-lg mb-8 max-w-2xl mx-auto">
            বিনামূল্যে অ্যাকাউন্ট তৈরি করুন এবং পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান ও গণিতের সুশৃঙ্খল পাঠ শুরু করুন।
          </p>
          <Link href="/sign-up" className="inline-flex items-center justify-center rounded-lg bg-white px-8 py-4 text-lg font-bold text-primary shadow-sm hover:bg-gray-100 transition-colors">
            Get Started Free / শুরু করুন
          </Link>
        </div>
      </section>
    </div>
  );
}