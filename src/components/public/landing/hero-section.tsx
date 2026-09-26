import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon } from "@/components/shared/ui/icons";

interface HeroSectionProps {
  isBn: boolean;
}

export function HeroSection({ isBn }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden border-b border-outline-variant bg-surface-0 pt-8 pb-16 sm:pt-14 sm:pb-24 lg:pt-20 lg:pb-28">
      {/* Subtle architectural background grid - quiet, deliberate, academic */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,53,85,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,53,85,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
      />

      <Container size="xl" className="relative">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
          
          {/* Left Column: Editorial Statement & Narrative */}
          <div className="flex flex-col items-start lg:col-span-7">
            {/* Academic Eyebrow */}
            <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-1 px-3.5 py-1 text-xs font-semibold tracking-wide text-ink-700">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span>
                {isBn
                  ? "বিজ্ঞান ও আইসিটি শিক্ষার পরিকল্পিত একাডেমি"
                  : "Science & ICT Academic Learning Platform"}
              </span>
            </div>

            {/* Main Editorial Headline */}
            <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-5xl lg:text-6xl sm:leading-[1.1] text-balance">
              {isBn ? (
                <>
                  গভীর ধারণাগত স্পষ্টতা ও সুশৃঙ্খল পাঠদান।{" "}
                  <span className="text-primary font-normal">
                    বোর্ড ও ভর্তি পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি।
                  </span>
                </>
              ) : (
                <>
                  Rigorous Science &amp; ICT Education.{" "}
                  <span className="text-primary font-normal">
                    Engineered for HSC &amp; Admission Excellence.
                  </span>
                </>
              )}
            </h1>

            {/* Supporting Copy */}
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-500 sm:text-lg sm:leading-relaxed">
              {isBn
                ? "মুখস্থবিদ্যার বিভ্রান্তি পেরিয়ে প্রতিটি সূত্রের গভীর প্রতিপাদন, অধ্যায়ভিত্তিক পরিকল্পিত ভিডিও লেকচার, সময়াবদ্ধ বোর্ড স্ট্যান্ডার্ড পরীক্ষা এবং শিক্ষকের সরাসরি মূল্যায়নে নিজেকে প্রস্তুত করুন।"
                : "InsideJibon is built to replace rote memorization with fundamental intuition. Chapter-sequenced lecture modules, timed examinations with auto-grading, handwritten assignment review, and personalized educator guidance."}
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/courses"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-on-primary shadow-sm transition-all hover:bg-primary/95 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                <span>{isBn ? "কোর্সসমূহ দেখুন" : "Explore Courses"}</span>
                <ArrowRightIcon size={16} />
              </Link>

              <a
                href="#method"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-outline-variant bg-surface-0 px-6 text-sm font-semibold text-ink-700 transition-colors hover:bg-surface-1 hover:text-ink-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink-700 focus-visible:outline-offset-2"
              >
                {isBn ? "আমাদের শিক্ষাপদ্ধতি" : "The Academic Method"}
              </a>
            </div>

            {/* Subject Pillars Strip */}
            <div className="mt-10 w-full border-t border-outline-variant/80 pt-6">
              <div className="text-[11px] font-mono uppercase tracking-widest text-ink-300">
                {isBn ? "মূল পাঠ্যবিষয়সমূহ" : "Core Academic Disciplines"}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-ink-700 sm:text-sm">
                <span>Physics</span>
                <span className="text-ink-300">·</span>
                <span>Chemistry</span>
                <span className="text-ink-300">·</span>
                <span>Biology</span>
                <span className="text-ink-300">·</span>
                <span>ICT</span>
                <span className="text-ink-300">·</span>
                <span>Higher Mathematics</span>
              </div>
            </div>
          </div>

          {/* Right Column: Editorial Monograph Portrait */}
          <div className="relative mx-auto w-full max-w-md lg:col-span-5 lg:max-w-none">
            <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-surface-1 p-2 sm:p-3 shadow-academic">
              {/* Inner Frame */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-2">
                <Image
                  src="/jibon.jpg"
                  alt="Tanvir Hasan Jibon — Lead Educator"
                  fill
                  priority
                  sizes="(min-width: 1024px) 38vw, (min-width: 640px) 75vw, 92vw"
                  className="object-cover object-top"
                />

                {/* Subtle vignette for typography contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/25 to-transparent" />

                {/* Academic Metadata Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-white">
                  <div className="inline-block rounded-md border border-white/20 bg-black/40 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider backdrop-blur-sm">
                    Lead Educator &amp; Founder
                  </div>
                  
                  <div className="mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl">
                    Tanvir Hasan Jibon
                  </div>

                  <p className="mt-0.5 text-xs text-white/80 sm:text-sm font-medium">
                    {isBn
                      ? "উদ্ভিদবিজ্ঞান বিভাগ, ঢাকা বিশ্ববিদ্যালয়"
                      : "Department of Botany, University of Dhaka"}
                  </p>

                  <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-3 text-[11px] text-white/70">
                    <span>SSC · HSC · Admission</span>
                    <span className="font-mono">Science &amp; ICT</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
