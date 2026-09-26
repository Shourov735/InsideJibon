import Link from "next/link";
import { Container } from "@/components/shared/ui/container";
import { ArrowRightIcon } from "@/components/shared/ui/icons";

interface CtaSectionProps {
  isBn: boolean;
}

export function CtaSection({ isBn }: CtaSectionProps) {
  return (
    <section className="bg-primary py-20 sm:py-28 text-on-primary">
      <Container size="md" className="text-center">
        <span className="inline-block rounded-full bg-white/10 px-3.5 py-1 font-mono text-xs uppercase tracking-wider text-white/90 backdrop-blur-sm">
          {isBn ? "ভর্তি ও নিবন্ধন" : "Admissions & Enrollment"}
        </span>

        <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-5xl text-balance">
          {isBn
            ? "পরিকল্পিত ও আত্মবিশ্বাসী শিক্ষার সূচনা হোক আজই"
            : "Begin Your Academic Preparation with Discipline"}
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-on-primary/80 sm:text-base">
          {isBn
            ? "পদার্থবিজ্ঞান, রসায়ন, জীববিজ্ঞান, আইসিটি ও উচ্চতর গণিতের সুশৃঙ্খল পাঠদান, নিয়মিত পরীক্ষা ও ব্যক্তিগত মূল্যায়নের অংশ হতে যুক্ত হোন ইনসাইডজীবনে।"
            : "Join InsideJibon to master core science disciplines through chaptered lecture modules, board-standard timed exams, and individualized teacher evaluation."}
        </p>

        <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:justify-center">
          <Link
            href="/courses"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-surface-0 px-7 text-sm font-bold text-primary shadow-sm transition-all hover:bg-surface-1 hover:shadow-md"
          >
            <span>{isBn ? "কোর্সসমূহ দেখুন" : "Explore Courses"}</span>
            <ArrowRightIcon size={15} />
          </Link>

          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-transparent px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            <span>{isBn ? "নতুন অ্যাকাউন্ট খুলুন" : "Create Account"}</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}
