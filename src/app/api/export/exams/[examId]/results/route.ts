import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/permissions";
import { getDb } from "@/db";
import { exams, examAttempts } from "@/db/schema/exams";
import { courses } from "@/db/schema/courses";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const user = await requireTeacher();
    const { examId } = await params;

    const examResult = await getDb()
      .select({ examId: exams.id, courseId: exams.courseId })
      .from(exams)
      .innerJoin(courses, eq(exams.courseId, courses.id))
      .where(and(eq(exams.id, examId), eq(courses.teacherId, user.id)))
      .limit(1);

    if (examResult.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const results = await getDb()
      .select({
        studentName: users.name,
        studentEmail: users.email,
        score: examAttempts.score,
        percentage: examAttempts.percentage,
        submittedAt: examAttempts.submittedAt,
      })
      .from(examAttempts)
      .innerJoin(users, eq(examAttempts.studentId, users.id))
      .where(eq(examAttempts.examId, examId));

    const csvRows = [];
    csvRows.push(["Name", "Email", "Score", "Passed", "Submitted At"]);

    for (const row of results) {
      csvRows.push([
        `"${(row.studentName || "").replace(/"/g, '""')}"`,
        `"${(row.studentEmail || "").replace(/"/g, '""')}"`,
        row.score,
        (row.percentage !== null && row.percentage >= 60) ? "Yes" : "No",
        row.submittedAt ? row.submittedAt.toISOString() : "",
      ]);
    }

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(",")).join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="exam_${examId}_results.csv"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (error) {
    console.error("Error exporting exam results:", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
