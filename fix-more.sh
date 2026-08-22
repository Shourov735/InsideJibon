#!/bin/bash

# Fix examAttempts.passed
sed -i 's/examAttempts.isPassed/examAttempts.passed/g' src/app/api/export/exams/[examId]/results/route.ts

# Fix requireStudent / requireTeacher return value
for file in src/app/student/actions/notification-actions.ts src/app/student/notifications/page.tsx src/app/teacher/courses/[courseId]/analytics/page.tsx; do
  if [ -f "$file" ]; then
    sed -i 's/const { user } = await requireStudent()/const user = await requireStudent()/g' "$file"
    sed -i 's/const { user } = await requireTeacher()/const user = await requireTeacher()/g' "$file"
  fi
done

# Fix db usage in profile services
sed -i 's/    db/    getDb()/g' src/services/profile/student-profile.ts
sed -i 's/    db/    getDb()/g' src/services/profile/teacher-profile.ts

