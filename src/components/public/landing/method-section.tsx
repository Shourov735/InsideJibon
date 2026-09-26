import { Container } from "@/components/shared/ui/container";
import {
  BookIcon,
  ClipboardIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

interface MethodSectionProps {
  isBn: boolean;
}

export function MethodSection({ isBn }: MethodSectionProps) {
  const steps = [
    {
      num: "01",
      icon: <BookIcon size={20} />,
      tag: "THEORY",
      titleBn: "অধ্যায়ভিত্তিক গভীর ভিডিও পাঠ",
      titleEn: "Sequenced Video Mastery",
      descBn:
        "প্রতিটি অধ্যায় সুনির্দিষ্টভাবে ভাগ করা ভিডিও লেকচার। সাথে রয়েছে ডাউনলোডযোগ্য লেকচার নোটস ও রিসোর্স।",
      descEn:
        "Chapter-sequenced video modules organized by topic with accompanying downloadable lecture notes and references.",
    },
    {
      num: "02",
      icon: <ClipboardIcon size={20} />,
      tag: "EXAMS",
      titleBn: "সময়াবদ্ধ প্রক্টর্ড পরীক্ষা",
      titleEn: "Timed & Proctored Exams",
      descBn:
        "বোর্ড স্ট্যান্ডার্ড MCQ ও লিখিত পরীক্ষা। সময় নিয়ন্ত্রণ, নেগেটিভ মার্কিং এবং তাৎক্ষণিক ফলাফল বিশ্লেষণ।",
      descEn:
        "Authentic board-standard MCQs and written tests with strict time limits, automated grading, and comprehensive solution analysis.",
    },
    {
      num: "03",
      icon: <ClipboardIcon size={20} />,
      tag: "FEEDBACK",
      titleBn: "লিখিত খাতার সরাসরি মূল্যায়ন",
      titleEn: "Handwritten Assignment Review",
      descBn:
        "খাতায় সমাধান করে ছবি আপলোড। শিক্ষকের সরাসরি পর্যবেক্ষণ ও মার্কিং রুব্রিক অনুযায়ী ভুল সংশোধন।",
      descEn:
        "Submit physical handwritten homework. Graded directly by the educator with individualized rubrics and detailed margin feedback.",
    },
    {
      num: "04",
      icon: <VideoIcon size={20} />,
      tag: "LIVE & SYNC",
      titleBn: "লাইভ ক্লাস ও অগ্রগতি ট্র্যাকিং",
      titleEn: "Live Interactive & Progress Tracking",
      descBn:
        "সরাসরি ক্লাসরুমে প্রশ্ন করার সুবিধা, সাপ্তাহিক স্ট্রিক ও অভিভাবকের জন্য স্বতন্ত্র পর্যবেক্ষণ পোর্টাল।",
      descEn:
        "Low-latency live classrooms with real-time Q&A, weekly study streaks, league rankings, and dedicated guardian visibility.",
    },
  ];

  return (
    <section id="method" className="border-b border-outline-variant bg-surface-1 py-16 sm:py-24">
      <Container size="xl">
        {/* Section Header */}
        <div className="max-w-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            {isBn ? "পদ্ধতিগত কাঠামো" : "Learning Architecture"}
          </span>

          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {isBn
              ? "শেখার সুশৃঙ্খল চার ধাপ · The InsideJibon Method"
              : "The Four-Stage Learning Architecture"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
            {isBn
              ? "বিজ্ঞানের জটিল বিষয়গুলোকে আয়ত্তে এনে পরীক্ষায় সর্বোত্তম ফলাফল অর্জনের জন্য প্রমাণিত শিক্ষাপদ্ধতি।"
              : "A disciplined, step-by-step academic loop that transforms theoretical concepts into permanent examination confidence."}
          </p>
        </div>

        {/* 4-Step Process Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.num}
              className="flex flex-col rounded-2xl border border-outline-variant bg-surface-0 p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-academic"
            >
              {/* Header: Number and Icon */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary">
                  Phase {step.num}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-1 text-ink-700">
                  {step.icon}
                </span>
              </div>

              {/* Title */}
              <h3 className="mt-5 font-display text-lg font-bold text-ink-900">
                {isBn ? step.titleBn : step.titleEn}
              </h3>

              {/* Description */}
              <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-ink-500">
                {isBn ? step.descBn : step.descEn}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
