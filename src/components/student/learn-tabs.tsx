"use client";

import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import type { ClassSession, Announcement } from "@/db/schema";
import { cn } from "@/lib/utils";
import { CourseSessionsList } from "./classes/course-sessions-list";
import { CourseAnnouncementsList } from "./announcements/course-announcements-list";
import { LessonDiscussion } from "./discussion/lesson-discussion";

interface LearnPageTabsProps {
  sessions: ClassSession[];
  announcements: Announcement[];
  comments?: any[];
  lessonId?: string;
  courseId?: string;
  currentUserId?: string;
}

export function LearnPageTabs({ 
  sessions, 
  announcements,
  comments = [],
  lessonId = "",
  courseId = "",
  currentUserId = ""
}: LearnPageTabsProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<"classes" | "announcements" | "discussion">("classes");

  return (
    <div className="mt-10">
      <div className="border-b border-outline-variant overflow-x-auto">
        <nav className="-mb-px flex gap-6 min-w-max" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("classes")}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              activeTab === "classes"
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:border-outline hover:text-on-surface"
            )}
          >
            {t("student.classes.classesTab")}
            <span className={cn(
              "ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium",
              activeTab === "classes"
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-high text-on-surface-variant"
            )}>
              {sessions.length}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab("announcements")}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              activeTab === "announcements"
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:border-outline hover:text-on-surface"
            )}
          >
            {t("student.announcements.announcementsTab")}
            <span className={cn(
              "ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium",
              activeTab === "announcements"
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-high text-on-surface-variant"
            )}>
              {announcements.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("discussion")}
            className={cn(
              "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors",
              activeTab === "discussion"
                ? "border-primary text-primary"
                : "border-transparent text-secondary hover:border-outline hover:text-on-surface"
            )}
          >
            Discussion
            <span className={cn(
              "ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium",
              activeTab === "discussion"
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container-high text-on-surface-variant"
            )}>
              {comments.length}
            </span>
          </button>
        </nav>
      </div>

      <div className="mt-8">
        {activeTab === "classes" && <CourseSessionsList sessions={sessions} />}
        {activeTab === "announcements" && <CourseAnnouncementsList announcements={announcements} />}
        {activeTab === "discussion" && lessonId && courseId && currentUserId && (
          <LessonDiscussion 
            comments={comments} 
            lessonId={lessonId} 
            courseId={courseId}
            currentUserId={currentUserId}
          />
        )}
      </div>
    </div>
  );
}
