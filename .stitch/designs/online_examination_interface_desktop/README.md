# Prototype: Online Examination Interface (Desktop)

* **Source Prototype**: [`code.html`](./code.html)
* **Screenshot**: [`screen.png`](./screen.png)
* **Target Next.js Route**: `src/app/student/courses/[courseId]/exams/[examId]/page.tsx`
* **Key Component**: [`ExamTaker`](../../src/components/student/exams/exam-taker.tsx)

---

## Key Examination Features
1. **Fixed Top Exam Header**:
   * Exam title and current question progress (`Question 4 of 20`).
   * Live countdown timer with `< 5 min` pulse warning.
   * Action buttons: "Mark for Review" and primary "Submit Exam".
2. **Question Canvas**:
   * Clean question typography with formula support.
   * Large clickable MCQ radio option cards with `A / B / C / D` circular badges.
   * True / False toggle switches.
3. **Question Navigator Panel**:
   * 1..N question grid with status color coding:
     * **Solid Navy**: Answered
     * **Primary Fixed**: Current Active Question
     * **Amber Flag**: Marked for Review
     * **Clean Outline**: Unanswered
4. **Submit Confirmation Modal**:
   * Summary of answered vs unanswered questions before final submission.
