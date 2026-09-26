import { Container } from "@/components/shared/ui/container";
import {
  VideoIcon,
  ClipboardIcon,
  UsersIcon,
  GlobeIcon,
  ChartIcon,
  CheckIcon,
} from "@/components/shared/ui/icons";

interface FeaturesSectionProps {
  isBn: boolean;
}

export function FeaturesSection({ isBn }: FeaturesSectionProps) {
  const capabilities = [
    {
      icon: <VideoIcon size={20} />,
      titleBn: "ইন্টারেক্টিভ লাইভ ক্লাসরুম",
      titleEn: "Real-Time Live Classrooms",
      descBn:
        "ক্লাউডফ্লেয়ার ডিউরেবল অবজেক্টসের মাধ্যমে লো-লেটেন্সি লাইভ ক্লাস, রিয়েল-টাইম প্রশ্নত্তোর ও হ্যান্ড-রেইজিং সুবিধা।",
      descEn:
        "Low-latency real-time live classes powered by Cloudflare Durable Objects with live chat and hand-raising capabilities.",
    },
    {
      icon: <ClipboardIcon size={20} />,
      titleBn: "প্রক্টর্ড এক্সামিনেশন ইঞ্জিন",
      titleEn: "Proctored Exam Architecture",
      descBn:
        "ট্যাব-সুইচ ট্র্যাকিং, সময় নিয়ন্ত্রণ ও অটোগ্রেডিং সম্বলিত বোর্ড-মানসম্মত পরীক্ষার পরিবেশ।",
      descEn:
        "Secure timed testing environments with tab-switch detection, attempt snapshots, and instant solution analytics.",
    },
    {
      icon: <UsersIcon size={20} />,
      titleBn: "অভিভাবক পর্যবেক্ষণ পোর্টাল",
      titleEn: "Dedicated Guardian Portal",
      descBn:
        "শিক্ষার্থীর পড়াশোনার ধারাবাহিকতা, ক্লাসে উপস্থিতি ও পরীক্ষার নম্বর পর্যবেক্ষণ করার স্বতন্ত্র ড্যাশবোর্ড।",
      descEn:
        "A dedicated guardian dashboard to monitor study consistency, attendance, homework marks, and exam trajectories.",
    },
    {
      icon: <GlobeIcon size={20} />,
      titleBn: "পূর্ণাঙ্গ দ্বিভাষিক অভিজ্ঞতা",
      titleEn: "Native Bilingual Experience",
      descBn:
        "বাংলা ও ইংরেজি উভয় মাধ্যমে নির্বিঘ্ন ব্যবহারের সুবিধা, যা যেকোনো শিক্ষার্থীর জন্য সহজবোধ্য।",
      descEn:
        "Instant toggle between Bengali and English across every lecture, exam, syllabus module, and navigation flow.",
    },
    {
      icon: <ChartIcon size={20} />,
      titleBn: "অগ্রগতি ও ধারাবাহিকতা বিশ্লেষণ",
      titleEn: "Study Streaks & Analytics",
      descBn:
        "প্রতিদিনের পড়ার অভ্যাস বজায় রাখতে স্ট্রিক ট্র্যাকিং, এক্সপি পয়েন্ট ও সাপ্তাহিক পারফরম্যান্স ওভারভিউ।",
      descEn:
        "Detailed performance analytics, study streaks, and activity metrics designed to build daily academic discipline.",
    },
    {
      icon: <CheckIcon size={20} />,
      titleBn: "হাতে-কলমে অ্যাসাইনমেন্ট সাবমিশন",
      titleEn: "Handwritten Assignment Review",
      descBn:
        "খাতায় করা অংক ও লিখিত উত্তর সরাসরি আপলোড করে শিক্ষকের ব্যক্তিগত পর্যালোচনা ও মার্কিং পাওয়ার সুযোগ।",
      descEn:
        "Upload handwritten solutions and calculations for direct line-item review, rubric scoring, and corrections.",
    },
  ];

  return (
    <section className="border-b border-outline-variant bg-surface-1 py-16 sm:py-24">
      <Container size="xl">
        <div className="max-w-2xl">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
            {isBn ? "প্ল্যাটফর্ম সক্ষমতা" : "Platform Architecture"}
          </span>

          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            {isBn
              ? "গভীর অধ্যয়নের জন্য আধুনিক শিক্ষাগত প্রযুক্তি"
              : "Built for Serious Academic Commitment"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base">
            {isBn
              ? "সাধারণ কোনো ভিডিও প্ল্যাটফর্ম নয় — সম্পূর্ণ একাডেমিক প্রস্তুতি নিশ্চিত করতে ইনসাইডজীবন গড়ে উঠেছে আধুনিক ক্লাউড আর্কিটেকচারে।"
              : "InsideJibon is an end-to-end academic infrastructure combining low-latency streaming, proctored examinations, and personalized mentoring."}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => (
            <div
              key={cap.titleEn}
              className="flex flex-col rounded-2xl border border-outline-variant bg-surface-0 p-6 shadow-2xs transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-academic"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {cap.icon}
              </div>

              <h3 className="mt-4 font-display text-base font-bold text-ink-900 sm:text-lg">
                {isBn ? cap.titleBn : cap.titleEn}
              </h3>

              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-500">
                {isBn ? cap.descBn : cap.descEn}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
