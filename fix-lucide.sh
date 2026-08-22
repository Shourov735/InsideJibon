#!/bin/bash

# Fix notification-bell
sed -i 's/import { Bell } from "lucide-react";//g' src/components/student/notifications/notification-bell.tsx
sed -i 's/<Bell className="h-5 w-5" \/>/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" \/><\/svg>/g' src/components/student/notifications/notification-bell.tsx

# Fix student/notifications/page.tsx
sed -i 's/import { Bell, Check, Trash } from "lucide-react";//g' src/app/student/notifications/page.tsx
sed -i 's/<Bell className="mx-auto h-12 w-12 text-secondary mb-4" \/>/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" className="mx-auto h-12 w-12 text-secondary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" \/><\/svg>/g' src/app/student/notifications/page.tsx
sed -i 's/<Check className="h-5 w-5" \/>/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" \/><\/svg>/g' src/app/student/notifications/page.tsx
sed -i 's/<Trash className="h-5 w-5" \/>/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" \/><\/svg>/g' src/app/student/notifications/page.tsx

# Fix teacher analytics
sed -i 's/import { Users, FileText, CheckCircle, Clock } from "lucide-react";//g' src/app/teacher/courses/[courseId]/analytics/page.tsx
sed -i 's/import { ArrowLeft } from "lucide-react";//g' src/app/teacher/courses/[courseId]/analytics/page.tsx
sed -i 's/<ArrowLeft className="h-4 w-4 mr-1" \/>/<svg xmlns="http:\/\/www.w3.org\/2000\/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" \/><\/svg>/g' src/app/teacher/courses/[courseId]/analytics/page.tsx
