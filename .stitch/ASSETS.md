# InsideJibon — Asset Manifest & Usage Guide (`ASSETS.md`)

This document catalogs all graphic assets, photography, and screenshot references located within `.stitch/designs/`, explaining their dimensions, visual style, and usage in the InsideJibon platform.

---

## 📸 Production & Prototype Asset Registry

| Directory / File | Type | Target Usage | Notes |
|---|---|---|---|
| [`public/jibon.jpg`](../public/jibon.jpg) | Author Photo | **Primary Educator Avatar & Spotlight** | Official portrait of **Tanvir Hasan Jibon** used across Homepage Hero, Instructor Spotlight, Student Dashboard educator box, and Teacher Profile. |
| [`designs/a_high_quality_hero_image_for_an_educational_platform._a_university_student/screen.png`](./designs/a_high_quality_hero_image_for_an_educational_platform._a_university_student/screen.png) | Hero Visual | **Marketing Homepage Visual** | High-definition academic study environment featuring blackboard calculations and brass instruments. |
| [`designs/a_professional_high_quality_educational_banner_for_a_physics_and_mathematics/screen.png`](./designs/a_professional_high_quality_educational_banner_for_a_physics_and_mathematics/screen.png) | Subject Banner | **Physics & Math Course Header** | 16:9 banner with vector geometry and calculus formulas. |
| [`designs/a_high_quality_educational_course_thumbnail_for_applied_organic_chemistry./screen.png`](./designs/a_high_quality_educational_course_thumbnail_for_applied_organic_chemistry./screen.png) | Thumbnail | **Chemistry Course Thumbnail** | Laboratory glassware with amber liquids and molecular orbital diagrams. |
| [`designs/a_professional_headshot_of_a_senior_male_academic_professor_dr._aranya_p._head/screen.png`](./designs/a_professional_headshot_of_a_senior_male_academic_professor_dr._aranya_p._head/screen.png) | Portrait | **Faculty Avatar (Mock)** | Senior academic faculty avatar for prototype dashboards. |
| [`designs/a_professional_headshot_of_a_female_academic_dr._e._miller_mathematics/screen.png`](./designs/a_professional_headshot_of_a_female_academic_dr._e._miller_mathematics/screen.png) | Portrait | **Faculty Avatar (Mock)** | Mathematics educator avatar for course cards. |
| [`designs/a_professional_headshot_of_a_middle_aged_male_academic_prof._s._khan_chemistry/screen.png`](./designs/a_professional_headshot_of_a_middle_aged_male_academic_prof._s._khan_chemistry/screen.png) | Portrait | **Faculty Avatar (Mock)** | Chemistry faculty avatar for course landing pages. |

---

## 🖼️ Prototype Screenshot Catalog (`screen.png`)

Every prototype folder in `designs/` contains a high-resolution `screen.png` showing the exact visual state of its `code.html`:

| Prototype | Screen Preview | Resolution |
|---|---|---|
| **Public Homepage** | [`designs/public_homepage/screen.png`](./designs/public_homepage/screen.png) | 1440 × 3200 (Full-page scroll) |
| **Course Catalog** | [`designs/public_homepage_clean_assets/screen.png`](./designs/public_homepage_clean_assets/screen.png) | 1440 × 1900 |
| **Student Dashboard (Desktop)** | [`designs/student_dashboard_desktop/screen.png`](./designs/student_dashboard_desktop/screen.png) | 1440 × 1024 |
| **Student Dashboard (Mobile)** | [`designs/student_dashboard_mobile/screen.png`](./designs/student_dashboard_mobile/screen.png) | 390 × 844 |
| **Learning Workspace (Desktop)**| [`designs/course_learning_page_desktop/screen.png`](./designs/course_learning_page_desktop/screen.png)| 1440 × 1024 |
| **Online Exam Interface (Desktop)**| [`designs/online_examination_interface_desktop/screen.png`](./designs/online_examination_interface_desktop/screen.png)| 1440 × 900 |
| **Online Exam Interface (Mobile)** | [`designs/online_examination_interface_mobile/screen.png`](./designs/online_examination_interface_mobile/screen.png) | 390 × 844 |
| **Exam Result & Review (Desktop)** | [`designs/student_exam_result_desktop/screen.png`](./designs/student_exam_result_desktop/screen.png) | 1440 × 1200 |
| **Teacher Dashboard (Desktop)** | [`designs/teacher_dashboard_desktop/screen.png`](./designs/teacher_dashboard_desktop/screen.png) | 1440 × 1024 |
| **Curriculum Builder (Desktop)** | [`designs/course_builder_desktop/screen.png`](./designs/course_builder_desktop/screen.png) | 1440 × 1100 |

---

## 🏷️ Asset Usage & Optimization Guidelines

1. **Aspect Ratios**:
   - Course Thumbnails: **16:10** for catalog cards (`aspect-[16/10]`), **16:9** for video/learning workspace (`aspect-video`).
   - Educator Avatars: **1:1** (`rounded-full`, sizes `h-6 w-6`, `h-8 w-8`, `h-10 w-10`, `h-16 w-16`).
   - Instructor Spotlight Photo: **4:5** aspect ratio (`rounded-2xl`).

2. **Cloudflare Storage**:
   - Production course thumbnails and lecture PDFs are stored in **Cloudflare R2** through the storage abstraction in `src/services/storage/`.
   - Local mock assets should be placed in `public/` and referenced via absolute root paths (`/asset-name.jpg`).
