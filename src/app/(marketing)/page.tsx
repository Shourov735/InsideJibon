const features = [
  {
    title: "কোর্স ও লেসন",
    subtitle: "Courses & Lessons",
    description:
      "সাজানো মডিউল আর লেসনে শিখুন — নিজের গতিতে, নিজের সময়ে।",
  },
  {
    title: "পরীক্ষা ও মূল্যায়ন",
    subtitle: "Exams & Assessment",
    description:
      "অনলাইন পরীক্ষা দিন, উত্তর যাচাই হোক, ফলাফল জানুন তৎক্ষণাৎ।",
  },
  {
    title: "অগ্রগতি ট্র্যাকিং",
    subtitle: "Progress Tracking",
    description:
      "প্রতিটি লেসন, পরীক্ষা আর অ্যাসাইনমেন্টের অগ্রগতি এক জায়গায়।",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="bg-surface-container-lowest">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-4 inline-block rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
            Learn · Practice · Perform
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-on-surface sm:text-5xl">
            জ্ঞানের ভেতরে,{" "}
            <span className="text-primary">শেখার যাত্রা</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-on-surface-variant">
            কোর্স, পরীক্ষা, অ্যাসাইনমেন্ট আর অগ্রগতি — শিক্ষার্থী ও শিক্ষকের
            জন্য সবকিছু এক জায়গায়। InsideJibon-এ শেখা হয় সহজ ও মাপা যায়
            সঠিকভাবে।
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#features"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              শেখা শুরু করুন
            </a>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="bg-surface py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
            এক প্ল্যাটফর্মে পুরো শেখার চক্র
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                  {feature.subtitle}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-on-surface">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}