import React from "react";
import { Container } from "@/components/shared/ui/container";
import {
  BookIcon,
  ChartIcon,
  CheckIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

interface ValuePillarsStripProps {
  isBn: boolean;
}

export function ValuePillarsStrip({ isBn }: ValuePillarsStripProps) {
  const pillars = [
    {
      icon: <BookIcon size={22} />,
      titleBn: "জাতীয় পাঠ্যক্রম ভিত্তিক কোর্স",
      descBn: "এনসিটিবি সিলেবাস অনুসারে সুশৃঙ্খল পাঠদান",
      titleEn: "Curriculum-aligned courses",
      descEn: "Follow the national curriculum",
    },
    {
      icon: <VideoIcon size={22} />,
      titleBn: "ইন্টারেক্টিভ লাইভ ক্লাস",
      descBn: "রিয়েল-টাইমে একসাথে শেখা ও সরাসরি প্রশ্ন",
      titleEn: "Interactive live classes",
      descEn: "Learn together, in real-time",
    },
    {
      icon: <CheckIcon size={22} />,
      titleBn: "অনুশীলন ও পরীক্ষা",
      descBn: "সময়াবদ্ধ পরীক্ষা ও নিজের সক্ষমতা বৃদ্ধি",
      titleEn: "Practice & exams",
      descEn: "Test yourself, get better",
    },
    {
      icon: <ChartIcon size={22} />,
      titleBn: "অগ্রগতি পর্যবেক্ষণ",
      descBn: "নিজের বৃদ্ধি দেখুন, অনুপ্রাণিত থাকুন",
      titleEn: "Track your progress",
      descEn: "See your growth, stay motivated",
    },
  ];

  return (
    <div className="relative z-20 -mt-10 sm:-mt-14 mb-12 sm:mb-20">
      <Container size="xl">
        <div className="rounded-2xl sm:rounded-3xl border border-outline-variant/70 bg-white/95 p-4 sm:p-7 shadow-[0_12px_36px_rgba(0,35,70,0.08)] backdrop-blur-md dark:border-outline-variant/40 dark:bg-surface-1 dark:shadow-[0_12px_36px_rgba(0,0,0,0.4)]">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-outline-variant/60">
            {pillars.map((pillar, index) => (
              <div
                key={pillar.titleEn}
                className={`flex items-start gap-4 ${
                  index !== 0 ? "lg:pl-6" : ""
                } ${index !== pillars.length - 1 ? "lg:pr-6" : ""}`}
              >
                {/* Royal Blue Icon Badge */}
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs dark:bg-blue-950/60 dark:text-blue-300">
                  {pillar.icon}
                </div>

                <div className="flex flex-col">
                  <h3 className="font-display text-sm sm:text-base font-bold text-ink-900 leading-snug">
                    {isBn ? pillar.titleBn : pillar.titleEn}
                  </h3>
                  <p className="mt-1 text-xs sm:text-[13px] leading-normal text-ink-500 dark:text-ink-400">
                    {isBn ? pillar.descBn : pillar.descEn}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
