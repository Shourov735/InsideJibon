import { eq, count } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type Role, courses, exams, assignments, enrollments } from "@/db/schema";

export async function getPlatformStats() {
  const db = getDb();
  
  const [
    usersStats,
    coursesStats,
    totalExams,
    totalAssignments,
    totalEnrollments
  ] = await Promise.all([
    db.select({ role: users.role, count: count() }).from(users).groupBy(users.role),
    db.select({ status: courses.status, count: count() }).from(courses).groupBy(courses.status),
    db.select({ count: count() }).from(exams),
    db.select({ count: count() }).from(assignments),
    db.select({ count: count() }).from(enrollments),
  ]);

  const students = usersStats.find(u => u.role === "student")?.count ?? 0;
  const teachers = usersStats.find(u => u.role === "teacher")?.count ?? 0;
  const admins = usersStats.find(u => u.role === "admin")?.count ?? 0;
  const totalUsers = students + teachers + admins;

  const published = coursesStats.find(c => c.status === "published")?.count ?? 0;
  const draft = coursesStats.find(c => c.status === "draft")?.count ?? 0;
  const archived = coursesStats.find(c => c.status === "archived")?.count ?? 0;
  const totalCourses = published + draft + archived;

  return {
    users: { total: totalUsers, students, teachers, admins },
    courses: { total: totalCourses, published, draft, archived },
    totalExams: totalExams[0]?.count ?? 0,
    totalAssignments: totalAssignments[0]?.count ?? 0,
    totalEnrollments: totalEnrollments[0]?.count ?? 0,
  };
}

export async function getAllUsers() {
  const db = getDb();
  return db.select().from(users).orderBy(users.createdAt);
}

export async function updateUserRole(adminId: string, userId: string, newRole: Role) {
  const db = getDb();
  
  if (adminId === userId) {
    throw new Error("Cannot change your own role.");
  }
  
  const [updatedUser] = await db
    .update(users)
    .set({ role: newRole, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
    
  if (!updatedUser) {
    throw new Error("User not found.");
  }
  
  return updatedUser;
}

export async function getAllCoursesOverview() {
  const db = getDb();
  
  const result = await db
    .select({
      id: courses.id,
      title: courses.title,
      status: courses.status,
      teacherId: courses.teacherId,
      teacherName: users.name,
      studentCount: count(enrollments.id)
    })
    .from(courses)
    .leftJoin(users, eq(courses.teacherId, users.id))
    .leftJoin(enrollments, eq(courses.id, enrollments.courseId))
    .groupBy(courses.id, users.name, users.id)
    .orderBy(courses.createdAt);
    
  return result;
}
