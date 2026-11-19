import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon } from "@/components/shared/ui/icons";

interface EducatorSectionProps {
  isBn: boolean;
}

export function EducatorSection({ isBn }: EducatorSectionProps) {
  return (
    <section id="instructor" className="py-16 sm:py-24 border-t border-outline-variant/60 bg-surface-1 dark:bg-surface-1">
      <Container size="xl">
        <div className="overflow-hidden rounded-3xl border border-outline-variant/80 bg-surface-0 shadow-academic dark:bg-surface-0 dark:border-outline-variant/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            
            {/* Left Column: Portrait Monograph */}
            <div className="relative aspect-[4/5] min-h-[380px] w-full lg:col-span-5 lg:aspect-auto lg:min-h-full">
              <Image
                src="/jibon.jpg"
                alt="Tanvir Hasan Jibon — Lead Educator"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-transparent to-transparent lg:hidden" />
              <div className="absolute bottom-5 left-5 text-white lg:hidden">
                <span className="rounded-md bg-black/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider backdrop-blur-xs">
                  Lead Educator &amp; Founder
                </span>
                <div className="mt-1 font-display text-2xl font-bold">Tanvir Hasan Jibon</div>
                <div className="text-xs text-white/80">Department of Botany, Dhaka Central University</div>
              </div>
            </div>

            {/* Right Column: Academic Monograph Narrative */}
            <div className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7 lg:p-12">
              <div>
                {/* Header Tag */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-3.5 py-0.5 text-xs font-semibold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
                  <span>{isBn ? "শিক্ষক পরিচিতি" : "Lead Educator"}</span>
                </div>

                <h2 className="mt-3 font-serif text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
                  {isBn ? "তানভীর হাসান জীবন" : "Tanvir Hasan Jibon"}
                </h2>

                <p className="mt-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 sm:text-base">
                  {isBn
                    ? "উদ্ভিদবিজ্ঞান বিভাগ — ঢাকা সেন্ট্রাল ইউনিভার্সিটি"
                    : "Department of Botany, Dhaka Central University"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-mono font-medium text-ink-400">
                  <span>SSC · HSC · Admission</span>
                  <span>•</span>
                  <span>Physics · Chemistry · Biology · ICT · Higher Math</span>
                </div>

                {/* Narrative Statement */}
                <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-600 dark:text-ink-300 sm:text-base">
                  <p>
                    {isBn
                      ? "বিজ্ঞান ও আইসিটির জটিল বিষয়গুলোকে মুখস্থের গণ্ডি থেকে বের করে প্রতিটি সূত্রের গভীর বাস্তব ভিত্তি ও প্রতিপাদন শিক্ষার্থীদের মাঝে ছড়িয়ে দেয়াই আমার মূল লক্ষ্য। দীর্ঘ শিক্ষকতা জীবনে এসএসসি, এইচএসসি এবং শীর্ষ বিশ্ববিদ্যালয়ের ভর্তি পরীক্ষায় শত শত শিক্ষার্থীকে আত্মবিশ্বাসী করে গড়ে তুলেছি।"
                      : "My passion is breaking through the anxiety of difficult scientific equations by building deep, intuitive understanding from the ground up. Over years of guiding SSC, HSC, and university admission candidates, I have seen that lasting academic excellence always stems from conceptual mastery rather than memorizing question banks."}
                  </p>
                  <p>
                    {isBn
                      ? "ইনসাইডজীবনের মাধ্যমে বাংলাদেশের প্রতিটি জেলার প্রত্যন্ত অঞ্চলের শিক্ষার্থীদের কাছে ঢাকা শহরের সেরা মানের সুশৃঙ্খল, সাশ্রয়ী ও যত্নশীল একাডেমিক মেন্টরশিপ পৌঁছে দিতে আমি প্রতিশ্রুতিবদ্ধ।"
                      : "Through InsideJibon, my commitment is to deliver world-class, disciplined, and personalized academic mentorship to motivated students across every district in Bangladesh."}
                  </p>
                </div>
              </div>

              {/* Verified Links & Actions */}
              <div className="mt-8 border-t border-outline-variant/60 pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href="/courses"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-6 text-sm font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
                  >
                    <span>{isBn ? "কোর্সসমূহ দেখুন" : "Explore Courses"}</span>
                    <ArrowRightIcon size={14} />
                  </Link>

                  <div className="flex items-center gap-2.5">
                    <a
                      href="https://youtube.com/@tanvirhasanjibon5827"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-0 px-4 text-xs font-semibold text-ink-700 transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:bg-surface-2 dark:text-ink-200"
                    >
                      <svg className="h-3.5 w-3.5 fill-red-600" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      <span>YouTube</span>
                    </a>

                    <a
                      href="https://facebook.com/mdtanvirhasan.jibon"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-outline-variant bg-surface-0 px-4 text-xs font-semibold text-ink-700 transition-colors hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 dark:bg-surface-2 dark:text-ink-200"
                    >
                      <svg className="h-3.5 w-3.5 fill-blue-600" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      <span>Facebook</span>
                    </a>
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
