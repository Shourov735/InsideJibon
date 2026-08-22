import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, inArray } from "drizzle-orm";

try {
  process.loadEnvFile(".env.local");
} catch {
  // ok
}

import {
  users,
  courses,
  courseModules,
  lessons,
} from "../src/db/schema";
import * as courseService from "../src/services/courses";

const db = drizzle(neon(process.env.DATABASE_URL!));

interface LessonSeed {
  title: string;
  description?: string;
  isFree?: boolean;
}

interface ModuleSeed {
  title: string;
  description?: string;
  lessons: LessonSeed[];
}

interface CourseSeed {
  title: string;
  slug: string;
  description: string;
  category: "physics" | "chemistry" | "biology" | "ict" | "mathematics";
  thumbnailUrl: string;
  modules: ModuleSeed[];
}

const COURSES_TO_SEED: CourseSeed[] = [
  {
    title: "HSC Physics Masterclass — Mechanics, Electromagnetism & Modern Physics",
    slug: "hsc-physics-masterclass",
    category: "physics",
    thumbnailUrl: "/images/courses/physics-cover.jpg",
    description: "এইচএসসি পদার্থবিজ্ঞান ১ম ও ২য় পত্রের পূর্ণাঙ্গ প্রস্তুতি। ভেক্টর, গতিবিদ্যা, কাজ-শক্তি-ক্ষমতা, স্থির ও চল তড়িৎ এবং আধুনিক পদার্থবিজ্ঞানের জটিল ধারণাসমূহ সহজ ও গাণিতিক বিশ্লেষণের মাধ্যমে শিখুন।",
    modules: [
      {
        title: "ভেক্টর ও দ্বিমাত্রিক গতি (Vector Analysis & 2D Motion)",
        description: "ভেক্টর রাশি, স্কেলার ও ভেক্টর গুণন এবং প্রাসের গতি সম্পর্কিত বিশ্লেষণ।",
        lessons: [
          { title: "ভেক্টর যোগ, বিয়োগ ও সামান্তরিক সূত্র (Vector Addition & Parallelogram Law)", isFree: true },
          { title: "ডট গুণন ও ক্রস গুণন এবং লব্ধি নির্ণয় (Dot & Cross Product Analysis)", isFree: false },
          { title: "নদী-নৌকা ও বৃষ্টির আপেক্ষিক বেগ সমস্যা (River-Boat & Relative Velocity)", isFree: false },
          { title: "প্রাসের গতি ও সর্বোচ্চ উচ্চতা নির্ণয় (Projectile Motion Dynamics)", isFree: false },
        ],
      },
      {
        title: "নিউটনিয়ান বলবিদ্যা ও কাজ-শক্তি (Newtonian Mechanics & Energy)",
        description: "নিউটনের গতিসূত্র, ঘর্ষণ বল, ভরবেগের সংরক্ষণশীলতা এবং গতিশক্তি উপপাদ্য।",
        lessons: [
          { title: "নিউটনের গতিসূত্র ও ঘর্ষণ বল (Newton's Laws & Friction Coefficients)", isFree: false },
          { title: "রৈখিক ও কৌণিক ভরবেগের সংরক্ষণশীলতা (Linear & Angular Momentum)", isFree: false },
          { title: "কাজ, গতিশক্তি উপপাদ্য ও ক্ষমতা (Work-Energy Theorem & Power Calculations)", isFree: false },
        ],
      },
      {
        title: "স্থির তড়িৎ ও চল তড়িৎ (Electrostatics & Current Electricity)",
        description: "কুলম্বের সূত্র, তড়িৎ প্রাবল্য, ধারকত্ব এবং জটিল বর্তনী সমাধান।",
        lessons: [
          { title: "কুলম্বের সূত্র ও তড়িৎ প্রাবল্য (Coulomb's Law & Electric Field Intensity)", isFree: false },
          { title: "গাউসের সূত্র ও ধারকত্ব (Gauss's Law & Capacitance)", isFree: false },
          { title: "কার্শফের বর্তনী সূত্র ও হুইটস্টোন ব্রিজ (Kirchhoff's Laws & Wheatstone Bridge)", isFree: false },
        ],
      },
      {
        title: "আধুনিক পদার্থবিজ্ঞান ও কোয়ান্টাম তত্ত্ব (Modern Physics)",
        description: "ফটোইলেকট্রিক ক্রিয়া, বোর মডেল এবং তেজস্ক্রিয়তা সম্পর্কিত অধ্যায়।",
        lessons: [
          { title: "ফটোইলেকট্রিক ক্রিয়া ও আইনস্টাইনের সমীকরণ (Photoelectric Effect & Photons)", isFree: false },
          { title: "বোর পরমাণু মডেল ও তেজস্ক্রিয় ক্ষয় (Bohr Model & Radioactive Decay)", isFree: false },
        ],
      },
    ],
  },
  {
    title: "HSC Chemistry Complete Foundation — Organic & Inorganic Mastery",
    slug: "hsc-chemistry-foundation",
    category: "chemistry",
    thumbnailUrl: "/images/courses/chemistry-cover.jpg",
    description: "এইচএসসি রসায়ন ১ম ও ২য় পত্রের পরিপূর্ণ কোর্স। গুণগত রসায়ন, পর্যায়বৃত্ত ধর্ম, রাসায়নিক পরিবর্তন এবং জৈব রসায়নের মেকানিজম সহজে আয়ত্ত করুন।",
    modules: [
      {
        title: "গুণগত রসায়ন ও পারমাণবিক মডেল (Qualitative Chemistry)",
        description: "কোয়ান্টাম সংখ্যা, ইলেকট্রন বিন্যাস এবং দ্রাব্যতা নীতি।",
        lessons: [
          { title: "কোয়ান্টাম সংখ্যা ও ইলেকট্রন বিন্যাস নীতি (Quantum Numbers & Hund's Rule)", isFree: true },
          { title: "দ্রাব্যতা গুণফল ও আয়নিক গুণফল নীতি (Solubility Product Ksp & Common Ion Effect)", isFree: false },
          { title: "হাইড্রোজেন বর্ণালী ও রিডবার্গ সমীকরণ (Hydrogen Emission Spectra)", isFree: false },
        ],
      },
      {
        title: "মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন (Periodic Properties & Bonding)",
        description: "সংকরায়ন, বন্ধন কোণ, পোলারিটি ও ফাজানের নীতি।",
        lessons: [
          { title: "সংকরায়ন (sp, sp2, sp3, sp3d) ও অণুর জ্যামিতিক আকৃতি (Hybridization)", isFree: false },
          { title: "আয়নিক, সমযোজী ও হাইড্রোজেন বন্ধন (Chemical Bonds & H-Bonding)", isFree: false },
          { title: "তড়িৎ ঋণাত্মকতা ও ফাজানের পোলারায়ন নীতি (Fajans' Rules)", isFree: false },
        ],
      },
      {
        title: "জৈব রসায়ন ও বিক্রিয়ার কৌশল (Organic Chemistry Masterclass)",
        description: "IUPAC নামকরণ, সমাণুতা, ইলেকট্রোফিলিক ও নিউক্লিওফিলিক বিক্রিয়া।",
        lessons: [
          { title: "জৈব যৌগের নামকরণ ও সমাণুতা (IUPAC Nomenclature & Isomerism)", isFree: false },
          { title: "মুক্ত মূলক, ইলেকট্রোফাইল ও নিউক্লিওফাইল (Reaction Intermediates)", isFree: false },
          { title: "বেনজিন ও অ্যারোমেটিক প্রতিস্থাপন বিক্রিয়া (Electrophilic Aromatic Substitution)", isFree: false },
          { title: "অ্যালকোহল, অ্যালডিহাইড ও কিটোন বিক্রিয়া (Carbonyl Chemistry & Reactions)", isFree: false },
        ],
      },
      {
        title: "পরিমাণগত রসায়ন ও তড়িৎ রসায়ন (Quantitative & Electrochemistry)",
        description: "মোলারিটি, টাইট্রেশন এবং নার্নস্ট সমীকরণ।",
        lessons: [
          { title: "মোলারিটি, নরম্যালিটি ও টাইট্রেশন গাণিতিক (Acid-Base Titration Math)", isFree: false },
          { title: "নার্নস্টের সমীকরণ ও তড়িৎ রাসায়নিক কোষ (Nernst Equation & Electrochemical Cells)", isFree: false },
        ],
      },
    ],
  },
  {
    title: "HSC Biology Botany & Zoology Explorer — Core Concepts & Admissions",
    slug: "hsc-biology-explorer",
    category: "biology",
    thumbnailUrl: "/images/courses/biology-cover.jpg",
    description: "এইচএসসি উদ্ভিদবিজ্ঞান ও প্রাণিবিজ্ঞান পূর্ণাঙ্গ পাঠ্যক্রম। কোষের গঠন, জিনতত্ত্ব, শারীরতত্ত্ব এবং মেডিকেল ও ভার্সিটি ভর্তি পরীক্ষার জন্য প্রয়োজনীয় বিশেষ ট্রিকস।",
    modules: [
      {
        title: "কোষ ও কোষের গঠন (Cell Biology & Organelles)",
        description: "প্লাজমামেমব্রেন, ডিএনএ রেপ্লিকেশন এবং প্রোটিন সংশ্লেষণ।",
        lessons: [
          { title: "কোষ প্রাচীর, প্লাজমামেমব্রেন ও ফ্লুইড মোজাইক মডেল (Fluid Mosaic Model)", isFree: true },
          { title: "ডিএনএ গঠন ও দ্বি-সূত্রক প্রতিলিপন (DNA Structure & Replication)", isFree: false },
          { title: "প্রোটিন সংশ্লেষণ: ট্রান্সক্রিপশন ও ট্রান্সলেশন (Transcription & Translation)", isFree: false },
        ],
      },
      {
        title: "কোষ বিভাজন ও অণুজীব (Cell Division & Microbiology)",
        description: "মাইটোসিস, মিয়োসিস এবং ভাইরাস ও ব্যাকটেরিয়ার গঠন।",
        lessons: [
          { title: "মাইটোসিস ও মিয়োসিস কোষ বিভাজন এবং ক্রসিং ওভার (Mitosis, Meiosis & Crossing Over)", isFree: false },
          { title: "ভাইরাস ও ব্যাকটেরিয়ার গঠন ও অর্থনৈতিক গুরুত্ব (Virus & Bacteria Biology)", isFree: false },
        ],
      },
      {
        title: "মানব শারীরতত্ত্ব: রক্ত ও সংবহন (Human Physiology: Blood & Circulation)",
        description: "রক্তকণিকা, রক্ততঞ্চন এবং কার্ডিয়াক চক্র।",
        lessons: [
          { title: "রক্তের উপাদান, রক্তকণিকা ও রক্ততঞ্চন পদ্ধতি (Blood Elements & Coagulation)", isFree: false },
          { title: "হৃৎপিণ্ডের গঠন, কার্ডিয়াক চক্র ও রক্তচাপ নিয়ন্ত্রণ (Heart Anatomy & Cardiac Cycle)", isFree: false },
        ],
      },
      {
        title: "জিনতত্ত্ব ও বিবর্তন (Genetics, Heredity & Evolution)",
        description: "মেন্ডেলীয় বংশগতি, সেক্স-লিংকড রোগ এবং ডারউইনীয় তত্ত্ব।",
        lessons: [
          { title: "মেন্ডেলের সূত্র ও ব্যতিক্রমসমূহ (Mendelian Laws & Deviations)", isFree: false },
          { title: "সেক্স-লিংকড ডিসঅর্ডার ও প্রাকৃতিক নির্বাচন (Sex-Linked Inheritance)", isFree: false },
        ],
      },
    ],
  },
  {
    title: "HSC ICT & Computer Science Accelerator — Web Design & C Programming",
    slug: "hsc-ict-programming",
    category: "ict",
    thumbnailUrl: "/images/courses/ict-cover.jpg",
    description: "এইচএসসি তথ্য ও যোগাযোগ প্রযুক্তি (ICT) সম্পূর্ণ গাইড। সংখ্যা পদ্ধতি, লজিক গেট, এইচটিএমএল ওয়েব ডিজাইন এবং সি প্রোগ্রামিং ল্যাঙ্গুয়েজের প্র্যাকটিক্যাল কোডিং।",
    modules: [
      {
        title: "সংখ্যা পদ্ধতি ও ডিজিটাল লজিক (Number Systems & Digital Logic)",
        description: "বাইনারি রূপান্তর, ২ এর পরিপূরক এবং লজিক গেট সার্কিট।",
        lessons: [
          { title: "বাইনারি, অক্টাল, হেক্সাডেসিমেল রূপান্তর (Number System Conversions)", isFree: true },
          { title: "২ এর পরিপূরক ও বাইনারি যোগ-বিয়োগ (Two's Complement Arithmetic)", isFree: false },
          { title: "মৌলিক ও সার্বজনীন লজিক গেট ও ডিমরগান উপপাদ্য (Logic Gates & De Morgan's Law)", isFree: false },
        ],
      },
      {
        title: "ওয়েব ডিজাইন পরিচিতি ও HTML (Web Design & HTML5)",
        description: "এইচটিএমএল গঠন, ট্যাগ, ফর্ম ও টেবিল তৈরি।",
        lessons: [
          { title: "ওয়েবসাইটের কাঠামো ও মৌলিক এইচটিএমএল ট্যাগ (HTML Structure & Tags)", isFree: false },
          { title: "টেবিল, ফর্ম এবং হাইপারলিঙ্ক তৈরি (HTML Tables, Forms & Hyperlinks)", isFree: false },
        ],
      },
      {
        title: "সি প্রোগ্রামিং ভাষা (C Programming Fundamentals)",
        description: "চলক, কন্ডিশনাল স্টেটমেন্ট, লুপ ও অ্যারে প্রোগ্রামিং।",
        lessons: [
          { title: "অ্যালগরিদম, ফ্লোচার্ট ও সি ভাষার সিনট্যাক্স (Algorithms & C Syntax)", isFree: false },
          { title: "চলক, ডাটা টাইপ ও ইনপুট-আউটপুট (Variables & Data Types)", isFree: false },
          { title: "শর্তযুক্ত নিয়ন্ত্রণ ও লুপ (if-else, for, while loops)", isFree: false },
          { title: "অ্যারে ও ইউজার ডিফাইন ফাংশন (Arrays & Functions in C)", isFree: false },
        ],
      },
      {
        title: "ডাটাবেজ ম্যানেজমেন্ট সিস্টেম (DBMS & SQL)",
        description: "রিলেশনাল ডাটাবেজ মডেল এবং এসকিউএল কোয়েরি।",
        lessons: [
          { title: "রিলেশনাল ডাটাবেজ মডেল ও প্রাইমারি কি (RDBMS & Primary Keys)", isFree: false },
          { title: "বেসিক এসকিউএল কোয়েরি (SQL Queries & Filtering)", isFree: false },
        ],
      },
    ],
  },
  {
    title: "HSC Higher Mathematics — Calculus, Trigonometry & Coordinate Geometry",
    slug: "hsc-higher-mathematics",
    category: "mathematics",
    thumbnailUrl: "/images/courses/math-cover.jpg",
    description: "এইচএসসি উচ্চতর গণিত ১ম ও ২য় পত্রের মাস্টারকোর্স। ম্যাট্রিক্স, সরলরেখা, ত্রিকোণমিতি, ডিফারেনশিয়াল ও ইন্টিগ্রাল ক্যালকুলাসের শর্টকাট টেকনিক ও বোর্ড প্রশ্ন সমাধান।",
    modules: [
      {
        title: "ম্যাট্রিক্স ও নির্ণায়ক (Matrices & Determinants)",
        description: "ম্যাট্রিক্সের গুণন, নির্ণায়ক বিস্তার এবং ক্র্যামারের নিয়ম।",
        lessons: [
          { title: "ম্যাট্রিক্সের প্রকারভেদ ও গুণন নিয়ম (Matrix Types & Multiplication)", isFree: true },
          { title: "বিপরীত ম্যাট্রিক্স ও ক্র্যামারের নিয়ম (Inverse Matrix & Cramer's Rule)", isFree: false },
        ],
      },
      {
        title: "সরলরেখা ও স্থানাঙ্ক জ্যামিতি (Straight Lines & Geometry)",
        description: "পোলার স্থানাঙ্ক, রেখার সমীকরণ ও লম্ব দূরত্ব।",
        lessons: [
          { title: "কার্তেসীয় ও পোলার স্থানাঙ্ক এবং দূরত্ব নির্ণয় (Cartesian & Polar Coordinates)", isFree: false },
          { title: "সরলরেখার বিভিন্ন সমীকরণ ও ঢাল নির্ণয় (Line Equations & Slope)", isFree: false },
          { title: "দুই রেখার মধ্যবর্তী কোণ ও লম্ব দূরত্ব (Angle Between Lines & Perpendicular Distance)", isFree: false },
        ],
      },
      {
        title: "সংযুক্ত কোণের ত্রিকোণমিতিক অনুপাত (Trigonometric Functions)",
        description: "ত্রিকোণমিতিক রূপান্তর সূত্র এবং বিপরীত ত্রিকোণমিতিক ফাংশন।",
        lessons: [
          { title: "যৌগিক কোণ ও গুণিতক কোণের ত্রিকোণমিতিক সূত্রাবলী (Compound Angle Formulae)", isFree: false },
          { title: "বিপরীত বৃত্তীয় ফাংশন ও সমীকরণ সমাধান (Inverse Trig Functions & Solutions)", isFree: false },
        ],
      },
      {
        title: "অন্তরীকরণ ও যোগজীকরণ (Differential & Integral Calculus)",
        description: "লিমিট, ডিফারেনশিয়েশন, ইন্টিগ্রেশন ও ক্ষেত্রফল নির্ণয়।",
        lessons: [
          { title: "লিমিট ও মূল নিয়মে অন্তরজ (Limits & First Principles)", isFree: false },
          { title: "অন্তরীকরণের নিয়ম ও চেইন রুল (Derivative Chain Rule)", isFree: false },
          { title: "স্পর্শক, অভিলম্ব ও চরম মান নির্ণয় (Tangents & Maxima/Minima)", isFree: false },
          { title: "নির্দিষ্ট ও অনির্দিষ্ট যোগজীকরণ এবং ক্ষেত্রফল (Integration & Area Calculations)", isFree: false },
        ],
      },
    ],
  },
];

