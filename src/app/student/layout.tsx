import { requireStudent } from "@/lib/permissions";

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireStudent();
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}