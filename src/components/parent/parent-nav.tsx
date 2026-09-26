import { Suspense } from "react";
import type { CurrentUser } from "@/lib/auth";
import { ParentNavClient } from "./parent-nav-client";

interface ParentNavProps {
  user: CurrentUser;
  activeSection?: "dashboard" | "settings";
}

/**
 * R7 — Parent top navigation. Currently a simple shell; the bell
 * comes from a generic in-app bell we re-use from the student layout
 * (or omit, since parents consume digest email rather than in-app
 * toasts).
 */
export async function ParentNav({
  user,
  activeSection = "dashboard",
}: ParentNavProps) {
  return (
    <Suspense
      fallback={
        <span className="h-16 w-full border-b border-outline-variant bg-surface" />
      }
    >
      <ParentNavClient user={user} activeSection={activeSection} />
    </Suspense>
  );
}
