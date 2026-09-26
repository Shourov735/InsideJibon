import type { Metadata } from "next";
import { requireTeacher } from "@/lib/permissions";
import { TeacherNav } from "@/components/teacher/teacher-nav";
import { CommandProvider } from "@/components/shared/command";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TeacherLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireTeacher();
  return (
    <div data-role="teacher" className="flex min-h-dvh flex-col bg-surface">
      <TeacherNav user={user} />
      <div className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">{children}</div>
      <CommandProvider role="teacher" />
    </div>
  );
}
