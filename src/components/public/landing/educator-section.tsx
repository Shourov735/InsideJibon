import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon } from "@/components/shared/ui/icons";

interface EducatorSectionProps {
  isBn: boolean;
}

export function EducatorSection({ isBn }: EducatorSectionProps) {
  return (
    <section id="instructor" className="border-b border-outline-variant bg-surface-0 py-16 sm:py-24">
      <Container size="xl">
        <div className="overflow-hidden rounded-3xl border border-outline-variant bg-surface-1 shadow-academic">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Left Column: Portrait Monograph */}
            <div className="relative aspect-[4/5] min-h-[340px] w-full lg:col-span-5 lg:aspect-auto lg:min-h-full">
              <Image
                src="/jibon.jpg"
                alt="Tanvir Hasan Jibon — Lead Educator"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-transparent to-transparent lg:hidden" />
              <div className="absolute bottom-4 left-4 text-white lg:hidden">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white/80">
                  Lead Educator &amp; Founder
                </span>
                <div className="font-display text-xl font-bold">Tanvir Hasan Jibon</div>
              </div>
            </div>

            {/* Right Column: Academic Monograph & Narrative */}
            <div className="flex flex-col justify-between p-6 sm:p-10 lg:col-span-7 lg:p-12">
              <div>
                {/* Header Tag */}
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                  {isBn ? "শিক্ষক পরিচিতি" : "Lead Educator"}
                </span>

                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl lg:text-4xl">
                  {isBn ? "তানভীর হাসান জীবন" : "Tanvir Hasan Jibon"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-primary sm:text-base">
                  {isBn
                    ? "শিক্ষার্থী, উদ্ভিদবিজ্ঞান বিভাগ — ঢাকা বিশ্ববিদ্যালয়"
                    : "Student, Department of Botany, University of Dhaka"}
                </p>

                <p className="mt-1 text-xs font-mono uppercase tracking-wider text-ink-500">
                  Physics · Chemistry · Biology · ICT · Higher Mathematics
                </p>

                {/* Educator Statement */}
                <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-700 sm:text-base">
                  <p>
                    {isBn
                      ? "বিজ্ঞান ও আইসিটির জটিল বিষয়গুলোকে মুখস্থের গণ্ডি থেকে বের করে সহজ ও কার্যকরভাবে উপস্থাপন করাই আমার মূল লক্ষ্য। দীর্ঘ শিক্ষকতা জীবনে এসএসসি, এইচএসসি এবং বিভিন্ন বিশ্ববিদ্যালয়ের ভর্তি পরীক্ষার শিক্ষার্থীদের সঠিক দিকনির্দেশনা প্রদান করেছি।"
                      : "My focus has always been breaking through the fear of complex scientific formulas and algorithms by developing deep, intuitive foundations. Over years of guiding SSC, HSC, and university aspirants, I have seen that true academic excellence comes from fundamental mastery rather than memorizing answer banks."}
                  </p>
                  <p>
                    {isBn
                      ? "ইনসাইডজীবনের মাধ্যমে বাংলাদেশের প্রতিটি প্রান্তে থাকা শিক্ষার্থীদের কাছে সুশৃঙ্খল, মানসম্মত ও সাশ্রয়ী একাডেমিক শিক্ষা পৌঁছে দিতে আমি প্রতিশ্রুতিবদ্ধ।"
                      : "Through InsideJibon, my commitment is to make rigorous, transparent, and structured academic mentorship accessible to every motivated student across Bangladesh."}
                  </p>
                </div>
              </div>

              {/* Verified Links & Actions */}
              <div className="mt-8 border-t border-outline-variant pt-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href="/courses"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/95"
                  >
                    <span>{isBn ? "কোর্সসমূহ দেখুন" : "Explore Courses"}</span>
                    <ArrowRightIcon size={14} />
                  </Link>

                  <div className="flex items-center gap-3">
                    <a
                      href="https://youtube.com/@tanvirhasanjibon5827"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-0 px-4 text-xs font-semibold text-ink-700 transition-colors hover:bg-surface-2 hover:text-ink-900"
                    >
                      <span>YouTube</span>
                    </a>

                    <a
                      href="https://facebook.com/mdtanvirhasan.jibon"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-outline-variant bg-surface-0 px-4 text-xs font-semibold text-ink-700 transition-colors hover:bg-surface-2 hover:text-ink-900"
                    >
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
