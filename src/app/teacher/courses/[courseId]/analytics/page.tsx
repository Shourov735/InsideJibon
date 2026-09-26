import { requireTeacher } from "@/lib/permissions";
import { getTeacherCourseById } from "@/services/courses";
import { getCourseAnalytics } from "@/services/analytics";
import { notFound } from "next/navigation";
import { getTranslator } from "@/i18n/server";
import { Container } from "@/components/shared/ui/container";
import { PageHeader } from "@/components/shared/ui/page-header";
import { Stat } from "@/components/shared/ui/stat";
import { Button } from "@/components/shared/ui/button";
import { ChevronRightIcon, ChartIcon, ClipboardIcon, UsersIcon, CheckIcon, ClockIcon } from "@/components/shared/ui/icons";
import { formatNumber } from "@/lib/utils";

interface AnalyticsPageProps {
  params: Promise<{ courseId: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const teacher = await requireTeacher();
  const { courseId } = await params;
  const t = await getTranslator();

  const course = await getTeacherCourseById(teacher.id, courseId);
  if (!course) return notFound();

  const analytics = await getCourseAnalytics(teacher.id, courseId);

  return (
    <Container className="py-6 sm:py-8" size="xl">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-500">
        <span>{course.title}</span>
        <ChevronRightIcon size={12} />
        <span className="font-medium text-ink-700">Analytics</span>
      </nav>

      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5 text-primary">
            <ChartIcon size={14} />
            Course Analytics
          </span>
        }
        title={course.title}
        description="Engagement, submissions, and grading performance for this course."
        actions={
          <a
            href={`/api/export/courses/${courseId}/roster`}
            download
          >
            <Button variant="outline" size="md" leadingIcon={<ClipboardIcon size={14} />}>
              {t("teacher.analytics.downloadRoster")}
            </Button>
          </a>
        }
      />

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <Stat
          label={t("teacher.analytics.totalEnrolled")}
          value={formatNumber(analytics.totalStudents, { locale: t.locale })}
          hint="Active enrolled learners"
          icon={<UsersIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("teacher.analytics.submitted")}
          value={formatNumber(analytics.totalSubmissions, { locale: t.locale })}
          hint="Total assignment submissions"
          icon={<ClipboardIcon size={18} />}
          tone="primary"
        />
        <Stat
          label={t("teacher.analytics.graded")}
          value={formatNumber(analytics.gradedSubmissions, { locale: t.locale })}
          hint="Graded with feedback"
          icon={<CheckIcon size={18} />}
          tone="success"
        />
        <Stat
          label="Pending Review"
          value={formatNumber(analytics.pendingSubmissions, { locale: t.locale })}
          hint="Awaiting teacher grading"
          icon={<ClockIcon size={18} />}
          tone="warning"
        />
      </section>
    </Container>
  );
}
