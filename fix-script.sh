#!/bin/bash

# Fix 1: Auth imports and db imports in API routes
for file in src/app/api/export/assignments/[assignmentId]/grades/route.ts \
            src/app/api/export/courses/[courseId]/roster/route.ts \
            src/app/api/export/exams/[examId]/results/route.ts \
            src/services/profile/student-profile.ts \
            src/services/profile/teacher-profile.ts \
            src/services/learning/comments.ts; do
  if [ -f "$file" ]; then
    sed -i 's/import { requireTeacher } from "@\/lib\/auth"/import { requireTeacher } from "@\/lib\/permissions"/g' "$file"
    sed -i 's/import { requireStudent } from "@\/lib\/auth\/server-guards"/import { requireStudent } from "@\/lib\/permissions"/g' "$file"
    sed -i 's/import { db } from "@\/db"/import { getDb } from "@\/db"/g' "$file"
    sed -i 's/const db = db;/const db = getDb();/g' "$file"
    sed -i 's/await db/await getDb()/g' "$file"
  fi
done

for file in src/app/student/actions/notification-actions.ts \
            src/app/student/notifications/page.tsx \
            src/app/teacher/courses/[courseId]/analytics/page.tsx; do
  if [ -f "$file" ]; then
    sed -i 's/import { requireStudent } from "@\/lib\/auth\/server-guards"/import { requireStudent } from "@\/lib\/permissions"/g' "$file"
    sed -i 's/import { requireTeacher } from "@\/lib\/auth\/server-guards"/import { requireTeacher } from "@\/lib\/permissions"/g' "$file"
  fi
done

# Fix examSubmissions -> examAttempts, modules -> courseModules
sed -i 's/examSubmissions/examAttempts/g' src/app/api/export/exams/[examId]/results/route.ts
sed -i 's/examSubmissions/examAttempts/g' src/services/profile/student-profile.ts
sed -i 's/modules/courseModules/g' src/services/learning/comments.ts

# Fix assignmentSubmissions.score -> points
sed -i 's/assignmentSubmissions.score/assignmentSubmissions.points/g' src/app/api/export/assignments/[assignmentId]/grades/route.ts

