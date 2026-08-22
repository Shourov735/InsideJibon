# Prototype: Teacher & Educator Dashboard (Desktop)

* **Source Prototype**: [`code.html`](./code.html)
* **Screenshot**: [`screen.png`](./screen.png)
* **Target Next.js Route**: `src/app/teacher/page.tsx`
* **Layout Wrapper**: `src/app/teacher/layout.tsx`

---

## Key Dashboard Sections
1. **Educator Top Navigation**: Brand mark, `EDUCATOR` role badge, active tabs (`Dashboard`, `Courses`, `Exams`, `Assignments`), and `+ Create Course` primary action.
2. **4-Metric Bento Grid**:
   * **Total Students**: Large count + watermark icon at 10% opacity.
   * **Published Courses**: Active course count + up-to-date indicator.
   * **Total Exams**: Active assessments count.
   * **Question Bank Total**: Available question inventory.
3. **Active Courses Grid**: Course cards with student count, completion percentage bar, and quick manage links.
4. **Recent Activity Timeline**: Chronological feed of student exam submissions and enrollments.
