import type { Metadata } from "next";
import { requireTeacher } from "@/lib/permissions";

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
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}