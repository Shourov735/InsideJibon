import { Container } from "@/components/shared/ui/container";

interface PhilosophySectionProps {
  isBn: boolean;
}

export function PhilosophySection({ isBn }: PhilosophySectionProps) {
  const pillars = [
    {
      num: "01",
      titleBn: "ধারণাগত ভিত্তি ও প্রতিপাদন",
      titleEn: "First-Principles Derivation",
      descBn:
        "শর্টকাট খোঁজার আগে প্রতিটি সূত্রের বৈজ্ঞানিক যুক্তি ও প্রমাণ বোঝা অপরিহার্য। ভেক্টর ক্যালকুলাস থেকে জৈব রসায়নের মেকানিজম — সবকিছু শেখানো হয় ভেতর থেকে।",
      descEn:
        "Before shortcuts, understanding the underlying derivation is essential. From vector calculus to organic reaction mechanisms, concepts are built from first principles.",
    },
    {
      num: "02",
      titleBn: "বোর্ড ও ভর্তি পরীক্ষার কঠোর মানদণ্ড",
      titleEn: "Rigorous Examination Standards",
      descBn:
        "কেবল সহজ প্রশ্নে সন্তুষ্ট না থেকে বোর্ড স্ট্যান্ডার্ড ও শীর্ষ বিশ্ববিদ্যালয় ভর্তি পরীক্ষার জটিল সমস্যা সমাধানের অভ্যাস গড়ে তোলা।",
      descEn:
        "Beyond basic exercises: timed assessments designed around authentic HSC board questions and university entrance examination standards.",
    },
    {
      num: "03",
      titleBn: "হাতে-কলমে মূল্যায়ন ও পর্যবেক্ষণ",
      titleEn: "Direct Handwritten Evaluation",
      descBn:
        "লিখিত পরীক্ষার খাতা শিক্ষকের সরাসরি মূল্যায়ন ও গঠনমূলক মন্তব্য। কোন যুক্তিতে নম্বর কাটা গেল এবং কীভাবে লিখলে পূর্ণ নম্বর মিলবে — তা জানা।",
      descEn:
        "Physical submissions reviewed with teacher markups. Understanding why marks were deducted and exactly how to construct complete mathematical answers.",
    },
  ];

  return (
    <section className="border-b border-outline-variant bg-surface-1 py-16 sm:py-24">
      <Container size="xl">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14">
          
          {/* Section Manifesto Column */}
          <div className="lg:col-span-4">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
              {isBn ? "শিক্ষা দর্শন" : "Academic Philosophy"}
            </span>

            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl text-balance">
              {isBn
                ? "বিজ্ঞান শিক্ষার প্রকৃত মানদণ্ড কী?"
                : "What Defines True Academic Rigor?"}
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-ink-500 sm:text-base">
              {isBn
                ? "কোচিংয়ের ভিড়ে হারিয়ে না গিয়ে ঘরে বসেই সুশৃঙ্খল পাঠদান ও ব্যক্তিগত পর্যবেক্ষণে নিজেকে প্রস্তুত করার নতুন রূপরেখা।"
                : "Moving away from crowded mass coaching centers toward structured discipline, continuous assessment, and personal accountability."}
            </p>
          </div>

          {/* Pillars List Column */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:col-span-8 lg:gap-8">
            {pillars.map((pillar) => (
              <div
                key={pillar.num}
                className="flex flex-col border-t border-outline-variant pt-5"
              >
                <span className="font-mono text-xs font-bold text-primary">
                  {pillar.num}
                </span>

                <h3 className="mt-2 font-display text-lg font-bold text-ink-900">
                  {isBn ? pillar.titleBn : pillar.titleEn}
                </h3>

                <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-ink-500">
                  {isBn ? pillar.descBn : pillar.descEn}
                </p>
              </div>
            ))}
          </div>

        </div>
      </Container>
    </section>
  );
}
