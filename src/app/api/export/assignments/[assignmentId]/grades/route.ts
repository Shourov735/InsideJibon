import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/permissions";
import { getDb } from "@/db";
import { assignments, assignmentSubmissions } from "@/db/schema/assignments";
import { courses } from "@/db/schema/courses";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const user = await requireTeacher();
    const { assignmentId } = await params;

    const assignmentResult = await getDb()
      .select({ assignmentId: assignments.id, courseId: assignments.courseId })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(eq(assignments.id, assignmentId), eq(courses.teacherId, user.id)))
      .limit(1);

    if (assignmentResult.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const grades = await getDb()
      .select({
        studentName: users.name,
        studentEmail: users.email,
        status: assignmentSubmissions.status,
        score: assignmentSubmissions.points,
        submittedAt: assignmentSubmissions.submittedAt,
        gradedAt: assignmentSubmissions.gradedAt,
      })
      .from(assignmentSubmissions)
      .innerJoin(users, eq(assignmentSubmissions.studentId, users.id))
      .where(eq(assignmentSubmissions.assignmentId, assignmentId));

    const csvRows = [];
    csvRows.push(["Name", "Email", "Status", "Score", "Submitted At", "Graded At"]);

    for (const row of grades) {
      csvRows.push([
        `"${(row.studentName || "").replace(/"/g, '""')}"`,
        `"${(row.studentEmail || "").replace(/"/g, '""')}"`,
        row.status,
        row.score ?? "",
        row.submittedAt ? row.submittedAt.toISOString() : "",
        row.gradedAt ? row.gradedAt.toISOString() : "",
      ]);
    }

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(",")).join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="assignment_${assignmentId}_grades.csv"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    console.error("Error exporting assignment grades:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
