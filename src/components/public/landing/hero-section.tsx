import Link from "next/link";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon, PlayIcon } from "@/components/shared/ui/icons";
import { HeroInteractiveDashboard } from "./hero-interactive-dashboard";
import { NationalMonumentBackdrop } from "./national-monument-backdrop";

interface HeroSectionProps {
  isBn: boolean;
}

export function HeroSection({ isBn }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-[#FAF8F5] pt-10 pb-20 sm:pt-16 sm:pb-32 lg:pt-20 lg:pb-36 transition-colors duration-200">
      
      {/* Subtle warm atmospheric glow gradients */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-blue-100/60 via-amber-50/30 to-transparent blur-3xl"
      />

      <Container size="xl" className="relative z-10">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          
          {/* Left Column: Editorial Headline & Purpose */}
          <div className="flex flex-col items-start lg:col-span-6 xl:col-span-7">
            
            {/* Pill Eyebrow Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/90 bg-white/95 px-3.5 py-1 text-xs font-semibold text-blue-900 shadow-2xs backdrop-blur-sm">
              <span className="text-amber-500 font-bold">★</span>
              <span>
                {isBn ? "বাংলাদেশের আধুনিক শিক্ষা প্ল্যাটফর্ম" : "Bangladesh's Learning Platform"}
              </span>
            </div>

            {/* Main Editorial Headline */}
            <h1 className="mt-5 font-serif text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-[4rem] xl:text-[4.5rem] leading-[1.08] text-balance">
              {isBn ? (
                <>
                  উদ্দেশ্য নিয়ে শেখা।<br />
                  <span className="text-blue-600 font-serif">জীবনের</span> জন্য এগিয়ে যাওয়া।
                </>
              ) : (
                <>
                  Learn with purpose.<br />
                  <span className="text-blue-600 font-serif">Grow</span> for life.
                </>
              )}
            </h1>

            {/* Bengali Handwritten Calligraphic Accent */}
            <div className="mt-3 font-display text-2xl font-bold tracking-wide text-slate-800 sm:text-3xl">
              শিখি, জানি, এগিয়ে যাই
            </div>

            {/* Supporting Copy */}
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg sm:leading-relaxed">
              {isBn
                ? "পরিকল্পিত কোর্স, সরাসরি লাইভ ক্লাস, মডেল টেস্ট এবং শিক্ষকের হাতে-কলমে মূল্যায়ন — সব কিছু এক প্ল্যাটফর্মে, বাংলাদেশের শিক্ষার্থী ও শিক্ষকদের জন্য।"
                : "Structured courses, live classes, practice exams and more — all in one place, designed for Bangladeshi students and educators."}
            </p>

            {/* Call to Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href="/courses"
                className="inline-flex h-12 sm:h-13 items-center justify-center gap-2 rounded-full bg-blue-600 px-7 sm:px-8 text-sm sm:text-base font-bold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.98]"
              >
                <span>{isBn ? "কোর্সসমূহ দেখুন" : "Explore courses"}</span>
                <ArrowRightIcon size={16} />
              </Link>

              <a
                href="#experience"
                className="inline-flex h-12 sm:h-13 items-center justify-center gap-2 rounded-full border border-slate-300/80 bg-white/95 px-6 sm:px-7 text-sm sm:text-base font-semibold text-slate-800 shadow-2xs backdrop-blur-sm transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98]"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <PlayIcon size={12} className="ml-0.5" />
                </div>
                <span>{isBn ? "কীভাবে কাজ করে" : "See how it works"}</span>
              </a>
            </div>

            {/* Curriculum Alignment Seal */}
            <div className="mt-9 flex items-center gap-3 border-t border-slate-200/90 pt-4 text-xs font-semibold text-slate-600">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                {isBn
                  ? "এনসিটিবি (NCTB) অনুমোদিত জাতীয় শিক্ষাক্রম অনুসারে সুশৃঙ্খল পাঠদান"
                  : "National Curriculum & Textbook Board (NCTB) Aligned Curriculum"}
              </span>
            </div>

          </div>

          {/* Right Column: High-Fidelity Interactive Dashboard Mock-up */}
          <div className="lg:col-span-6 xl:col-span-5">
            <HeroInteractiveDashboard isBn={isBn} />
          </div>

        </div>
      </Container>

      {/* National Martyrs' Memorial (Jatiyo Sriti Soudho) Vector Artwork at Bottom of Hero */}
      <div className="absolute inset-x-0 bottom-0 z-0 h-48 sm:h-64 lg:h-72 pointer-events-none">
        <NationalMonumentBackdrop className="h-full w-full" />
      </div>

    </section>
  );
}
