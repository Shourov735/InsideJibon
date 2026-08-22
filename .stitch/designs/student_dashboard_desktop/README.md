# Prototype: Student Dashboard (Desktop)

* **Source Prototype**: [`code.html`](./code.html)
* **Screenshot**: [`screen.png`](./screen.png)
* **Target Next.js Route**: `src/app/student/page.tsx`
* **Layout Wrapper**: `src/app/student/layout.tsx`

---

## Layout Structure: 12-Column Bento Grid
* **Main Column (8 Cols)**:
  * **"Continue Learning" Hero Card**: 16:9 thumbnail, "In Progress" badge, course title, current lesson indicator, progress percentage bar, and "Resume Course" button.
  * **"My Enrolled Courses" Grid**: Interactive course cards with completion percentage and last accessed information.
* **Sidebar Column (4 Cols)**:
  * **Academic Overview**: 3-metric summary (Courses Enrolled, Completed Courses, Average Progress %).
  * **Upcoming Live Classes & Sessions**: Live class timetable with status indicators.
  * **Educator Support Box**: Tanvir Hasan Jibon guidance note and YouTube link.
