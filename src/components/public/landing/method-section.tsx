import React from "react";
import { Container } from "@/components/shared/ui/container";
import {
  BookIcon,
  ClipboardIcon,
  VideoIcon,
  CheckIcon,
} from "@/components/shared/ui/icons";

interface MethodSectionProps {
  isBn: boolean;
}

export function MethodSection({ isBn }: MethodSectionProps) {
  const steps = [
    {
      num: "01",
      icon: <BookIcon size={22} />,
      tag: "THEORY & INTUITION",
      titleBn: "ধারণাগত ভিত্তি ও প্রতিপাদন",
      titleEn: "First-Principles Derivation",
      descBn:
        "মুখস্থের বদলে প্রতিটি বৈজ্ঞানিক সূত্রের পেছনের যুক্তি ও প্রমাণ বোঝা। ভেক্টর ক্যালকুলাস থেকে শুরু করে জৈব রসায়নের মেকানিজম — সবকিছু শেখানো হয় ভেতর থেকে।",
      descEn:
        "No shortcuts or rote memorization. Understanding the actual derivation behind every physical formula and chemical mechanism from first principles.",
    },
    {
      num: "02",
      icon: <VideoIcon size={22} />,
      tag: "LIVE & INTERACTIVE",
      titleBn: "লাইভ ক্লাসরুমে সরাসরি অনুশীলন",
      titleEn: "Real-Time Problem Solving",
      descBn:
        "লাইভ ক্লাসে কঠিন গাণিতিক সমস্যা সমাধান। সরাসরি শিক্ষককে প্রশ্ন করা এবং সহপাঠীদের সাথে গঠনমূলক একাডেমিক আলোচনায় অংশ নেয়া।",
      descEn:
        "Live interactive sessions dedicated to breaking down difficult mathematical and physics problems with real-time educator guidance.",
    },
    {
      num: "03",
      icon: <ClipboardIcon size={22} />,
      tag: "EXAMINATION RIGOR",
      titleBn: "সময়াবদ্ধ বোর্ড স্ট্যান্ডার্ড পরীক্ষা",
      titleEn: "Timed Board Assessments",
      descBn:
        "এইচএসসি বোর্ড ও শীর্ষ বিশ্ববিদ্যালয় ভর্তি পরীক্ষার কঠোর মানে পরিকল্পিত পরীক্ষা। সময় ব্যবস্থাপনা ও নেগেটিভ মার্কিংয়ের সাথে অভ্যস্ত হওয়া।",
      descEn:
        "Authentic HSC board and university admission standard mock tests under strict time limits, building real examination confidence.",
    },
    {
      num: "04",
      icon: <CheckIcon size={22} />,
      tag: "PERSONAL FEEDBACK",
      titleBn: "হাতে-কলমে মূল্যায়ন ও সংশোধন",
      titleEn: "Handwritten Evaluation Loop",
      descBn:
        "খাতায় সমাধান করা পরীক্ষার স্ক্রিপ্ট শিক্ষকের সরাসরি পর্যবেক্ষণ ও গঠনমূলক মার্কআপ। কোন যুক্তিতে নম্বর কাটা গেল এবং কীভাবে লিখলে পূর্ণ নম্বর মিলবে — তা জানা।",
      descEn:
        "Direct educator evaluation of physical submissions with individualized margin markups, showing exactly where marks were lost and how to achieve perfection.",
    },
  ];

  return (
    <section id="method" className="py-16 sm:py-24 border-t border-outline-variant/60 bg-surface-0 dark:bg-surface-0">
      <Container size="xl">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-4 py-1 text-xs font-semibold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <span>{isBn ? "পদ্ধতিগত কাঠামো" : "The Academic Method"}</span>
          </div>

          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            {isBn
              ? "শেখার সুশৃঙ্খল চার ধাপ · The InsideJibon Method"
              : "The Four-Stage Learning Architecture"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base dark:text-ink-400">
            {isBn
              ? "বিজ্ঞানের জটিল বিষয়গুলোকে আয়ত্তে এনে পরীক্ষায় নির্ভুল ফলাফল অর্জনের জন্য একটি প্রমাণিত, সুশৃঙ্খল পাঠদান চক্র।"
              : "A disciplined, step-by-step academic loop transforming complex science theory into permanent exam mastery."}
          </p>
        </div>

        {/* 4-Step Process Grid */}
        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group relative flex flex-col rounded-3xl border border-outline-variant/70 bg-surface-1 p-6 sm:p-7 shadow-2xs transition-all duration-200 hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-lg dark:bg-surface-1 dark:hover:border-blue-500/40"
            >
              {/* Header: Stage Number and Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Phase {step.num}
                </span>

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-xs transition-transform group-hover:scale-105 dark:bg-surface-2 dark:text-blue-300">
                  {step.icon}
                </div>
              </div>

              {/* Tag */}
              <div className="mt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-400">
                {step.tag}
              </div>

              {/* Title */}
              <h3 className="mt-1 font-display text-lg font-bold text-ink-900 leading-snug group-hover:text-blue-600 transition-colors">
                {isBn ? step.titleBn : step.titleEn}
              </h3>

              {/* Description */}
              <p className="mt-2.5 text-xs sm:text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
                {isBn ? step.descBn : step.descEn}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
