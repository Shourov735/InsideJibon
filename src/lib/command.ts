import type { CommandItem } from "@/services/command/types";

/**
 * R1 §4 — Static command items shared by the client command palette.
 *
 * Pure data (no DB access, no Drizzle). Lives outside `@/services/command`
 * so client components can import without tripping `server-only`.
 */

export function staticCommandItems(): CommandItem[] {
  return [
    {
      id: "global:settings",
      title: "Settings",
      group: "Quick",
      href: "/settings",
      kind: "global",
    },
    {
      id: "global:language-bn",
      title: "Switch to বাংলা",
      group: "Quick",
      href: "#ij_lang=bn",
      kind: "global",
    },
    {
      id: "global:language-en",
      title: "Switch to English",
      group: "Quick",
      href: "#ij_lang=en",
      kind: "global",
    },
    {
      id: "global:signout",
      title: "Sign out",
      group: "Account",
      href: "/sign-out",
      kind: "global",
    },
  ];
}

export function teacherCommandItems(): CommandItem[] {
  return [
    {
      id: "teacher:create-course",
      title: "Create course",
      group: "Actions",
      href: "/teacher/courses/new",
      kind: "global",
    },
    {
      id: "teacher:create-exam",
      title: "Create exam",
      group: "Actions",
      href: "/teacher/exams/new",
      kind: "global",
    },
    {
      id: "teacher:create-assignment",
      title: "Create assignment",
      group: "Actions",
      href: "/teacher/assignments/new",
      kind: "global",
    },
  ];
}

/**
 * R5 §4.4 — Student quick links into the gamification surfaces.
 *
 * Surfaced as a dedicated "Gamification" group in the palette so a
 * user can jump to their streak / leaderboard / badges without
 * knowing the URL. Pure static data — the actual streak numbers
 * live on the StreakXpCard right rail.
 */
export function studentCommandItems(): CommandItem[] {
  return [
    {
      id: "student:streak",
      title: "Show my streak",
      keywords: ["streak", "daily", "fire", "flame"],
      group: "Gamification",
      href: "/student?focus=streak",
      kind: "global",
    },
    {
      id: "student:badges",
      title: "Show my badges",
      keywords: ["badges", "trophies", "achievements", "medals"],
      group: "Gamification",
      href: "/student/badges",
      kind: "global",
    },
    {
      id: "student:leaderboard",
      title: "Show leaderboard",
      keywords: ["leaderboard", "ranking", "league", "xp", "competition"],
      group: "Gamification",
      href: "/leaderboard",
      kind: "global",
    },
    {
      id: "student:league",
      title: "Show my league",
      keywords: ["league", "bronze", "silver", "gold", "diamond", "cohort"],
      group: "Gamification",
      href: "/leaderboard?view=league",
      kind: "global",
    },
  ];
}
