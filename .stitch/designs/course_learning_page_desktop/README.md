# Prototype: Course Learning Workspace (Desktop)

* **Source Prototype**: [`code.html`](./code.html)
* **Screenshot**: [`screen.png`](./screen.png)
* **Target Next.js Route**: `src/app/student/courses/[courseId]/learn/page.tsx`
* **Key Components**: [`LearningSidebar`](../../src/components/student/learning-sidebar.tsx), [`LearnPageTabs`](../../src/components/student/learn-tabs.tsx)

---

## 3-Panel Learning Layout
1. **Left Sidebar (`w-80`)**:
   * Course progress percentage bar.
   * Quick links to course exams and assignments.
   * Module accordion with lesson status icons (completed green checkmark, active blue pill, duration badge).
2. **Center Canvas**:
   * Breadcrumb navigation (`Dashboard > Courses > [Course Name]`).
   * 16:9 Video Player container with custom overlay controls.
   * Lesson header with Module/Lesson numbers, title, description, and "Mark as Complete" button.
   * Written lesson notes and formulas.
3. **Tabbed Workspace Below Video**:
   * 📁 **Resources**: Downloadable PDF lecture sheets with size badges.
   * 💬 **Discussion**: Threaded comment system with educator/student badges.
   * 📅 **Live Classes**: Scheduled Zoom / Google Meet links.
   * 📢 **Announcements**: Course teacher notices.
