import type { Metadata } from "next";
import { requireTeacher } from "@/lib/permissions";
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
  await requireTeacher();
  return (
    <div data-role="teacher" className="flex min-h-dvh flex-col">
      {children}
      <CommandProvider role="teacher" />
    </div>
  );
}