"use client";

import { staticCommandItems, teacherCommandItems } from "@/lib/command";

import { CommandPalette } from "./command-palette";
import { ShortcutsDialog } from "./shortcuts-dialog";

export { CommandTrigger } from "./command-trigger";

/**
 * R1 §4 — `<CommandProvider/>` mounts both the palette and the
 * shortcuts dialog inside a role layout. The palette indexes items via
 * `/api/command`; static commands are passed in.
 */
export function CommandProvider({ role }: { role: "student" | "teacher" | "admin" | "parent" }) {
  const staticItems = staticCommandItems();
  const roleActions = role === "teacher" ? teacherCommandItems() : [];
  return (
    <>
      <CommandPalette staticItems={staticItems} roleActions={roleActions} />
      <ShortcutsDialog />
    </>
  );
}
