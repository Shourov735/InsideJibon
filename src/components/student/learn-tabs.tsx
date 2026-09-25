"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import type { ClassSession, Announcement } from "@/db/schema";
import { cn } from "@/lib/utils";
import { CourseSessionsList } from "./classes/course-sessions-list";
import { CourseAnnouncementsList } from "./announcements/course-announcements-list";
import { QnaPanel, type QaQuestionView } from "./qna/qna-panel";

interface LearnPageTabsProps {
  sessions: ClassSession[];
  announcements: Announcement[];
  qaThreads: QaQuestionView[];
  lessonId: string;
  courseId: string;
  currentUserId: string;
  currentUserRole: "student" | "teacher" | "admin";
}

export function LearnPageTabs({
  sessions,
  announcements,
  qaThreads,
  lessonId,
  courseId,
  currentUserId,
  currentUserRole,
}: LearnPageTabsProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<"classes" | "announcements" | "qna">("classes");

  const questionCount = qaThreads.length;

  return (
    <div className="mt-10">
      <div className="border-b border-outline-variant overflow-x-auto">
        <nav className="-mb-px flex gap-6 min-w-max" aria-label="Tabs">
          <TabButton
            label={t("student.classes.classesTab")}
            count={sessions.length}
            active={activeTab === "classes"}
            onClick={() => setActiveTab("classes")}
          />
          <TabButton
            label={t("student.announcements.announcementsTab")}
            count={announcements.length}
            active={activeTab === "announcements"}
            onClick={() => setActiveTab("announcements")}
          />
          <TabButton
            label={t("qna.tab.ask")}
            count={questionCount}
            active={activeTab === "qna"}
            onClick={() => setActiveTab("qna")}
          />
        </nav>
      </div>

      <div className="mt-8">
        {activeTab === "classes" && <CourseSessionsList sessions={sessions} />}
        {activeTab === "announcements" && <CourseAnnouncementsList announcements={announcements} />}
        {activeTab === "qna" && (
          <QnaPanel
            lessonId={lessonId}
            courseId={courseId}
            currentUserId={currentUserId}
            currentUserRole={currentUserRole}
            initialQuestions={qaThreads}
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
        active
          ? "border-primary text-primary"
          : "border-transparent text-secondary hover:border-outline hover:text-on-surface"
      )}
    >
      {label}
      <span
        className={cn(
          "ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium",
          active
            ? "bg-primary-container text-on-primary-container"
            : "bg-surface-container-high text-on-surface-variant"
        )}
      >
        {count}
      </span>
    </button>
  );
}
