import { requireStudent } from "@/lib/permissions";
import { StudentNav } from "@/components/student/student-nav";

export default async function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireStudent();
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <StudentNav user={user} />
      <div className="flex-1">{children}</div>
    </div>
  );
}