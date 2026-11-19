"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BookIcon,
  CheckIcon,
  ClipboardIcon,
  HomeIcon,
  PlayIcon,
  UsersIcon,
  VideoIcon,
  ChartIcon,
  ArrowRightIcon,
} from "@/components/shared/ui/icons";

interface HeroInteractiveDashboardProps {
  isBn: boolean;
}

export function HeroInteractiveDashboard({ isBn }: HeroInteractiveDashboardProps) {
  const [activeTab, setActiveTab] = useState<"home" | "courses" | "live" | "exams">("home");

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Ambient decorative glow behind the card */}
      <div
        aria-hidden="true"
        className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-blue-500/20 via-indigo-500/15 to-emerald-500/20 opacity-70 blur-xl"
      />

      {/* Main Glassmorphic Showcase Container */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-[0_20px_50px_rgba(0,35,70,0.08)] backdrop-blur-md">
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
          
          {/* Mini Sidebar Navigation (Col 1-4 on md screens) */}
          <div className="hidden flex-col justify-between border-r border-slate-200/70 pr-4 md:col-span-4 md:flex">
            <div>
              {/* Mini Brand Mark */}
              <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-200/60">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <BookIcon size={14} />
                </div>
                <span className="font-display text-sm font-bold tracking-tight text-slate-900">
                  InsideJibon
                </span>
              </div>

              {/* Sidebar Menu Items */}
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("home")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    activeTab === "home"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <HomeIcon size={14} />
                  <span>{isBn ? "হোম" : "Home"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("courses")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === "courses"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <BookIcon size={14} />
                  <span>{isBn ? "কোর্সসমূহ" : "Courses"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("live")}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === "live"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <VideoIcon size={14} />
                    <span>{isBn ? "লাইভ ক্লাস" : "Live Classes"}</span>
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("exams")}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === "exams"
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <ClipboardIcon size={14} />
                  <span>{isBn ? "পরীক্ষা" : "Exams"}</span>
                </button>

                <div className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 opacity-80">
                  <CheckIcon size={14} />
                  <span>{isBn ? "অ্যাসাইনমেন্ট" : "Assignments"}</span>
                </div>

                <div className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 opacity-80">
                  <ChartIcon size={14} />
                  <span>{isBn ? "অগ্রগতি" : "Progress"}</span>
                </div>

                <div className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 opacity-80">
                  <UsersIcon size={14} />
                  <span>{isBn ? "অভিভাবক পোর্টাল" : "Parent Portal"}</span>
                </div>
              </nav>
            </div>

            {/* Bottom Gamification Card */}
            <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/70 p-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <span>🏆</span>
                  <span>1,250 XP</span>
                </span>
                <span className="rounded-full bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
                  Lv. 12
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-200/60">
                <div className="h-full w-3/4 rounded-full bg-amber-500" />
              </div>
            </div>
          </div>

          {/* Main Content Area (Col 5-12 on md screens) */}
          <div className="flex flex-col justify-between md:col-span-8">
            
            {/* Top Student Greeting & Profile */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
              <div>
                <div className="font-display text-sm font-bold text-slate-900 sm:text-base">
                  {isBn ? "স্বাগতম, সৌরভ!" : "Welcome back, Shourov!"}
                </div>
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <span>{isBn ? "এগিয়ে চলো, তোমার প্রস্তুতি চমৎকার!" : "Keep going. You're doing great!"}</span>
                  <span className="inline-flex items-center text-amber-600 font-bold">🔥 5d</span>
                </div>
              </div>

              {/* Student Avatar */}
              <div className="flex items-center gap-1.5">
                <div className="relative h-8 w-8 overflow-hidden rounded-full border border-blue-500/40 bg-blue-100">
                  <Image
                    src="/jibon.jpg"
                    alt="Student Avatar"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover object-top"
                  />
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                </div>
              </div>
            </div>

            {/* Mobile Tab Pill Selectors (Shown only on small screens) */}
            <div className="flex items-center gap-1.5 py-2 md:hidden overflow-x-auto">
              {[
                { id: "home", labelBn: "হোম", labelEn: "Home" },
                { id: "courses", labelBn: "কোর্স", labelEn: "Courses" },
                { id: "live", labelBn: "লাইভ", labelEn: "Live" },
                { id: "exams", labelBn: "পরীক্ষা", labelEn: "Exams" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {isBn ? tab.labelBn : tab.labelEn}
                </button>
              ))}
            </div>

            {/* Tab Condition: Home (Default view matching reference) */}
            {activeTab === "home" && (
              <div className="space-y-3 pt-2">
                {/* Featured Blackboard Math Lesson Card */}
                <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs transition-all hover:border-blue-500/40">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3">
                    {/* Blackboard Visual Preview */}
                    <div className="relative aspect-[16/10] sm:col-span-6 overflow-hidden rounded-lg bg-zinc-950 text-white shadow-inner flex flex-col justify-between p-3 select-none">
                      {/* Chalk formula and curve illustration */}
                      <div className="text-[10px] font-mono text-zinc-400 leading-tight">
                        <div className="text-emerald-400 font-bold">ax² + bx + c = 0</div>
                        <div className="text-[9px] text-zinc-500">D = b² - 4ac</div>
                      </div>

                      {/* Parabola SVG curve */}
                      <svg viewBox="0 0 100 50" className="w-full h-10 opacity-70 stroke-sky-400 fill-none" strokeWidth="2">
                        <path d="M 10 45 Q 50 -10 90 45" />
                        <line x1="10" y1="35" x2="90" y2="35" stroke="#71717a" strokeWidth="0.8" strokeDasharray="2,2" />
                        <line x1="50" y1="5" x2="50" y2="45" stroke="#71717a" strokeWidth="0.8" strokeDasharray="2,2" />
                      </svg>

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[0.5px]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-blue-600 shadow-md transition-transform group-hover:scale-110">
                          <PlayIcon size={16} className="ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Lesson Details */}
                    <div className="flex flex-col justify-between sm:col-span-6">
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-600 uppercase tracking-wider">
                          <span>{isBn ? "উচ্চতর গণিত" : "Mathematics"}</span>
                          <span>•</span>
                          <span>{isBn ? "১০ম শ্রেণি / এইচএসসি" : "Class 10 / HSC"}</span>
                        </div>
                        <h4 className="mt-1 font-display text-sm font-bold text-slate-900 leading-snug">
                          {isBn ? "দ্বিঘাত সমীকরণ ও মূলের প্রকৃতি" : "Quadratic Equations"}
                        </h4>
                        <div className="mt-1 text-[11px] text-slate-500">
                          ⏱ 18 min
                        </div>
                      </div>

                      <div className="mt-2.5">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1">
                          <span>{isBn ? "অগ্রগতি" : "Progress"}</span>
                          <span className="font-mono text-blue-600 font-bold">75%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                          <div className="h-full w-3/4 rounded-full bg-blue-600" />
                        </div>

                        <Link
                          href="/courses"
                          className="mt-2.5 inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-blue-600 px-3 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-blue-700 w-full"
                        >
                          <span>{isBn ? "শেখা চালিয়ে যান" : "Continue Learning"}</span>
                          <ArrowRightIcon size={11} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom 2 Widgets (Live Class & Next Exam) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Live Class Card */}
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        <span className="h-1 w-1 rounded-full bg-white animate-ping" />
                        LIVE
                      </span>
                      <span className="text-[10px] font-semibold text-rose-700">
                        {isBn ? "আজকের ক্লাস" : "Live Today"}
                      </span>
                    </div>

                    <div className="mt-1.5 font-display text-xs font-bold text-slate-900 leading-tight">
                      {isBn ? "পদার্থবিজ্ঞান — ৩য় অধ্যায়: গতিবিদ্যা" : "Physics — Chapter 3: Dynamics"}
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-700">
                      <span className="font-mono font-medium text-rose-800">7:00 PM</span>
                      <Link
                        href="/courses"
                        className="font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>{isBn ? "যুক্ত হন" : "Join Now"}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>

                  {/* Next Exam Card */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                        <CheckIcon size={10} />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800">
                        {isBn ? "আসন্ন পরীক্ষা" : "Next Exam"}
                      </span>
                    </div>

                    <div className="mt-1.5 font-display text-xs font-bold text-slate-900 leading-tight">
                      {isBn ? "গণিত মডেল টেস্ট — ত্রিকোণমিতি" : "Math Practice Test"}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500 font-medium flex items-center gap-1">
                      <span>📅</span>
                      <span>{isBn ? "২ দিন পর শুরু" : "Starts in 2 days"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Condition: Courses */}
            {activeTab === "courses" && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                <div className="text-xs font-semibold text-slate-500">{isBn ? "এনরোল করা কোর্সসমূহ" : "Enrolled Courses"}</div>
                {[
                  { title: isBn ? "এইচএসসি পদার্থবিজ্ঞান ১ম পত্র" : "HSC Physics Paper 1", progress: 68, lessons: "18/24" },
                  { title: isBn ? "এইচএসসি আইসিটি — সি প্রোগ্রামিং ও ডেটা" : "HSC ICT & C Programming", progress: 42, lessons: "11/26" },
                  { title: isBn ? "উচ্চতর গণিত — অন্তরীকরণ ও যোগজীকরণ" : "Calculus & Higher Math", progress: 85, lessons: "20/24" },
                ].map((c) => (
                  <div key={c.title} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="flex-1 pr-3">
                      <div className="text-xs font-bold text-slate-900 truncate">{c.title}</div>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: `${c.progress}%` }} />
                      </div>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">{c.lessons}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Tab Condition: Live */}
            {activeTab === "live" && (
              <div className="space-y-2.5 pt-2 animate-in fade-in duration-200">
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-xs font-bold text-blue-900">
                      {isBn ? "লাইভ রুম: ক্লাউডফ্লেয়ার ডিউরেবল অবজেক্টস" : "Live Room: Cloudflare Durable Objects"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-blue-800/80">
                    {isBn ? "লো-লেটেন্সি ভিডিও স্ট্রিম, রিয়েল-টাইম চ্যাট ও সরাসরি প্রশ্ন জিজ্ঞাসা।" : "Ultra-low latency streaming with interactive real-time Q&A."}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="rounded-lg bg-blue-600 px-3 py-1 text-[11px] font-bold text-white">
                      {isBn ? "রুমে প্রবেশ করুন" : "Enter Classroom"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">48 {isBn ? "শিক্ষার্থী যুক্ত" : "students joined"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Condition: Exams */}
            {activeTab === "exams" && (
              <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>{isBn ? "বোর্ড স্ট্যান্ডার্ড সময়াবদ্ধ পরীক্ষা" : "Board Standard Timed Exam"}</span>
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 font-mono">25 Min</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {isBn ? "নেগেটিভ মার্কিং, অটো-গ্রেডিং এবং তাৎক্ষণিক ব্যাখ্যা।" : "Proctored environment with instant solution analytics."}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                    <span className="font-semibold text-emerald-600">{isBn ? "সর্বশেষ স্কোর: ৯০/১০০" : "Last Score: 90/100"}</span>
                    <span className="text-blue-600 font-bold">{isBn ? "সমাধান দেখুন →" : "Review Answers →"}</span>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
