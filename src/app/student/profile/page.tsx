import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/permissions";
import { getStudentProfileStats } from "@/services/profile";
import { StudentNav } from "@/components/student/student-nav";

export default async function StudentProfilePage() {
  const user = await requireStudent();

  const stats = await getStudentProfileStats(user.id);
  if (!stats) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-surface">
      <StudentNav user={user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-on-surface mb-2">My Profile</h1>
        <p className="text-on-surface-variant mb-8">View your learning statistics.</p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-surface-container rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-sm font-medium text-on-surface-variant mb-2">Courses Enrolled</h3>
            <p className="text-3xl font-bold text-on-surface">{stats.totalCoursesEnrolled}</p>
          </div>
          <div className="bg-surface-container rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-sm font-medium text-on-surface-variant mb-2">Lessons Completed</h3>
            <p className="text-3xl font-bold text-on-surface">{stats.completedLessons}</p>
          </div>
          <div className="bg-surface-container rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-sm font-medium text-on-surface-variant mb-2">Assignments Submitted</h3>
            <p className="text-3xl font-bold text-on-surface">{stats.assignmentsSubmitted}</p>
          </div>
          <div className="bg-surface-container rounded-xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-sm font-medium text-on-surface-variant mb-2">Exam Attempts</h3>
            <p className="text-3xl font-bold text-on-surface">{stats.examsTaken}</p>
          </div>
        </div>
        <div className="mt-8 text-sm text-on-surface-variant">
          Note: To manage your account details, click your profile picture in the navigation bar.
        </div>
      </main>
    </div>
  );
}
