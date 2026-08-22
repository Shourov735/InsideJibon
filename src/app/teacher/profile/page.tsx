import { redirect } from "next/navigation";
import { requireTeacher } from "@/lib/permissions";
import { getTeacherProfileStats } from "@/services/profile";
import { TeacherNav } from "@/components/teacher/teacher-nav";

export default async function TeacherProfilePage() {
  const user = await requireTeacher();

  const stats = await getTeacherProfileStats(user.id);
  if (!stats) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-surface">
      <TeacherNav user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-on-surface mb-2">My Profile</h1>
        <p className="text-on-surface-variant mb-8">View your teaching statistics.</p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-surface-container rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-sm font-medium text-on-surface-variant mb-2">Total Courses</h3>
            <p className="text-3xl font-bold text-on-surface">{stats.totalCoursesCreated}</p>
          </div>
          <div className="bg-surface-container rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-sm font-medium text-on-surface-variant mb-2">Total Students</h3>
            <p className="text-3xl font-bold text-on-surface">{stats.totalStudents}</p>
          </div>
        </div>
        <div className="mt-8 text-sm text-on-surface-variant">
          Note: To manage your account details, click your profile picture in the navigation bar.
        </div>
      </main>
    </div>
  );
}