async function seedCurriculum() {
  console.log("=== SEEDING INSIDEJIBON 5 CORE COURSES ===");

  // Find a valid teacher user
  const allUsers = await db.select().from(users);
  let teacher = allUsers.find((u) => u.role === "teacher" || u.role === "admin");

  if (!teacher) {
    console.log("Creating default instructor user Tanvir Hasan Jibon...");
    const [created] = await db.insert(users).values({
      id: "user_tanvir_hasan_jibon",
      email: "tanvir.jibon@insidejibon.dev",
      name: "Tanvir Hasan Jibon",
      imageUrl: "/jibon.jpg",
      role: "teacher",
    }).returning();
    teacher = created;
  } else {
    console.log(`Using existing instructor: ${teacher.name} (${teacher.id})`);
    // Ensure image is set
    if (!teacher.imageUrl) {
      await db.update(users).set({ imageUrl: "/jibon.jpg" }).where(eq(users.id, teacher.id));
    }
  }

  // Clear existing courses (if any)
  console.log("Deleting old courses...");
  const oldCourses = await db.select().from(courses);
  if (oldCourses.length > 0) {
    for (const c of oldCourses) {
      const mods = await db.select().from(courseModules).where(eq(courseModules.courseId, c.id));
      for (const m of mods) {
        await db.delete(lessons).where(eq(lessons.moduleId, m.id));
      }
      await db.delete(courseModules).where(eq(courseModules.courseId, c.id));
      await db.delete(courses).where(eq(courses.id, c.id));
    }
    console.log(`Deleted ${oldCourses.length} previous courses.`);
  }

  // Insert 5 Core Courses
  for (const cSeed of COURSES_TO_SEED) {
    console.log(`\nCreating Course: ${cSeed.title}...`);
    const [newCourse] = await db
      .insert(courses)
      .values({
        teacherId: teacher.id,
        title: cSeed.title,
        slug: cSeed.slug,
        description: cSeed.description,
        category: cSeed.category,
        thumbnailUrl: cSeed.thumbnailUrl,
        status: "published",
        publishedAt: new Date(),
      })
      .returning();

    console.log(`✓ Course created with ID ${newCourse.id}, slug: ${newCourse.slug}`);

    for (let mIdx = 0; mIdx < cSeed.modules.length; mIdx++) {
      const mSeed = cSeed.modules[mIdx];
      const [newMod] = await db
        .insert(courseModules)
        .values({
          courseId: newCourse.id,
          title: mSeed.title,
          description: mSeed.description,
          position: mIdx + 1,
        })
        .returning();

      for (let lIdx = 0; lIdx < mSeed.lessons.length; lIdx++) {
        const lSeed = mSeed.lessons[lIdx];
        await db.insert(lessons).values({
          moduleId: newMod.id,
          title: lSeed.title,
          description: lSeed.description ?? `Lecture ${lIdx + 1} for ${mSeed.title}`,
          content: `# ${lSeed.title}\n\nস্বাগতম **InsideJibon** এর এই লেসনে। এই পাঠে আমরা তাত্ত্বিক বিশ্লেষণ, গাণিতিক সমাধান এবং বাস্তব প্রয়োগ বিস্তারিত আলোচনা করব।`,
          isFree: Boolean(lSeed.isFree),
          position: lIdx + 1,
        });
      }
    }
    console.log(`✓ Added ${cSeed.modules.length} modules and ${cSeed.modules.reduce((a, m) => a + m.lessons.length, 0)} lessons.`);
  }

  console.log("\n=======================================================");
  console.log("🎉 ALL 5 CORE COURSES SEEDED & PUBLISHED SUCCESSFULLY! 🎉");
  console.log("=======================================================");
}

seedCurriculum().catch((err) => {
  console.error("SEED ERROR:", err);
  process.exit(1);
});
