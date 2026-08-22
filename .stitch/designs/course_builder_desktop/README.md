# Prototype: Curriculum & Course Builder (Desktop)

* **Source Prototype**: [`code.html`](./code.html)
* **Screenshot**: [`screen.png`](./screen.png)
* **Target Next.js Route**: `src/app/teacher/courses/[courseId]/builder/page.tsx`
* **Key Component**: [`CurriculumBuilder`](../../src/components/teacher/builder/curriculum-builder.tsx)

---

## Key Builder Features
1. **Module Hierarchy Tree**:
   * Add / rename / delete course modules.
   * Add lessons, quizzes, and assignment tasks within modules.
2. **Lesson Editor Canvas**:
   * Video URL input with duration calculation.
   * Free Preview toggle for marketing trial.
   * Downloadable lecture notes attachment uploader.
3. **Publish Validation Panel**:
   * Authoritative checklist verifying module and lesson preconditions before publishing.
