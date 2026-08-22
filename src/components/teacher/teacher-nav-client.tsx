"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import type { CurrentUser } from "@/lib/auth";

interface TeacherNavClientProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "courses" | "exams" | "assignments" | "new";
}

export function TeacherNavClient({ user, activeSection = "dashboard" }: TeacherNavClientProps) {
  const { t } = useTranslations();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-surface/95 backdrop-blur-md transition-all text-on-surface">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/teacher" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold shadow-sm">
              IJ
            </div>
            <span className="hidden sm:inline-block font-display text-lg font-bold tracking-tight text-primary">
              InsideJibon
            </span>
            <span className="ml-1 rounded-full bg-tertiary-container px-2 py-0.5 text-[10px] font-bold text-on-tertiary-container tracking-wider">
              EDUCATOR
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/teacher"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "dashboard"
                  ? "border-b-2 border-primary text-primary font-bold rounded-b-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/teacher/courses"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "courses"
                  ? "border-b-2 border-primary text-primary font-bold rounded-b-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Courses
            </Link>
            <Link
              href="/teacher/exams"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "exams"
                  ? "border-b-2 border-primary text-primary font-bold rounded-b-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Exams
            </Link>
            <Link
              href="/teacher/assignments"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeSection === "assignments"
                  ? "border-b-2 border-primary text-primary font-bold rounded-b-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Assignments
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Link
            href="/teacher/courses/new"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container hover:text-on-primary-container"
          >
            + Create Course
          </Link>

          <div className="h-6 w-px bg-outline-variant hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-medium text-secondary sm:inline-block">
              {user.name ?? user.email}
            </span>
            <UserButton />
          </div>

          <button
            className="md:hidden p-2 text-secondary hover:text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-outline-variant bg-surface-container-lowest px-4 py-4 space-y-2">
          <Link href="/teacher" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">Dashboard</Link>
          <Link href="/teacher/courses" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">Courses</Link>
          <Link href="/teacher/exams" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">Exams</Link>
          <Link href="/teacher/assignments" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-low">Assignments</Link>
          <Link href="/teacher/courses/new" onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-primary hover:bg-surface-container-low">+ Create Course</Link>
        </div>
      )}
    </header>
  );
}
