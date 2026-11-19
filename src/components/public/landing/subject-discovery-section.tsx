import React from "react";
import Link from "next/link";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon } from "@/components/shared/ui/icons";

interface SubjectDiscoverySectionProps {
  isBn: boolean;
}

export function SubjectDiscoverySection({ isBn }: SubjectDiscoverySectionProps) {
  const subjects = [
    {
      slug: "mathematics",
      nameBn: "উচ্চতর ও সাধারণ গণিত",
      nameEn: "Mathematics",
      gradesBn: "৬ষ্ঠ–১২শ শ্রেণি ও ভর্তি",
      gradesEn: "Grades 6–12 & Admission",
      badgeColor: "bg-blue-50/90 text-blue-900 border-blue-200/80 dark:bg-blue-950/30 dark:border-blue-900/60 dark:text-blue-200",
      iconBg: "bg-blue-600 text-white",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      slug: "physics",
      nameBn: "বিজ্ঞান ও পদার্থবিজ্ঞান",
      nameEn: "Science & Physics",
      gradesBn: "৬ষ্ঠ–১২শ শ্রেণি",
      gradesEn: "Grades 6–12",
      badgeColor: "bg-emerald-50/90 text-emerald-900 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/60 dark:text-emerald-200",
      iconBg: "bg-emerald-600 text-white",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="3" strokeWidth={2} />
          <ellipse cx="12" cy="12" rx="9" ry="4" strokeWidth={2} transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="4" strokeWidth={2} transform="rotate(-30 12 12)" />
        </svg>
      ),
    },
    {
      slug: "chemistry",
      nameBn: "রসায়ন বিজ্ঞান",
      nameEn: "Chemistry",
      gradesBn: "৯ম–১২শ শ্রেণি",
      gradesEn: "Grades 9–12",
      badgeColor: "bg-amber-50/90 text-amber-900 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/60 dark:text-amber-200",
      iconBg: "bg-amber-600 text-white",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      slug: "ict",
      nameBn: "আইসিটি ও প্রোগ্রামিং",
      nameEn: "ICT & Computing",
      gradesBn: "৬ষ্ঠ–১২শ শ্রেণি",
      gradesEn: "Grades 6–12",
      badgeColor: "bg-purple-50/90 text-purple-900 border-purple-200/80 dark:bg-purple-950/30 dark:border-purple-900/60 dark:text-purple-200",
      iconBg: "bg-purple-600 text-white",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      slug: "biology",
      nameBn: "বাংলা ও জীববিজ্ঞান",
      nameEn: "Bangla & Biology",
      gradesBn: "৬ষ্ঠ–১২শ শ্রেণি",
      gradesEn: "Grades 6–12",
      badgeColor: "bg-teal-50/90 text-teal-900 border-teal-200/80 dark:bg-teal-950/30 dark:border-teal-900/60 dark:text-teal-200",
      iconBg: "bg-teal-600 text-white",
      icon: (
        <span className="font-display font-black text-lg leading-none">ব</span>
      ),
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <Container size="xl">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-4 py-1 text-xs font-semibold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <span>{isBn ? "বিষয়সমূহ" : "Explore Subjects"}</span>
          </div>

          <h2 className="mt-4 font-serif text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            {isBn ? "আপনার পছন্দের বিষয় নির্বাচন করুন" : "Find your next learning path"}
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-500 sm:text-base dark:text-ink-400">
            {isBn
              ? "স্কুল-কলেজের পাঠ্যসূচি থেকে বোর্ড ও বিশ্ববিদ্যালয় ভর্তি প্রস্তুতি — বেছে নিন যা শিখতে চান।"
              : "From school subjects to exam preparation — choose what you want to learn."}
          </p>
        </div>

        {/* 5 Subject Cards Grid matching reference layout */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {subjects.map((s) => (
            <Link
              key={s.slug}
              href={`/courses?category=${s.slug}`}
              className={`group flex items-center justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${s.badgeColor}`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105 ${s.iconBg}`}>
                  {s.icon}
                </div>

                <div className="flex flex-col">
                  <span className="font-display text-sm font-bold leading-tight">
                    {isBn ? s.nameBn : s.nameEn}
                  </span>
                  <span className="mt-1 text-[11px] font-medium opacity-75">
                    {isBn ? s.gradesBn : s.gradesEn}
                  </span>
                </div>
              </div>

              <div className="text-current opacity-60 transition-transform duration-200 group-hover:opacity-100 group-hover:translate-x-1">
                <ArrowRightIcon size={16} />
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
