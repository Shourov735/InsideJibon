import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/permissions";
import { getDb } from "@/db";
import { courses } from "@/db/schema/courses";
import { enrollments } from "@/db/schema/learning";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await requireTeacher();
    const { courseId } = await params;

    const courseResult = await getDb()
      .select()
      .from(courses)
      .where(and(eq(courses.id, courseId), eq(courses.teacherId, user.id)))
      .limit(1);

    if (courseResult.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const roster = await getDb()
      .select({
        studentName: users.name,
        studentEmail: users.email,
        enrolledAt: enrollments.enrolledAt,
        completedAt: enrollments.completedAt,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.courseId, courseId));

    const csvRows = [];
    csvRows.push(["Name", "Email", "Enrolled At", "Completed At"]);

    for (const row of roster) {
      csvRows.push([
        `"${(row.studentName || "").replace(/"/g, '""')}"`,
        `"${(row.studentEmail || "").replace(/"/g, '""')}"`,
        row.enrolledAt ? row.enrolledAt.toISOString() : "",
        row.completedAt ? row.completedAt.toISOString() : "",
      ]);
    }

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(",")).join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="course_${courseId}_roster.csv"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    console.error("Error exporting roster:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
