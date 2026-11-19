import React from "react";
import Link from "next/link";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon, CheckIcon } from "@/components/shared/ui/icons";

interface CtaSectionProps {
  isBn: boolean;
}

export function CtaSection({ isBn }: CtaSectionProps) {
  return (
    <section className="py-16 sm:py-24 bg-[#FAF8F5] border-t border-outline-variant/60">
      <Container size="xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-primary to-slate-900 px-6 py-16 sm:px-12 sm:py-20 text-center text-white shadow-xl">
          
          {/* Subtle background decorative rings */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl"
          />

          <div className="relative z-10 max-w-3xl mx-auto">
            {/* Pill Tag */}
            <span className="inline-block rounded-full bg-white/10 px-4 py-1 font-mono text-xs uppercase tracking-wider text-white/90 backdrop-blur-sm border border-white/15">
              {isBn ? "ভর্তি ও নিবন্ধন" : "Start Your Journey"}
            </span>

            {/* Headline */}
            <h2 className="mt-5 font-serif text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-balance">
              {isBn
                ? "পরিকল্পিত ও আত্মবিশ্বাসী শিক্ষার সূচনা হোক আজই"
                : "Learn with Purpose. Grow for Life."}
            </h2>

            {/* Sub-copy */}
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              {isBn
                ? "পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, আইসিটি ও উচ্চতর গণিতের সুশৃঙ্খল পাঠদান, নিয়মিত পরীক্ষা ও শিক্ষকের সরাসরি মূল্যায়নের অংশ হতে যুক্ত হোন ইনসাইডজীবনে।"
                : "Master core science and ICT disciplines through chapter-sequenced lecture modules, board-standard timed exams, and individualized educator feedback."}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/courses"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-8 text-sm font-bold text-blue-900 shadow-md transition-all hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{isBn ? "কোর্সসমূহ দেখুন" : "Explore Courses"}</span>
                <ArrowRightIcon size={15} />
              </Link>

              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/30 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.98]"
              >
                <span>{isBn ? "নতুন অ্যাকাউন্ট খুলুন" : "Create Free Account"}</span>
              </Link>
            </div>

            {/* Trust Points */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 border-t border-white/15 pt-6 text-xs text-white/75 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckIcon size={14} className="text-emerald-400" />
                <span>{isBn ? "এনসিটিবি (NCTB) অনুমোদিত পাঠ্যক্রম" : "NCTB Curriculum Aligned"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon size={14} className="text-emerald-400" />
                <span>{isBn ? "লো-লেটেন্সি লাইভ ক্লাস ও রেকর্ডিং" : "Low-Latency Live & Replays"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon size={14} className="text-emerald-400" />
                <span>{isBn ? "হাতে-কলমে লিখিত খাতার মূল্যায়ন" : "Handwritten Assignment Review"}</span>
              </span>
            </div>

          </div>

        </div>
      </Container>
    </section>
  );
}
