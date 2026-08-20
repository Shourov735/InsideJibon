# Phase 3 — Course Materials (Backend → Antigravity UI Contract)

This document is the interface between the backend (OpenCode) and the UI
implementation (Antigravity). It defines the material domain contract: types,
server actions, service functions, routes, validation rules, and the states a
UI must represent. The backend is implemented, tested, deployed and
contract-stable — build the UI against this document.

## 1. Domain model

A **material** is a downloadable file attached to a **lesson**:

```
Teacher → Course → Module → Lesson → Material
```

| Field             | Type     | Notes |
| ----------------- | -------- | ----- |
| `id`              | `string` (uuid) | server-generated |
| `lessonId`        | `string` (uuid) | FK → `lessons.id` |
| `name`            | `string` | display name, teacher-editable (max 150 chars) |
| `originalFilename`| `string` | the uploaded file's name (max 255 chars) |
| `mimeType`        | `string` | validated server-side (allowlist) |
| `sizeBytes`       | `number` | validated server-side |
| `createdAt`       | `Date`   | ISO string when serialized |
| `updatedAt`       | `Date`   | ISO string when serialized |

> `storageKey` is internal and NEVER returned to the client. The download URL
> is the only sanctioned way to fetch file bytes.

TypeScript shape (from `src/types/material.ts`):

```ts
interface MaterialSummary {
  id: string;
  lessonId: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## 2. Server actions (teacher, `"use server"`)

All actions follow the existing `ActionResult<T>` contract:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
```

### `uploadMaterialAction(formData: FormData, courseId?: string): Promise<ActionResult<MaterialSummary>>`

- `formData` must contain:
  - `file` — the browser `File` object (the only way the file arrives; a
    server action receives the raw multipart file)
  - `lessonId` — string (uuid) of the target lesson
  - `name` — optional display name (falls back to the filename without its
    extension)
- Authorization: `requireTeacher()` + the teacher must own the lesson's course.
- On success: `{ success: true, data: MaterialSummary }` and the affected
  teacher/student pages are revalidated.
- Failure errors (sanitized, safe to render):
  - `"No file was uploaded."`
  - `"Invalid lesson identifier."`
  - `"Lesson not found."` (also covers "not your lesson" — no existence leak)
  - `"This file type is not supported. Upload a PDF, image, Office document, text file, or ZIP archive."`
  - `"This file is too large. The maximum upload size is 25 MB."`
  - `"The uploaded file is invalid."`
  - `"Upload failed. Please try again."` (storage failure)

### `deleteMaterialAction(formData: unknown, courseId?: string): Promise<ActionResult<{ deleted: boolean }>>`

- `formData`: `{ materialId: string }`
- Authorization: `requireTeacher()` + ownership.
- Failure errors: `"Invalid material identifier."`, `"Material not found."`,
  `"Failed to delete material."`

### `updateMaterialAction(formData: unknown, courseId?: string): Promise<ActionResult<MaterialSummary>>`

- `formData`: `{ materialId: string, name: string }` (name 1–150 chars)
- Authorization: `requireTeacher()` + ownership.
- Failure errors: `"Invalid material data."`, `"Material not found."`,
  `"Failed to update material."`

## 3. Teacher queries (server components / `server-only`)

From `src/services/materials` (import as `* as materialService`):

```ts
getTeacherLessonMaterials(teacherId: string, lessonId: string): Promise<MaterialSummary[]>
// [] when the lesson is not the teacher's — callers can render an empty list.

getTeacherCourseMaterials(teacherId: string, courseId: string): Promise<MaterialSummary[]>
```

## 4. Student queries (server components / `server-only`)

```ts
getLessonMaterialsForStudent(studentId: string, lessonId: string): Promise<MaterialSummary[] | null>
// null = lesson not accessible (not enrolled / course not published) → render nothing,
// not an error. Non-null = the student may see AND download every listed material.

canStudentAccessMaterial(studentId: string, materialId: string): Promise<boolean>

getMaterialForStudent(studentId: string, materialId: string): Promise<MaterialSummary | null>

getMaterialDownloadUrlForStudent(studentId: string, materialId: string): Promise<string | null>
// null = inaccessible. Otherwise the download URL (same as the static helper below).
```

Static helper (no auth — the route enforces it):

