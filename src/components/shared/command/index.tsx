"use client";

import { staticCommandItems, studentCommandItems, teacherCommandItems } from "@/lib/command";

import { CommandPalette } from "./command-palette";
import { ShortcutsDialog } from "./shortcuts-dialog";

export { CommandTrigger } from "./command-trigger";

/**
 * R1 §4 — `<CommandProvider/>` mounts both the palette and the
 * shortcuts dialog inside a role layout. The palette indexes items via
 * `/api/command`; static commands are passed in.
 *
 * R5 §4 — Adds a "Gamification" group of static quick links for
 * students (streak / badges / leaderboard / league).
 */
export function CommandProvider({ role }: { role: "student" | "teacher" | "admin" | "parent" }) {
  const staticItems = staticCommandItems();
  let roleActions: ReturnType<typeof teacherCommandItems> = [];
  if (role === "teacher") {
    roleActions = teacherCommandItems();
  } else if (role === "student") {
    roleActions = studentCommandItems();
  }
  return (
    <>
      <CommandPalette staticItems={staticItems} roleActions={roleActions} />
      <ShortcutsDialog />
    </>
  );
}
