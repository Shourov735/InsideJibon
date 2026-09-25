import type { Metadata } from "next";
import { requireStudent } from "@/lib/permissions";
import { StudentNav } from "@/components/student/student-nav";
import { CommandProvider } from "@/components/shared/command";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireStudent();
  return (
    <div data-role="student" className="flex min-h-dvh flex-col bg-surface">
      <StudentNav user={user} />
      <div className="flex-1">{children}</div>
      <CommandProvider role="student" />
    </div>
  );
}