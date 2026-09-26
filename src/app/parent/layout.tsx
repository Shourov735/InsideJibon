import type { Metadata } from "next";
import { requireParent } from "@/lib/permissions";
import { ParentNav } from "@/components/parent/parent-nav";
import { CommandProvider } from "@/components/shared/command";

export const metadata: Metadata = {
  title: "Parent Panel | InsideJibon",
  robots: { index: false, follow: false },
};

export default async function ParentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireParent();
  return (
    <div data-role="parent" className="flex min-h-dvh flex-col bg-surface">
      <ParentNav user={user} />
      <div className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <CommandProvider role="parent" />
    </div>
  );
}
