# InsideJibon — Academic Modernism Component Blueprint Library (`COMPONENTS.md`)

This library provides production-ready, copy-pasteable HTML & Tailwind CSS reference implementations for the core visual components in InsideJibon.

---

## Table of Components

1. [Academic Bento Card](#1-academic-bento-card)
2. [Public Course Bento Card](#2-public-course-bento-card)
3. [Student Enrolled Course Card](#3-student-enrolled-course-card)
4. ["Continue Learning" Hero Bento Card](#4-continue-learning-hero-bento-card)
5. [Exam Live Countdown Timer](#5-exam-live-countdown-timer)
6. [Exam Question Navigator Grid](#6-exam-question-navigator-grid)
7. [Multiple Choice Question (MCQ) Radio Option](#7-multiple-choice-question-mcq-radio-option)
8. [Exam Scorecard Result Summary](#8-exam-scorecard-result-summary)
9. [Teacher Metric Bento Card with Watermark](#9-teacher-metric-bento-card-with-watermark)
10. [Curriculum Module Accordion](#10-curriculum-module-accordion)
11. [Discussion Comment Item](#11-discussion-comment-item)
12. [Bilingual Language Switcher](#12-bilingual-language-switcher)

---

### 1. Academic Bento Card

The core surface container of InsideJibon: 1px crisp border, zero harsh shadows, subtle hover lift.

```html
<!-- Interactive Bento Card -->
<div class="bento-card p-6 flex flex-col justify-between">
  <div>
    <span class="text-xs font-semibold uppercase tracking-wider text-secondary">Subject Level</span>
    <h3 class="mt-1 font-display text-lg font-bold tracking-tight text-on-surface">Card Title</h3>
    <p class="mt-2 text-sm leading-relaxed text-on-surface-variant">Card description text goes here with clear, legible typography.</p>
  </div>
  <div class="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
    <span class="text-xs text-secondary">Meta information</span>
    <button class="text-xs font-bold text-primary hover:underline">Action →</button>
  </div>
</div>

<!-- Static Non-Hover Bento Container -->
<div class="bento-card-static p-6">
  <h3 class="font-display text-base font-bold text-on-surface">Section Title</h3>
</div>
```

---

### 2. Public Course Bento Card

Used on the marketing homepage and `/courses` catalog page.

```html
<a href="/courses/physics-mechanics" class="bento-card group flex flex-col overflow-hidden">
  <!-- 16:10 Thumbnail Container with Level Badge -->
  <div class="relative aspect-[16/10] overflow-hidden bg-surface-container-high border-b border-outline-variant">
    <img src="/placeholder-thumb.jpg" alt="Course Title" class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
    <div class="absolute top-3 left-3 flex gap-1.5">
      <span class="rounded-full bg-surface-container-lowest/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-outline-variant">
        HSC Prep
      </span>
    </div>
  </div>

  <!-- Body -->
  <div class="flex flex-1 flex-col p-5">
    <span class="text-[11px] font-bold uppercase tracking-wider text-secondary">পদার্থবিজ্ঞান · PHYSICS</span>
    <h3 class="mt-1 font-display text-base font-bold tracking-tight text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
      গতিবিদ্যা ও নিউটনিয়ান বলবিদ্যা (Kinematics & Newtonian Mechanics)
    </h3>
    <p class="mt-2 text-xs leading-relaxed text-on-surface-variant line-clamp-2">
      এইচএসসি ও বিশ্ববিদ্যালয় ভর্তি পরীক্ষার জন্য তাত্ত্বিক আলোচনা এবং গাণিতিক সমস্যার সমাধান।
    </p>

    <!-- Footer -->
    <div class="mt-auto pt-4 border-t border-outline-variant flex items-center justify-between">
      <div class="flex items-center gap-2">
        <img src="/jibon.jpg" alt="Tanvir Hasan Jibon" class="h-6 w-6 rounded-full object-cover border border-outline-variant" />
        <span class="text-xs font-medium text-secondary">Tanvir Hasan Jibon</span>
      </div>
      <span class="rounded bg-primary-container/10 px-2 py-0.5 text-[10px] font-bold text-primary">100% Free</span>
    </div>
  </div>
</a>
```

---

### 3. Student Enrolled Course Card

Used on the student dashboard and `/student/courses` page.

```html
<a href="/student/courses/c123/learn" class="bento-card group flex flex-col overflow-hidden">
  <div class="relative aspect-video overflow-hidden bg-surface-container-high border-b border-outline-variant">
    <img src="/placeholder-thumb.jpg" alt="Course Title" class="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
    <div class="absolute top-3 left-3">
      <span class="rounded-full bg-amber-500 text-white px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs">
        In Progress
      </span>
    </div>
  </div>

  <div class="flex flex-1 flex-col p-5">
    <h3 class="font-display text-base font-bold tracking-tight text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
      জৈব রসায়ন পরিচিতি (Applied Organic Chemistry)
    </h3>

    <!-- Progress Track -->
    <div class="mt-4 flex flex-col gap-1.5">
      <div class="flex justify-between text-xs font-semibold text-secondary">
        <span>Lesson 4 of 12</span>
        <span>34%</span>
      </div>
      <div class="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div class="h-full bg-primary rounded-full transition-all duration-500" style="width: 34%"></div>
      </div>
    </div>

    <!-- CTA Footer -->
    <div class="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between">
      <span class="text-[11px] text-secondary">Last accessed 2 days ago</span>
      <span class="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:underline">
        Continue →
      </span>
    </div>
  </div>
</a>
```

---

### 4. "Continue Learning" Hero Bento Card

Featured banner on top of the Student Dashboard.

```html
<section class="bento-card overflow-hidden flex flex-col sm:flex-row">
  <!-- Left Media -->
  <div class="sm:w-2/5 h-48 sm:h-auto relative bg-surface-container-high overflow-hidden shrink-0">
    <img src="/placeholder-thumb.jpg" alt="Course" class="w-full h-full object-cover" />
    <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
      <span class="rounded-full bg-primary-container px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-primary-container">
        In Progress
      </span>
    </div>
  </div>

  <!-- Right Details -->
  <div class="sm:w-3/5 p-6 flex flex-col justify-between">
    <div>
      <span class="text-xs font-semibold text-secondary uppercase tracking-wider">Continue Learning</span>
      <h2 class="mt-1 font-display text-xl font-bold tracking-tight text-on-surface line-clamp-1">
        গতিবিদ্যা ও নিউটনিয়ান বলবিদ্যা
      </h2>
      <p class="mt-1 text-xs text-secondary truncate">
        Current Lesson: ৩.২ ঘর্ষণ বল ও রৈখিক ভরবেগ সংরক্ষণ
      </p>
    </div>

    <div class="mt-5">
      <div className="flex justify-between items-center text-xs font-semibold text-secondary mb-1.5">
        <span>65% Complete</span>
        <span>Lesson 8 of 12</span>
      </div>
      <div class="w-full bg-surface-container-highest rounded-full h-2 mb-4 overflow-hidden">
        <div class="bg-primary h-full rounded-full transition-all duration-500" style="width: 65%"></div>
      </div>

      <a href="/student/courses/c123/learn?lesson=l456" class="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-bold text-on-primary shadow-xs hover:bg-primary-container transition-colors w-full sm:w-auto">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Resume Course
      </a>
    </div>
  </div>
</section>
```

---

### 5. Exam Live Countdown Timer

Displays the remaining time in an active examination with warning states.

```html
<!-- Normal State (> 15 mins) -->
<div class="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-1.5 text-xs font-mono font-bold text-primary" role="timer" aria-live="polite">
  <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
  <span>24:50 Remaining</span>
</div>

<!-- Urgent Warning State (< 5 mins) -->
<div class="flex items-center gap-2 rounded-lg border border-error bg-error-container/40 px-3 py-1.5 text-xs font-mono font-bold text-error animate-pulse" role="timer" aria-live="polite">
  <svg class="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
  <span>03:15 Remaining</span>
</div>
```

---

### 6. Exam Question Navigator Grid

Interactive 1..N grid allowing students to jump to any question and inspect state.

```html
<div class="grid grid-cols-5 gap-2">
  <!-- 1. Answered Question (Solid Primary) -->
  <button class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold shadow-2xs">
    1
  </button>

  <!-- 2. Current Active Question (Primary Fixed Background + Bold Border) -->
  <button class="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-primary bg-primary-fixed text-on-primary-fixed text-xs font-bold">
    2
  </button>

  <!-- 3. Marked for Review (Tertiary Gold Badge + Flag Icon) -->
  <button class="relative flex h-10 w-10 items-center justify-center rounded-lg border border-tertiary bg-tertiary-fixed text-on-tertiary-fixed text-xs font-bold">
    3
    <span class="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500"></span>
  </button>

  <!-- 4. Unanswered (Clean Outline) -->
  <button class="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-secondary text-xs font-semibold hover:border-primary">
    4
  </button>
</div>
```

---

### 7. Multiple Choice Question (MCQ) Radio Option

Large, accessible clickable radio card for examination questions.

```html
<!-- Selected State -->
<label class="flex cursor-pointer items-center gap-4 rounded-xl border-2 border-primary bg-primary-fixed/40 p-4 transition-colors">
  <input type="radio" name="question-1" value="opt-a" class="h-4 w-4 text-primary border-outline focus:ring-primary" checked />
  <div class="flex-1">
    <div class="flex items-center gap-2">
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">A</span>
      <span class="text-sm font-semibold text-on-surface">Option text statement goes here</span>
    </div>
  </div>
</label>

<!-- Default Unselected State -->
<label class="flex cursor-pointer items-center gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low hover:border-primary/50">
  <input type="radio" name="question-1" value="opt-b" class="h-4 w-4 text-primary border-outline focus:ring-primary" />
  <div class="flex-1">
    <div class="flex items-center gap-2">
      <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-secondary text-xs font-bold">B</span>
      <span class="text-sm font-medium text-on-surface">Another choice statement here</span>
    </div>
  </div>
</label>
```

---

### 8. Exam Scorecard Result Summary

Header summary card displayed upon exam submission.

```html
<div class="bento-card-static p-8 text-center flex flex-col items-center">
  <span class="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1 text-xs font-bold uppercase tracking-wider mb-4">
    ✓ PASSED · উত্তীর্ণ
  </span>
  <h1 class="font-display text-3xl font-bold tracking-tight text-on-surface">Examination Complete</h1>
  <p class="mt-1 text-sm text-secondary">Newtonian Mechanics Module Assessment</p>

  <div class="mt-6 flex items-baseline gap-2">
    <span class="font-display text-5xl font-bold text-primary">85%</span>
    <span class="text-sm text-secondary font-semibold">(17 / 20 Points)</span>
  </div>

  <div class="mt-8 grid grid-cols-3 gap-4 w-full max-w-md">
    <div class="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
      <p class="font-display text-xl font-bold text-emerald-600">17</p>
      <span class="text-[11px] font-semibold text-secondary">Correct</span>
    </div>
    <div class="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
      <p class="font-display text-xl font-bold text-red-600">3</p>
      <span class="text-[11px] font-semibold text-secondary">Incorrect</span>
    </div>
    <div class="p-3 rounded-lg bg-surface-container-low border border-outline-variant">
      <p class="font-display text-xl font-bold text-secondary">0</p>
      <span class="text-[11px] font-semibold text-secondary">Skipped</span>
    </div>
  </div>
</div>
```

---

### 9. Teacher Metric Bento Card with Watermark

Primary KPI card for educator dashboard with subtle watermark icon.

```html
<div class="bento-card-static p-5 relative overflow-hidden group hover:border-primary/40 transition-colors">
  <!-- 10% Opacity Background Watermark Icon -->
  <div class="absolute top-2 right-2 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
    <svg class="h-14 w-14 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  </div>
  
  <span class="text-xs font-semibold uppercase tracking-wider text-secondary">Total Enrolled Students</span>
  <p class="mt-2 font-display text-3xl font-bold text-primary">1,240</p>
  <span class="mt-1 block text-xs text-on-surface-variant">Across 8 active courses</span>
</div>
```

---

### 10. Curriculum Module Accordion

Module tree item with lesson status icons.

```html
<div class="border-b border-outline-variant pb-2">
  <div class="flex items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-secondary">
    <span>Module 1: ভৌত জগত ও পরিমাপ</span>
    <span>4 Lessons</span>
  </div>
  <ul class="space-y-0.5">
    <!-- Completed Lesson -->
    <li>
      <a href="#" class="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container-low transition-colors">
        <svg class="h-4 w-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span class="truncate flex-1">১.১ পরিমাপের ত্রুটি ও নির্ভুলতা</span>
        <span class="text-[10px] text-secondary font-mono">18m</span>
      </a>
    </li>

    <!-- Active Lesson -->
    <li>
      <a href="#" class="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold text-primary bg-primary-fixed/40 border-l-4 border-primary">
        <svg class="h-4 w-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <span class="truncate flex-1">১.২ মাত্রিক বিশ্লেষণ ও সমীকরণ প্রতিপাদন</span>
        <span class="text-[10px] text-primary font-mono">24m</span>
      </a>
    </li>
  </ul>
</div>
```

---

### 11. Discussion Comment Item

Threaded lesson comment with author role badge and delete control.

```html
<div class="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant space-y-2">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2.5">
      <div class="h-8 w-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-display text-xs font-bold">
        TH
      </div>
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-on-surface">তানভীর হাসান জীবন</span>
          <span class="rounded-full bg-tertiary-container px-2 py-0.5 text-[9px] font-bold text-on-tertiary-container uppercase">
            Teacher
          </span>
        </div>
        <span class="text-[10px] text-secondary">2 hours ago</span>
      </div>
    </div>
    <button class="text-xs text-secondary hover:text-error transition-colors" title="Delete">
      Delete
    </button>
  </div>
  <p class="text-xs text-on-surface-variant leading-relaxed pl-10">
    এই সমীকরণে ত্বরণের মান সর্বদা ধ্রুবক ধরে হিসেব করতে হবে। কোনো দ্বিমত থাকলে বলো।
  </p>
</div>
```

---

### 12. Bilingual Language Switcher

Header language toggle pill for instant EN / BN switching.

```html
<div class="inline-flex rounded-lg border border-outline-variant bg-surface-container-lowest p-0.5">
  <button class="rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-on-primary shadow-2xs">
    বাং
  </button>
  <button class="rounded-md px-2.5 py-1 text-xs font-medium text-secondary hover:text-on-surface transition-colors">
    EN
  </button>
</div>
```
