import { requireTeacher } from "@/lib/permissions";

export default async function TeacherDashboardPage() {
  const user = await requireTeacher();

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Teacher Dashboard</h1>
      <p className="mt-2 text-on-surface-variant">
        Welcome, {user.name ?? user.email} — this area will contain course
        management, exams, assignments and student monitoring.
      </p>
    </main>
  );
}