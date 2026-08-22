# InsideJibon — Prototype & Screen Catalog (`INDEX.md`)

This catalog maps every high-fidelity prototype in `.stitch/designs/` to its corresponding Next.js App Router routes, components, and responsive views in the production codebase.

---

## 🏛️ Core Production Prototypes

| Prototype Name | Viewport | Live Route in Codebase | Key Features & Interactions | Source Files |
|---|---|---|---|---|
| [**`public_homepage`**](./designs/public_homepage/) | Desktop | `src/app/(marketing)/page.tsx` | • Academic thesis hero<br>• 4-stat trust bento bar<br>• 4-subject curricula grid<br>• 3-Step InsideJibon Method<br>• Tanvir Hasan Jibon faculty spotlight<br>• CTA banner & 4-column footer | [`code.html`](./designs/public_homepage/code.html)<br>[`screen.png`](./designs/public_homepage/screen.png) |
| [**`public_homepage_clean_assets`**](./designs/public_homepage_clean_assets/) | Desktop | `src/app/(marketing)/courses/page.tsx` | • Filterable course catalog<br>• Search bar + category tabs<br>• Bento course cards with level chips<br>• Instructor avatars & stats | [`code.html`](./designs/public_homepage_clean_assets/code.html)<br>[`screen.png`](./designs/public_homepage_clean_assets/screen.png) |
| [**`student_dashboard_desktop`**](./designs/student_dashboard_desktop/) | Desktop | `src/app/student/page.tsx` | • 12-column bento layout<br>• "Continue Learning" hero card with progress bar<br>• Quick resume course button<br>• Academic overview metrics (Enrolled/Completed/Avg)<br>• Upcoming live sessions feed | [`code.html`](./designs/student_dashboard_desktop/code.html)<br>[`screen.png`](./designs/student_dashboard_desktop/screen.png) |
| [**`student_dashboard_mobile`**](./designs/student_dashboard_mobile/) | Mobile | `src/app/student/page.tsx` | • Single-column mobile flow<br>• Compact card headers<br>• Touch-friendly resume button<br>• Sticky top app bar | [`code.html`](./designs/student_dashboard_mobile/code.html)<br>[`screen.png`](./designs/student_dashboard_mobile/screen.png) |
| [**`course_learning_page_desktop`**](./designs/course_learning_page_desktop/) | Desktop | `src/app/student/courses/[courseId]/learn/page.tsx` | • 3-panel learning workspace<br>• Fixed top progress header<br>• Left collapsible curriculum sidebar<br>• 16:9 video player container<br>• 4-tab workspace (Resources, Discussion, Classes, Announcements) | [`code.html`](./designs/course_learning_page_desktop/code.html)<br>[`screen.png`](./designs/course_learning_page_desktop/screen.png) |
| [**`online_examination_interface_desktop`**](./designs/online_examination_interface_desktop/) | Desktop | `src/app/student/courses/[courseId]/exams/[examId]/page.tsx` | • Fixed examination top bar<br>• Live countdown timer (alert under 5 mins)<br>• 1..N Question Navigator grid (Answered / Unanswered / Flagged)<br>• MCQ option selection cards<br>• "Mark for Review" action<br>• Submit confirmation modal | [`code.html`](./designs/online_examination_interface_desktop/code.html)<br>[`screen.png`](./designs/online_examination_interface_desktop/screen.png) |
| [**`online_examination_interface_mobile`**](./designs/online_examination_interface_mobile/) | Mobile | `src/app/student/courses/[courseId]/exams/[examId]/page.tsx` | • Fullscreen mobile exam mode<br>• Floating countdown badge<br>• Slide-over question navigator sheet<br>• Large thumb-accessible radio pills | [`code.html`](./designs/online_examination_interface_mobile/code.html)<br>[`screen.png`](./designs/online_examination_interface_mobile/screen.png) |
| [**`student_exam_result_desktop`**](./designs/student_exam_result_desktop/) | Desktop | `src/app/student/courses/[courseId]/exams/[examId]/result/page.tsx` | • Exam scorecard hero<br>• Pass / Fail status badge<br>• Accuracy & score breakdown<br>• Filterable question-by-question review (Correct / Incorrect / Unanswered)<br>• Correct answer explanations | [`code.html`](./designs/student_exam_result_desktop/code.html)<br>[`screen.png`](./designs/student_exam_result_desktop/screen.png) |
| [**`teacher_dashboard_desktop`**](./designs/teacher_dashboard_desktop/) | Desktop | `src/app/teacher/page.tsx` | • 4-metric bento cards (Total Students, Published Courses, Active Exams, Question Bank)<br>• Watermark icons at 10% opacity<br>• Active courses grid with quick actions<br>• Recent activity timeline | [`code.html`](./designs/teacher_dashboard_desktop/code.html)<br>[`screen.png`](./designs/teacher_dashboard_desktop/screen.png) |
| [**`course_builder_desktop`**](./designs/course_builder_desktop/) | Desktop | `src/app/teacher/courses/[courseId]/builder/page.tsx` | • Curriculum module tree<br>• Drag-and-drop lesson reordering<br>• Video URL & duration inputs<br>• Free preview toggle<br>• Publish readiness validation panel | [`code.html`](./designs/course_builder_desktop/code.html)<br>[`screen.png`](./designs/course_builder_desktop/screen.png) |

---

## 🎨 Theme Variations & Explorations

| Exploration | Focus / Differentiation | Directory |
|---|---|---|
| **`academic_modernism`** | **The Canonical Production Theme** (Deep navy, gold accents, crisp white surfaces, bento geometry) | [`designs/academic_modernism/`](./designs/academic_modernism/) |
| **`academic_vibrancy`** | Alternate high-contrast color scheme exploring brighter cobalt accents and energetic badges | [`designs/academic_vibrancy/`](./designs/academic_vibrancy/) |
| **`teacher_dashboard_academic_vibrancy`** | Teacher dashboard with cobalt-tinted metric cards | [`designs/teacher_dashboard_academic_vibrancy/`](./designs/teacher_dashboard_academic_vibrancy/) |
| **`course_learning_page_academic_vibrancy`** | Learning workspace with vibrant sidebar highlight styles | [`designs/course_learning_page_academic_vibrancy/`](./designs/course_learning_page_academic_vibrancy/) |
| **`shiksha_education_platform`** | Full-suite early conceptual exploration of side navigation and multi-role dashboards | [`designs/shiksha_education_platform/`](./designs/shiksha_education_platform/) |

---

## 📐 Responsive Breakpoint Conventions

All prototypes are authored and verified against these viewport dimensions:

```
Mobile (sm):         375px – 640px    (Single column, compact app bar, bottom sheets)
Tablet (md):         768px – 1024px   (2-column grids, collapsible sidebars)
Desktop (lg/xl):     1280px – 1440px  (12-column bento grids, 3-panel workspaces)
Wide (2xl):          1536px+          (Contained 1280px max-width with generous gutters)
```
