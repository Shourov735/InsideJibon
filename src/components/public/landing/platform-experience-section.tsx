"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Container } from "@/components/shared/ui/container";
import {
  ArrowRightIcon,
  CheckIcon,
  ClipboardIcon,
  UsersIcon,
  VideoIcon,
} from "@/components/shared/ui/icons";

interface PlatformExperienceSectionProps {
  isBn: boolean;
}

export function PlatformExperienceSection({ isBn }: PlatformExperienceSectionProps) {
  const [activeFeature, setActiveFeature] = useState<number>(0);

  const features = [
    {
      id: "live-classes",
      tag: "LOW-LATENCY STREAMING",
      titleBn: "ইন্টারেক্টিভ লাইভ ক্লাসরুম",
      titleEn: "Interactive Live Classrooms",
      descBn:
        "ক্লাউডফ্লেয়ার ডিউরেবল অবজেক্টসের মাধ্যমে রিয়েল-টাইম লাইভ ক্লাস। কোনো প্রকার বাফারিং ছাড়া সরাসরি প্রশ্ন করা, হ্যান্ড-রেইজিং এবং ক্লাসের স্বয়ংক্রিয় ক্লাউড রেকর্ডিং সুবিধা।",
      descEn:
        "Ultra-low latency live classrooms coordinated via Cloudflare Durable Objects. Real-time synchronized chat, live hand-raising queue, and automatic cloud replays on Cloudflare R2.",
      icon: <VideoIcon size={20} />,
      badge: "Real-time WebSockets",
      previewType: "live",
    },
    {
      id: "exams",
      tag: "PROCTORED TESTING",
      titleBn: "বোর্ড ও ভর্তি স্ট্যান্ডার্ড পরীক্ষা ইঞ্জিন",
      titleEn: "Proctored Exam Architecture",
      descBn:
        "বোর্ড পরীক্ষার আদলে সময়াবদ্ধ MCQ ও লিখিত মডেল টেস্ট। ট্যাব-সুইচ ট্র্যাকিং, নেগেটিভ মার্কিং হিসাব এবং পরীক্ষা শেষ হওয়ার সাথে সাথেই বিস্তারিত ব্যাখ্যাসহ সমাধান বিশ্লেষণ।",
      descEn:
        "Authentic board-standard examinations with strict countdown timers, attempt snapshots, anti-cheat detection, negative marking calculation, and instant step-by-step solutions.",
      icon: <ClipboardIcon size={20} />,
      badge: "Snapshot-Grade Engine",
      previewType: "exam",
    },
    {
      id: "assignments",
      tag: "TEACHER REVIEW",
      titleBn: "হাতে-কলমে অ্যাসাইনমেন্ট মূল্যায়ন",
      titleEn: "Handwritten Assignment Review",
      descBn:
        "খাতায় সমাধান করা অঙ্ক বা ব্যাখ্যার ছবি সরাসরি মোবাইল থেকে আপলোড। শিক্ষকের হাতে আঁকা মার্জিন ফিডব্যাক, রুব্রিক মার্কিং এবং নির্দিষ্ট ভুল সংশোধনের পরামর্শ।",
      descEn:
        "Students solve equations on physical paper and upload captures from any mobile device. Teachers provide individualized margin annotations, rubric scoring, and clear correction advice.",
      icon: <CheckIcon size={20} />,
      badge: "Line-by-Line Feedback",
      previewType: "assignment",
    },
    {
      id: "parent-portal",
      tag: "STUDENT TRANSPARENCY",
      titleBn: "স্বতন্ত্র অভিভাবক পর্যবেক্ষণ পোর্টাল",
      titleEn: "Dedicated Guardian Portal",
      descBn:
        "শিক্ষার্থীর পড়াশোনার ধারাবাহিকতা, ক্লাসে উপস্থিতি, হোমওয়ার্ক মার্কস ও পরীক্ষার অগ্রগতি পর্যবেক্ষণের জন্য অভিভাবকের স্বতন্ত্র ড্যাশবোর্ড (/parent)।",
      descEn:
        "Dedicated guardian workspace at /parent allowing parents to monitor lecture completion, live class attendance, weekly study streaks, and exam score trajectories transparently.",
      icon: <UsersIcon size={20} />,
      badge: "Peace of Mind",
      previewType: "parent",
    },
  ];

  const current = features[activeFeature];

  return (
    <section id="experience" className="py-16 sm:py-24 border-t border-outline-variant/60 bg-surface-1 dark:bg-surface-1">
      <Container size="xl">
        {/* Section Eyebrow & Title */}
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/70 bg-blue-50/80 px-3.5 py-0.5 text-xs font-semibold text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
            <span>{isBn ? "প্ল্যাটফর্ম সক্ষমতা" : "Platform Capabilities"}</span>
          </div>

          <h2 className="mt-3 font-serif text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            {isBn ? "প্রকৃত অধ্যয়নের জন্য সম্পূর্ণ ইকোসিস্টেম" : "Built for Serious Academic Discipline"}
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-ink-500 sm:text-base dark:text-ink-400">
            {isBn
              ? "ইনসাইডজীবন কেবল ভিডিও দেখার সাইট নয় — এটি সুশৃঙ্খল ক্লাস, সময়াবদ্ধ পরীক্ষা ও নিয়মিত মূল্যায়নের একটি পরিপূর্ণ একাডেমিক পরিকাঠামো।"
              : "InsideJibon is an end-to-end learning infrastructure combining interactive live teaching, board exam rigor, handwritten homework reviews, and family visibility."}
          </p>
        </div>

        {/* Interactive Showcase Grid */}
        <div className="mt-12 grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-12">
          
          {/* Left Column: Interactive Feature Selectors */}
          <div className="space-y-3 lg:col-span-5">
            {features.map((feat, idx) => {
              const isActive = activeFeature === idx;
              return (
                <button
                  key={feat.id}
                  type="button"
                  onClick={() => setActiveFeature(idx)}
                  className={`group relative flex w-full flex-col items-start rounded-2xl border p-5 text-left transition-all duration-200 ${
                    isActive
                      ? "border-blue-600 bg-surface-0 shadow-md ring-1 ring-blue-600/20 dark:bg-surface-0 dark:border-blue-500"
                      : "border-outline-variant/60 bg-surface-0/60 hover:border-outline-variant hover:bg-surface-0 dark:bg-surface-2/40 dark:hover:bg-surface-2/70"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "bg-surface-2 text-ink-700 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-surface-3"
                        }`}
                      >
                        {feat.icon}
                      </div>

                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {feat.badge}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-semibold ${
                        isActive ? "text-blue-600 font-bold" : "text-ink-400"
                      }`}
                    >
                      0{idx + 1}
                    </span>
                  </div>

                  <h3 className="mt-3 font-display text-base font-bold text-ink-900 sm:text-lg">
                    {isBn ? feat.titleBn : feat.titleEn}
                  </h3>

                  <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-ink-500 line-clamp-2 dark:text-ink-400">
                    {isBn ? feat.descBn : feat.descEn}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Live Feature Interactive Mock-up Canvas */}
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-3xl border border-outline-variant/80 bg-surface-0 p-5 sm:p-8 shadow-academic dark:bg-surface-0 dark:border-outline-variant/40">
              
              {/* Top Bar of the Canvas */}
              <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-xs font-medium text-ink-400">
                    insidejibon.com/{current.id}
                  </span>
                </div>

                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  {current.tag}
                </span>
              </div>

              {/* Dynamic Feature Previews */}
              <div className="mt-6 min-h-[300px]">
                
                {/* 1. Live Class Feature Preview */}
                {current.previewType === "live" && (
                  <div className="space-y-4 animate-in fade-in zoom-in-98 duration-200">
                    {/* Simulated live video stream stage */}
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-950 text-white shadow-inner flex flex-col justify-between p-4">
                      {/* Live header */}
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                          LIVE CLASSROOM
                        </span>
                        <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/80">
                          Room: cf-do-phy-301
                        </span>
                      </div>

                      {/* Instructor Whiteboard Formula */}
                      <div className="text-center font-mono">
                        <div className="text-sm sm:text-base text-sky-400 font-bold">
                          v² = u² + 2as &nbsp; | &nbsp; s = ut + ½at²
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          {isBn ? "গতিবিদ্যার মৌলিক সমীকরণ ও প্রতিপাদন" : "Derivation of Fundamental Equations of Motion"}
                        </div>
                      </div>

                      {/* Live Interaction Controls */}
                      <div className="flex items-center justify-between border-t border-white/15 pt-2 text-xs">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span>●</span> 52 {isBn ? "শিক্ষার্থী সক্রিয়" : "active students"}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-blue-600/90 px-2.5 py-1 text-[11px] font-bold text-white">
                            ✋ {isBn ? "হাত তুলুন" : "Raise Hand"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Chat Bubble simulation */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-outline-variant/60 bg-surface-1 p-3 text-xs">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-[10px]">
                        T
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-ink-900">Tanvir Hasan Jibon (Educator)</div>
                        <p className="mt-0.5 text-ink-500">
                          {isBn
                            ? "ত্বরণ 'a' ঋণাত্মক হলে গতির প্রকৃতি কী হবে? কমেন্টে উত্তর লেখো।"
                            : "Notice how deceleration affects the trajectory when 'a' is negative."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Proctored Exam Feature Preview */}
                {current.previewType === "exam" && (
                  <div className="space-y-4 animate-in fade-in zoom-in-98 duration-200">
                    <div className="rounded-2xl border border-outline-variant/70 bg-surface-1 p-5">
                      <div className="flex items-center justify-between border-b border-outline-variant/50 pb-3">
                        <div className="font-display text-sm font-bold text-ink-900">
                          {isBn ? "এইচএসসি বোর্ড স্ট্যান্ডার্ড মডেল টেস্ট — পদার্থবিজ্ঞান" : "HSC Board Standard Model Test — Physics"}
                        </div>
                        <div className="rounded-lg bg-amber-100 px-2.5 py-1 font-mono text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                          ⏱ 18:42 বাকি
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="font-semibold text-xs text-blue-600 uppercase">
                          {isBn ? "প্রশ্ন ০৪ / ২৫" : "Question 04 of 25"}
                        </div>
                        <p className="mt-1 font-display text-sm font-bold text-ink-900">
                          {isBn
                            ? "একটি বস্তুকে ৩০ মি/সে বেগে খাড়া ওপরের দিকে নিক্ষেপ করলে কত সময় পর ভূমিতে ফিরে আসবে? (g = 9.8 m/s²)"
                            : "An object is projected vertically upward at 30 m/s. How long before it returns to ground? (g = 9.8 m/s²)"}
                        </p>

                        <div className="mt-3 space-y-2">
                          {[
                            { id: "A", text: "3.06 s", correct: false },
                            { id: "B", text: "6.12 s", correct: true },
                            { id: "C", text: "9.80 s", correct: false },
                            { id: "D", text: "4.50 s", correct: false },
                          ].map((opt) => (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-3 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                                opt.correct
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "border-outline-variant/60 bg-surface-0 text-ink-700"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                  opt.correct
                                    ? "bg-emerald-600 text-white"
                                    : "bg-surface-2 text-ink-500"
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                              {opt.correct && (
                                <span className="ml-auto font-mono text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  ✓ T = 2u/g = 6.12s
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Handwritten Assignment Preview */}
                {current.previewType === "assignment" && (
                  <div className="space-y-4 animate-in fade-in zoom-in-98 duration-200">
                    <div className="rounded-2xl border border-outline-variant/70 bg-surface-1 p-5">
                      <div className="flex items-center justify-between border-b border-outline-variant/50 pb-3">
                        <span className="font-display text-sm font-bold text-ink-900">
                          {isBn ? "লিখিত খাতার মার্কআপ ও শিক্ষক মূল্যায়ন" : "Handwritten Assignment Review"}
                        </span>
                        <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          Score: 10 / 10
                        </span>
                      </div>

                      {/* Paper Simulation */}
                      <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 font-mono text-xs text-amber-950 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-200">
                        <div className="text-[11px] text-zinc-500 mb-2">
                          [Student Upload: page-01.jpg — Mathematics Homework]
                        </div>
                        <div className="space-y-1.5">
                          <div>∫ (2x / (x² + 1)) dx</div>
                          <div>Let u = x² + 1 =&gt; du = 2x dx</div>
                          <div>= ∫ (1 / u) du = ln|u| + C</div>
                          <div className="font-bold text-blue-700 dark:text-blue-400">= ln(x² + 1) + C</div>
                        </div>

                        {/* Teacher's Margin Note Callout */}
                        <div className="mt-3 rounded-lg border border-emerald-400 bg-white/90 p-2.5 text-xs text-emerald-900 shadow-xs dark:bg-emerald-950/60 dark:text-emerald-100">
                          <span className="font-bold">✓ Teacher Note:</span>{" "}
                          {isBn
                            ? "চমৎকার প্রতিপাদন! ইন্টিগ্রেশন ধ্রুবক 'C' স্পষ্ট উল্লেখ করেছ। পূর্ণ নম্বর।"
                            : "Flawless substitution and boundary condition handling! Full points awarded."}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Guardian Portal Preview */}
                {current.previewType === "parent" && (
                  <div className="space-y-4 animate-in fade-in zoom-in-98 duration-200">
                    <div className="rounded-2xl border border-outline-variant/70 bg-surface-1 p-5">
                      <div className="flex items-center justify-between border-b border-outline-variant/50 pb-3">
                        <div>
                          <div className="font-display text-sm font-bold text-ink-900">
                            {isBn ? "অভিভাবক ওভারভিউ — সৌরভ আহমেদ (১০ম শ্রেণি)" : "Guardian Overview — Shourov Ahmed (Class 10)"}
                          </div>
                          <div className="text-[11px] text-ink-500">
                            {isBn ? "সাপ্তাহিক রিপোর্ট ও উপস্থিতি" : "Weekly Activity & Attendance"}
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          {isBn ? "উপস্থিতি: ৯৬%" : "Attendance: 96%"}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-xl border border-outline-variant/60 bg-surface-0 p-3">
                          <div className="font-mono text-lg font-bold text-blue-600">১২</div>
                          <div className="text-[11px] text-ink-500">{isBn ? "ক্লাস সম্পন্ন" : "Lectures"}</div>
                        </div>
                        <div className="rounded-xl border border-outline-variant/60 bg-surface-0 p-3">
                          <div className="font-mono text-lg font-bold text-emerald-600">৮৮%</div>
                          <div className="text-[11px] text-ink-500">{isBn ? "গড় পরীক্ষার নম্বর" : "Avg Score"}</div>
                        </div>
                        <div className="rounded-xl border border-outline-variant/60 bg-surface-0 p-3">
                          <div className="font-mono text-lg font-bold text-amber-600">৫ দিন</div>
                          <div className="text-[11px] text-ink-500">{isBn ? "পড়ার ধারাবাহিকতা" : "Streak"}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Callout */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-outline-variant/50 pt-4">
                <span className="text-xs text-ink-500 font-medium dark:text-ink-400">
                  {isBn
                    ? "সকল শিক্ষার্থী ও অভিভাবকের জন্য সম্পূর্ণ স্বচ্ছ ডিজিটাল অভিজ্ঞতা।"
                    : "100% transparent academic visibility for students and families."}
                </span>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  <span>{isBn ? "এখনই যুক্ত হোন" : "Get started today"}</span>
                  <ArrowRightIcon size={12} />
                </Link>
              </div>

            </div>
          </div>

        </div>
      </Container>
    </section>
  );
}
