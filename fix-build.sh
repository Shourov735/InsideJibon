#!/bin/bash

# Fix route params type
for file in src/app/api/export/assignments/[assignmentId]/grades/route.ts \
            src/app/api/export/courses/[courseId]/roster/route.ts \
            src/app/api/export/exams/[examId]/results/route.ts; do
  sed -i 's/{ params }: { params: { [a-zA-Z]*: string; } }/{ params }: { params: Promise<{ [a-zA-Z]*: string }> }/g' "$file"
  sed -i 's/const { [a-zA-Z]* } = params;/const { [a-zA-Z]* } = await params;/g' "$file"
done
# Actually the sed for const { examId } = params; will be easier:
sed -i 's/{ params }: { params: { assignmentId: string } }/{ params }: { params: Promise<{ assignmentId: string }> }/g' src/app/api/export/assignments/[assignmentId]/grades/route.ts
sed -i 's/{ params }: { params: { courseId: string } }/{ params }: { params: Promise<{ courseId: string }> }/g' src/app/api/export/courses/[courseId]/roster/route.ts
sed -i 's/{ params }: { params: { examId: string } }/{ params }: { params: Promise<{ examId: string }> }/g' src/app/api/export/exams/[examId]/results/route.ts

sed -i 's/const { assignmentId } = params;/const { assignmentId } = await params;/g' src/app/api/export/assignments/[assignmentId]/grades/route.ts
sed -i 's/const { courseId } = params;/const { courseId } = await params;/g' src/app/api/export/courses/[courseId]/roster/route.ts
sed -i 's/const { examId } = params;/const { examId } = await params;/g' src/app/api/export/exams/[examId]/results/route.ts

# Revert Record<string, unknown> back to any
sed -i 's/Record<string, unknown>/any/g' src/components/student/discussion/lesson-discussion.tsx
sed -i 's/Record<string, unknown>/any/g' src/components/student/learn-tabs.tsx
sed -i 's/Record<string, unknown>/any/g' src/components/teacher/teacher-nav.tsx
sed -i 's/Record<string, unknown>/any/g' src/services/notifications/notifications.ts

# Run build again
npm run build
