# Phase 5 — Class Sessions, Course Announcements, Admin Dashboard & Skeletons

Comprehensive documentation of the Phase 5 implementation delivered for InsideJibon.

---

## 1. Class Sessions Domain (Live & Recorded Classes)

### Data Model (`src/db/schema/classes.ts`, migration `0008_modern_dust.sql`)
- **`class_sessions`**:
  - `id`: UUID (default random, PK)
  - `course_id`: UUID (FK → `courses.id`, ON DELETE CASCADE)
  - `title`: Text (1–200 characters)
  - `description`: Text (optional, up to 5,000 characters)
  - `session_type`: Enum `session_type` (`'live'`, `'recorded'`, default `'live'`)
  - `external_url`: Text (validated URL for YouTube, Zoom, Google Meet, Vimeo, etc.)
  - `scheduled_at`: Timestamp with time zone (nullable for recorded on-demand)
  - `duration_minutes`: Integer (optional)
  - `status`: Enum `session_status` (`'upcoming'`, `'completed'`, `'cancelled'`, default `'upcoming'`)
  - `created_at`, `updated_at`: Timestamps with time zone

### Service Layer (`src/services/classes/classes.ts`)
| Function | Access / Rules |
|---|---|
| `createClassSession(teacherId, input)` | Verifies teacher course ownership. Inserts with status `'upcoming'`. |
| `updateClassSession(teacherId, sessionId, input)` | Verifies teacher ownership through `session → course → teacherId`. |
| `deleteClassSession(teacherId, sessionId)` | Permanent deletion after teacher ownership check. |
| `markSessionCompleted(teacherId, sessionId)` | Transitions session status to `'completed'`. |
| `cancelSession(teacherId, sessionId)` | Transitions session status to `'cancelled'`. |
| `getTeacherSessionsForCourse(teacherId, courseId)` | Lists all sessions for course, ordered by `scheduled_at` DESC. |
| `getStudentSessionsForCourse(studentId, courseId)` | Lists sessions for enrolled student in published course. |
| `getUpcomingSessionsForStudent(studentId)` | Lists upcoming sessions across all enrolled courses (where `scheduled_at >= now()`). |

### Teacher Routes & Components
- Route: `/teacher/courses/[courseId]/classes` ([`page.tsx`](file:///home/shourov/Projects/insidejibon/src/app/teacher/courses/[courseId]/classes/page.tsx))
- Server Actions: [`class-actions.ts`](file:///home/shourov/Projects/insidejibon/src/app/teacher/courses/[courseId]/classes/actions/class-actions.ts)
- Components in `src/components/teacher/classes/`:
  - `ClassSessionDirectory`: Directory overview with Total, Upcoming, Completed, Cancelled stat cards and create modal trigger.
  - `ClassSessionCard`: Session card with type/status badges, external join/watch links, and action buttons.
  - `ClassSessionForm`: Dialog modal for session creation and editing.

### Student Experience
- **Dashboard**: `UpcomingSessionsList` on `/student` displays the next 5 upcoming sessions. Sessions scheduled within 30 minutes are visually emphasized.
- **Learning Page**: `LearnPageTabs` on `/student/courses/[courseId]/learn` embeds the full course sessions list grouped by Upcoming, Completed, and Cancelled.

---

## 2. Course Announcements Domain

### Data Model (`src/db/schema/announcements.ts`, migration `0008_modern_dust.sql`)
- **`announcements`**:
  - `id`: UUID (default random, PK)
  - `course_id`: UUID (FK → `courses.id`, ON DELETE CASCADE)
  - `title`: Text (1–200 characters)
  - `content`: Text (1–5,000 characters)
  - `is_pinned`: Boolean (default `false`)
  - `published_at`: Timestamp with time zone (default `now()`)
  - `created_at`, `updated_at`: Timestamps with time zone

### Service Layer (`src/services/announcements/announcements.ts`)
| Function | Access / Rules |
|---|---|
| `createAnnouncement(teacherId, input)` | Verifies course ownership. Inserts announcement. |
| `updateAnnouncement(teacherId, announcementId, input)` | Verifies ownership through `announcement → course → teacherId`. |
| `deleteAnnouncement(teacherId, announcementId)` | Permanent deletion. |
| `togglePinAnnouncement(teacherId, announcementId)` | Flips `is_pinned` boolean. |
| `getTeacherAnnouncementsForCourse(teacherId, courseId)` | Lists announcements ordered by `is_pinned` DESC, `published_at` DESC. |
| `getStudentAnnouncementsForCourse(studentId, courseId)` | Lists announcements for enrolled students in published course. |
| `getRecentAnnouncementsForStudent(studentId, limit)` | Recent announcements across all enrolled courses. |

### Teacher Routes & Components
- Route: `/teacher/courses/[courseId]/announcements` ([`page.tsx`](file:///home/shourov/Projects/insidejibon/src/app/teacher/courses/[courseId]/announcements/page.tsx))
- Server Actions: [`announcement-actions.ts`](file:///home/shourov/Projects/insidejibon/src/app/teacher/courses/[courseId]/announcements/actions/announcement-actions.ts)
- Components in `src/components/teacher/announcements/`:
  - `AnnouncementDirectory`: Directory with announcement list and create modal.
  - `AnnouncementCard`: Card with expandable preview, pin badge, and actions.
  - `AnnouncementForm`: Create/edit dialog.

### Student Experience
- `CourseAnnouncementsList` embedded inside the learning workspace tabs with pinned announcements pinned at the top.

---

## 3. Admin Dashboard & User Management

### Service Layer (`src/services/admin/admin.ts`)
- **`getPlatformStats()`**: Total users (students, teachers, admins breakdown), total courses (published vs draft), total exams, total assignments, total enrollments.
- **`getAllUsers(filters)`**: Returns all synced users with role filtering and name/email search.
- **`updateUserRole(adminId, targetUserId, newRole)`**: Authoritative role mutation. Blocks self-role-modification to prevent admin lockout.
- **`getAllCoursesOverview()`**: Cross-platform course table showing course title, teacher name, status, and enrolled student counts.

### Admin Routes & Components
- Route: `/admin` ([`page.tsx`](file:///home/shourov/Projects/insidejibon/src/app/admin/page.tsx)) guarded by `requireAdmin()`.
- Layout: [`layout.tsx`](file:///home/shourov/Projects/insidejibon/src/app/admin/layout.tsx) with [`AdminNav`](file:///home/shourov/Projects/insidejibon/src/components/admin/admin-nav.tsx).
- Server Actions: [`src/app/admin/actions/admin-actions.ts`](file:///home/shourov/Projects/insidejibon/src/app/admin/actions/admin-actions.ts).
- Components in `src/components/admin/`:
  - `UserDirectory`: Client-side searchable/filterable directory with role dropdown.
  - `RoleBadge`: Color-coded badge (Student: Blue, Teacher: Green, Admin: Amber).
  - `ChangeRoleDialog`: Modal for role assignment confirmation.

---

## 4. Route Loading States
- `src/app/student/loading.tsx`
- `src/app/teacher/loading.tsx`
- `src/app/admin/loading.tsx`
All implement Academic Modernism animated skeleton layouts.
