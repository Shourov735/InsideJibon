import { requireTeacher } from "@/lib/permissions";

export default async function TeacherLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireTeacher();
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}