```ts
materialDownloadUrl(materialId: string): string
// → `/api/materials/${materialId}/download`
```

> Existing lesson-access rules apply: materials of **free** lessons are still
> enrollment-gated. `isFree` does NOT open up downloads to non-students.

## 5. Download route

```
GET /api/materials/:materialId/download
```

- 200 — file stream with `Content-Type`, `Content-Length`,
  `Content-Disposition: attachment`, `Cache-Control: no-store`.
- 404 — anonymous user, student not enrolled, teacher not the owner, material
  missing, or object missing from storage. **Identical for every case** (no
  existence probing).
- 503 — storage unavailable.

Browsers should open this URL via `<a download href>` or a button that
navigates to it. The response is an attachment (browser downloads it; it does
not render inline).

## 6. Upload lifecycle (UI flow)

1. User picks a file (+ optional display name) and the UI calls
   `uploadMaterialAction` with a `FormData` containing `file`, `lessonId`,
   `name`.
2. Server validates: auth → lesson ownership → filename (≤255 chars, no path
   separators/control chars) → MIME type allowlist → size ≤ 25 MB.
3. Server writes DB metadata, then streams bytes to R2 (rolls back the row on
   storage failure).
4. Success → refresh the material list (revalidation is automatic; the UI can
   also re-fetch after the action resolves).

**UI states to represent:**

| State | Behavior |
| ----- | -------- |
| idle | Upload button enabled (accept attribute per allowlist) |
| uploading | Disable the button; show progress/indeterminate spinner (no server progress events) |
| success | Append the new material to the list |
| failure | Render `ActionResult.error` inline (sanitized server message) |

Client-side checks may mirror the allowlist (for `accept` and early
feedback) but are NEVER the security boundary — the server re-validates
everything.

## 7. Delete lifecycle (UI flow)

1. Confirm with the user (destructive).
2. Call `deleteMaterialAction({ materialId })`.
3. Success → remove the item from the list; failure → show `error`.

## 8. Validation rules (single source of truth: `src/schemas/material.ts`)

| Rule | Value |
| ---- | ----- |
| Max file size | **25 MB** (`MAX_MATERIAL_SIZE_BYTES`) |
| Allowed extensions | `pdf, png, jpg, jpeg, webp, doc, docx, ppt, pptx, xls, xlsx, zip, txt` |
| Allowed MIME types | exact mapping: `pdf→application/pdf`, `png→image/png`, `jpg/jpeg→image/jpeg`, `webp→image/webp`, `doc→application/msword`, `docx→…wordprocessingml.document`, `ppt→application/vnd.ms-powerpoint`, `pptx→…presentationml.presentation`, `xls→application/vnd.ms-excel`, `xlsx→…spreadsheetml.sheet`, `zip→application/zip`, `txt→text/plain` |
| Filename | ≤ 255 chars, no `/` `\`, no control chars |
| Display name | 1–150 chars |

The browser-declared MIME type must match the mapping for the file's
extension — spoofed pairs (`fake.pdf` sent as `text/html`, `.exe`, empty
MIME) are rejected. Files are NOT content-sniffed (documented limitation).

## 9. Authorization summary (server-enforced)

- Upload / delete / rename: authenticated **teacher** who owns the lesson's
  course (chain: material → lesson → module → course → `teacher_id`).
- Download: authenticated **student** enrolled in the lesson's **published**
  course, or the owning **teacher** (any course status). Public/anonymous and
  all other roles: 404.
- `requireTeacher()` runs at the top of every server action; the service layer
  re-verifies ownership from the DB (never from client-supplied IDs).

## 10. Error states (all sanitized; UI must not invent details)

- Unauthorized / missing → 404 (download) or `"Lesson not found."` /
  `"Material not found."` (actions)
- File too large → `"This file is too large. The maximum upload size is 25 MB."`
- Unsupported type → see §2
- Storage failure → `"Upload failed. Please try again."` / 503 (download)

No R2 keys, storage keys, DB internals or stack traces ever reach the client.

## 11. Design reference

Follow the Academic Modernism direction in `.stitch/designs/` and the
existing lesson/resource UI patterns (teacher: course builder; student:
learning workspace). Suggested placements: teacher — a "Materials" section in
the lesson editor / builder; student — a "Materials / Resources" block under
each lesson in the learning page.
