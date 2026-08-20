# Educational Platform --- Complete Workflow Plan

## 1. Project Overview

This project is a zero-budget educational web platform for a
teacher/friend to:

-   Teach students through structured courses
-   Publish video lessons and study materials
-   Enroll students
-   Conduct online exams
-   Automatically evaluate objective exams
-   Track student progress
-   Analyze performance
-   Eventually sell paid courses
-   Eventually provide assignments, certificates, notifications, live
    classes, and intelligent recommendations

The core product idea is:

> **Course → Practice → Performance Tracking**

The first release should focus on a complete learning loop rather than
trying to implement every possible LMS feature.

------------------------------------------------------------------------

# 2. Hard Constraints

## Budget

The platform must be buildable and deployable at **\$0 initially**.

Therefore:

-   Prefer free tiers
-   Avoid paid APIs
-   Avoid paid infrastructure
-   Avoid unnecessary services
-   Avoid a separate backend server initially
-   Avoid expensive video hosting/streaming
-   Monitor free-tier quotas

## Existing Skills

The project should take advantage of existing familiarity with:

-   Next.js
-   TypeScript
-   Tailwind CSS
-   Neon PostgreSQL
-   MongoDB
-   Clerk
-   Backblaze B2
-   Docker
-   Vercel
-   Cloudflare

## Technology Direction

Use:

-   Next.js + TypeScript
-   Tailwind CSS
-   shadcn/ui
-   Clerk
-   Neon PostgreSQL
-   Drizzle ORM
-   Backblaze B2
-   Vercel
-   Cloudflare
-   GitHub
-   Docker for local development

Do **not** introduce Spring Boot, MongoDB, microservices, Kubernetes, or
a separate production backend unless a real requirement appears later.

------------------------------------------------------------------------

# 3. Product Vision

The platform should eventually support three major areas:

``` text
                    EDUCATIONAL PLATFORM
                           |
          +----------------+----------------+
          |                |                |
       LEARNING          TESTING         BUSINESS
          |                |                |
       Courses           Exams          Enrollment
       Lessons           Questions      Payments
       Videos            Attempts       Orders
       Materials         Results        Certificates
       Progress          Ranking
          |                |                |
          +----------------+----------------+
                           |
                    USER / IDENTITY
                           |
             +-------------+-------------+
             |                           |
          STUDENT                     TEACHER
```

The differentiator should eventually become:

``` text
Study
  ↓
Practice
  ↓
Exam
  ↓
Performance
  ↓
Weak-topic detection
  ↓
Recommended practice
  ↓
Study again
```

------------------------------------------------------------------------

# 4. Product Roles

## 4.1 Student

A student can:

-   Register/login
-   Browse courses
-   View course details
-   Enroll in courses
-   Study lessons
-   Watch videos
-   Read/download permitted materials
-   Track course progress
-   Take exams
-   View results
-   Review answers
-   Submit assignments
-   View performance
-   Receive notifications
-   View certificates
-   Manage profile

## 4.2 Teacher

A teacher can:

-   Login
-   Create courses
-   Edit courses
-   Publish/unpublish courses
-   Create modules
-   Create lessons
-   Add video lessons
-   Attach study materials
-   Create questions
-   Create exams
-   Schedule exams
-   View students
-   View results
-   Grade assignments
-   Publish announcements
-   View course/student analytics

## 4.3 Admin

Admin can:

-   Manage users
-   Manage teachers
-   Manage courses
-   Manage platform-level settings
-   Manage payments
-   View platform-wide analytics
-   Moderate content

Teacher and admin permissions should remain separate.

------------------------------------------------------------------------

# 5. Zero-Cost Architecture

``` text
                    Cloudflare
                 DNS / Security
                        |
                        v
                    Vercel
                  Next.js App
                        |
             +----------+----------+
             |          |          |
             v          v          v
           Clerk      Neon        B2
           Auth      PostgreSQL  Storage
```

## Responsibilities

### Cloudflare

Use for:

-   DNS
-   Domain management
-   Basic security
-   CDN/caching where appropriate

Do not introduce Workers unless there is an actual use case.

### Vercel

Use for:

-   Next.js hosting
-   Production deployment
-   Preview deployments

### Next.js

Use one application for:

-   Public website
-   Student dashboard
-   Teacher dashboard
-   Admin dashboard
-   Server Components
-   Server Actions
-   Route Handlers
-   Validation
-   Application logic

### Clerk

Use for:

-   Authentication
-   Sessions
-   Sign-in/sign-up
-   Password management
-   Optional social login

Do not store the entire application domain in Clerk.

### Neon

Use for:

-   Users/application profiles
-   Courses
-   Lessons
-   Enrollments
-   Progress
-   Exams
-   Questions
-   Attempts
-   Answers
-   Results
-   Assignments
-   Orders
-   Payments
-   Notifications
-   Certificates

### Backblaze B2

Use for:

-   PDFs
-   Images
-   Course thumbnails
-   Teacher photos
-   Assignment files
-   Certificates
-   Other uploaded assets

Do not store large files directly in PostgreSQL.

### Video

Do not build a custom video streaming system initially.

Preferred zero-cost approach:

1.  Teacher uploads educational videos to an appropriate video platform
    as unlisted/private where suitable.
2.  Store the external video identifier in PostgreSQL.
3.  Embed the video inside the lesson page.

B2 can be used for smaller files, but the architecture should not assume
unlimited free video bandwidth.

------------------------------------------------------------------------

# 6. Repository Structure

``` text
edu-platform/
|
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx
│   │   ├── courses/
│   │   ├── teachers/
│   │   ├── exams/
│   │   ├── resources/
│   │   ├── about/
│   │   └── contact/
│   │
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   │
│   ├── student/
│   │   ├── page.tsx
│   │   ├── courses/
│   │   ├── classes/
│   │   ├── materials/
│   │   ├── exams/
│   │   ├── results/
│   │   ├── assignments/
│   │   ├── progress/
│   │   ├── certificates/
│   │   ├── notifications/
│   │   └── profile/
│   │
│   ├── teacher/
│   │   ├── page.tsx
│   │   ├── courses/
│   │   ├── lessons/
│   │   ├── materials/
│   │   ├── exams/
│   │   ├── questions/
│   │   ├── students/
│   │   ├── assignments/
│   │   ├── announcements/
│   │   └── analytics/
│   │
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── users/
│   │   ├── teachers/
│   │   ├── courses/
│   │   ├── payments/
│   │   └── analytics/
│   │
│   └── api/
│
├── components/
│   ├── ui/
│   ├── courses/
│   ├── exams/
│   ├── dashboard/
│   ├── forms/
│   └── shared/
│
├── db/
│   ├── schema/
│   ├── migrations/
│   └── index.ts
│
├── lib/
│   ├── auth/
│   ├── permissions/
│   ├── storage/
│   ├── validation/
│   └── utils/
│
├── actions/
│   ├── courses.ts
│   ├── lessons.ts
│   ├── enrollment.ts
│   ├── progress.ts
│   ├── exams.ts
│   └── assignments.ts
│
├── public/
│
├── drizzle.config.ts
├── middleware.ts
├── package.json
└── README.md
```

------------------------------------------------------------------------

# 7. Development Workflow

The project should be developed in vertical slices.

Do not build the entire frontend first and the entire backend later.

For each feature:

``` text
Requirement
    ↓
Domain rules
    ↓
Database schema
    ↓
Server logic
    ↓
Authorization
    ↓
UI
    ↓
Validation
    ↓
Testing
    ↓
Deployment
```

This keeps every feature working end-to-end.

------------------------------------------------------------------------

# 8. Phase 0 --- Requirements and Planning

## Goals

Before coding:

-   Confirm the teacher's real teaching workflow
-   Identify target students
-   Decide initial subjects
-   Decide whether courses are free, paid, or both
-   Decide how video lessons will be hosted
-   Decide which exam types are needed
-   Identify teacher/admin responsibilities
-   Define MVP scope

## Deliverables

-   Product requirements
-   User roles
-   Main use cases
-   Feature priority
-   Domain model
-   Initial ER diagram
-   Initial navigation structure

## Important questions

Resolve:

-   Can a course have multiple teachers?
-   Can students enroll in free courses?
-   Can students retake exams?
-   Can an exam have a deadline?
-   Can a teacher edit an exam after students have started it?
-   How is progress calculated?
-   How is ranking calculated?
-   What happens when a course is unpublished?
-   Which materials can students download?

------------------------------------------------------------------------

# 9. Phase 1 --- Project Foundation

## Goals

Create a clean, deployable Next.js project.

## Tasks

-   Create GitHub repository
-   Create Next.js project
-   Configure TypeScript
-   Configure Tailwind
-   Configure shadcn/ui
-   Configure ESLint
-   Configure environment variables
-   Connect Vercel
-   Connect Neon
-   Connect Clerk
-   Configure Drizzle
-   Configure local development
-   Add README
-   Add basic CI checks if useful

## First deployment

Before implementing features:

``` text
Local Next.js
      ↓
GitHub
      ↓
Vercel
      ↓
Production URL
```

The application should successfully deploy before major development
begins.

------------------------------------------------------------------------

# 10. Phase 2 --- Authentication and Authorization

## Goals

Implement secure identity and roles.

## Authentication flow

``` text
User
 ↓
Clerk
 ↓
Authenticated session
 ↓
Next.js
 ↓
Application user record
```

## Database user record

Conceptually:

``` text
users
-----------------
id
clerk_user_id
role
display_name
created_at
updated_at
```

## Roles

``` text
STUDENT
TEACHER
ADMIN
```

## Workflow

### First login

``` text
Clerk authentication
       ↓
Check application user
       ↓
User exists?
   /          \
 yes           no
 |              |
continue       create
```

## Authorization

Authorization must be enforced on the server.

Never rely only on:

-   Hidden buttons
-   Frontend route protection
-   Client-side role checks

Every protected operation should verify permissions server-side.

------------------------------------------------------------------------

# 11. Phase 3 --- Public Website

## Pages

``` text
/
 /courses
 /courses/[slug]
 /teachers
 /teachers/[slug]
 /exams
 /resources
 /about
 /contact
 /sign-in
 /sign-up
```

## Homepage workflow

``` text
Visitor
 ↓
Homepage
 ↓
Understand value proposition
 ↓
Explore courses
 ↓
View course
 ↓
Register/login
 ↓
Enroll
```

## Homepage sections

-   Hero
-   Featured courses
-   Categories
-   Teachers
-   Benefits
-   Exam preview
-   Genuine student reviews when available
-   Latest notices
-   Final CTA
-   Footer

Do not use fake statistics or fake reviews.

------------------------------------------------------------------------

# 12. Phase 4 --- Course Domain

## Domain hierarchy

``` text
Course
  |
  +-- Module
        |
        +-- Lesson
              |
              +-- Material
```

## Course fields

Conceptually:

``` text
Course
- id
- title
- slug
- description
- thumbnail
- teacher_id
- price
- status
- published_at
- created_at
- updated_at
```

## Module

``` text
Module
- id
- course_id
- title
- description
- order
```

## Lesson

``` text
Lesson
- id
- module_id
- title
- description
- video_type
- video_reference
- order
- is_preview
```

## Course lifecycle

``` text
DRAFT
  ↓
READY
  ↓
PUBLISHED
  ↓
UNPUBLISHED
```

Do not hard-delete important production data casually.

Prefer soft-delete/archive strategies where appropriate.

------------------------------------------------------------------------

# 13. Phase 5 --- Teacher Course Management

## Teacher workflow

``` text
Teacher Dashboard
      ↓
Create Course
      ↓
Enter course information
      ↓
Save draft
      ↓
Create modules
      ↓
Create lessons
      ↓
Attach videos/materials
      ↓
Preview course
      ↓
Publish
```

## Teacher should be able to

-   Create course
-   Edit course
-   Reorder modules
-   Reorder lessons
-   Add/remove materials
-   Add video references
-   Mark preview lessons
-   Publish/unpublish

## Important rule

A teacher should only be able to modify courses they are authorized to
manage.

------------------------------------------------------------------------

# 14. Phase 6 --- Storage

## File upload workflow

``` text
Teacher
 ↓
Select file
 ↓
Validate file
 ↓
Upload to B2
 ↓
Receive file key
 ↓
Save metadata in Neon
```

## Database stores

``` text
material
- id
- lesson_id
- name
- file_key
- file_type
- file_size
- created_at
```

## B2 stores

``` text
materials/
course-images/
teacher-images/
assignments/
certificates/
```

Do not store raw files in Neon.

## Security

For private files:

-   Do not expose permanent unrestricted URLs unnecessarily.
-   Validate ownership/permission before generating access.
-   Validate file type and size.
-   Never trust a filename from the client.

------------------------------------------------------------------------

# 15. Phase 7 --- Student Course Discovery

## Workflow

``` text
Visitor
 ↓
Courses
 ↓
Search/filter
 ↓
Course details
 ↓
View syllabus
 ↓
View teacher
 ↓
View price
 ↓
View sample lesson
 ↓
Enroll
```

## Courses page

Support:

-   Search
-   Category
-   Subject
-   Level
-   Teacher
-   Price
-   Published status

Start with simple filters. Add advanced search only when needed.

------------------------------------------------------------------------

# 16. Phase 8 --- Enrollment

## Free course workflow

``` text
Student
 ↓
View course
 ↓
Enroll
 ↓
Check eligibility
 ↓
Create enrollment
 ↓
Course unlocked
```

## Paid course workflow

Initially, paid enrollment can remain a future phase.

Later:

``` text
Student
 ↓
Checkout
 ↓
Payment
 ↓
Verified payment
 ↓
Create enrollment
 ↓
Unlock course
```

Never create paid enrollment based solely on a frontend success
response.

------------------------------------------------------------------------

# 17. Phase 9 --- Student Learning Experience

## Dashboard

Student dashboard should show:

-   My courses
-   Continue learning
-   Upcoming exams
-   Recent results
-   Progress
-   Notifications

## Learning workflow

``` text
Student
 ↓
My Courses
 ↓
Open Course
 ↓
Open Module
 ↓
Open Lesson
 ↓
Watch/read
 ↓
Mark progress
 ↓
Next lesson
```

## Continue learning

Store enough information to identify:

``` text
student
course
last lesson
completion state
```

Then:

``` text
Student Dashboard
       ↓
Continue Learning
       ↓
Last incomplete lesson
```

------------------------------------------------------------------------

# 18. Phase 10 --- Progress Tracking

## Basic progress

Start with lesson completion.

``` text
Course Progress =
completed lessons / total lessons
```

Example:

``` text
12 / 15 = 80%
```

## Progress workflow

``` text
Student completes lesson
       ↓
Server validates enrollment
       ↓
Record completion
       ↓
Recalculate course progress
       ↓
Dashboard updates
```

Do not trust a client-provided percentage.

Calculate important progress values on the server.

------------------------------------------------------------------------

# 19. Phase 11 --- Exam System

This is the second major product milestone.

## Initial exam type

Start with:

-   MCQ
-   Single correct answer
-   Fixed marks
-   Timer
-   Automatic grading
-   Result

Do not begin with every question type.

------------------------------------------------------------------------

# 20. Question Bank

## Question structure

``` text
Question
  |
  +-- QuestionOption
```

Conceptually:

``` text
Question
- id
- subject/topic
- text
- explanation
- marks
- negative_marks
```

``` text
QuestionOption
- id
- question_id
- text
- is_correct
```

The correct answer must never be exposed to the client before
submission.

------------------------------------------------------------------------

# 21. Exam Creation

## Teacher workflow

``` text
Teacher
 ↓
Create Exam
 ↓
Select Course/Topic
 ↓
Configure duration
 ↓
Configure marks
 ↓
Select questions
 ↓
Set schedule/deadline
 ↓
Preview
 ↓
Publish
```

## Exam configuration

Potential fields:

-   Title
-   Course
-   Topic/module
-   Duration
-   Start time
-   End time
-   Total marks
-   Passing marks
-   Negative marking
-   Attempt limit
-   Question randomization
-   Option randomization

Implement only the necessary fields first.

------------------------------------------------------------------------

# 22. Exam Attempt

## Workflow

``` text
Student
 ↓
Open exam
 ↓
Server checks eligibility
 ↓
Create exam attempt
 ↓
Start timer
 ↓
Answer questions
 ↓
Autosave answers
 ↓
Submit
 ↓
Server evaluates
 ↓
Create result
```

## Important security rule

The browser must not be trusted for:

-   Final score
-   Correct answers
-   Exam duration
-   Attempt eligibility
-   Submission validity

The server is authoritative.

------------------------------------------------------------------------

# 23. Exam Autosave

The exam should not depend on a single final submit request.

Workflow:

``` text
Answer selected
      ↓
Autosave
      ↓
Server validates attempt
      ↓
Store answer
```

If the browser crashes or connection temporarily fails, the attempt
should have recoverable state where possible.

------------------------------------------------------------------------

# 24. Exam Timer

Store authoritative timestamps.

Conceptually:

``` text
started_at
expires_at
submitted_at
```

Calculate remaining time from server-side timestamps.

Do not trust:

``` text
clientTimer = 20 minutes
```

as the source of truth.

------------------------------------------------------------------------

# 25. Auto-Grading

After submission:

``` text
Exam Attempt
 ↓
Answers
 ↓
Compare with correct options
 ↓
Calculate marks
 ↓
Apply negative marking if configured
 ↓
Calculate percentage
 ↓
Determine pass/fail
 ↓
Store result
```

Example:

``` text
Correct = 18
Wrong = 2
Skipped = 0

Score = calculated by server
```

------------------------------------------------------------------------

# 26. Results

Student result page:

``` text
Exam
Score
Percentage
Correct
Wrong
Skipped
Time taken
Pass/fail
```

Later add:

-   Topic breakdown
-   Question review
-   Rank
-   Average score
-   Percentile

------------------------------------------------------------------------

# 27. Ranking

Ranking should be treated as a separate business rule.

Possible ranking criteria:

1.  Score
2.  Time
3.  Submission time

Define the exact rule before implementing it.

Do not assume ranking simply means sorting by percentage.

------------------------------------------------------------------------

# 28. Phase 12 --- Performance Analytics

After exam results work correctly, build analytics.

## Student analytics

``` text
Subject performance
Topic performance
Exam score trend
Course completion
Weak areas
```

Example:

``` text
Physics       84%
Math          72%
Chemistry     91%
```

## Topic analysis

``` text
Newton's Laws     55%
Kinematics        82%
Work & Energy     76%
```

This enables the feedback loop:

``` text
Study
 ↓
Exam
 ↓
Result
 ↓
Weak topic
 ↓
Practice recommendation
```

------------------------------------------------------------------------

# 29. Phase 13 --- Assignments

Implement after exams.

## Teacher workflow

``` text
Create Assignment
 ↓
Attach to course/lesson
 ↓
Set deadline
 ↓
Publish
```

## Student workflow

``` text
View assignment
 ↓
Read instructions
 ↓
Upload submission
 ↓
Submit
```

## Teacher workflow

``` text
Open submissions
 ↓
Review
 ↓
Grade
 ↓
Add feedback
 ↓
Publish result
```

------------------------------------------------------------------------

# 30. Phase 14 --- Notifications

Start with in-app notifications.

Examples:

-   New lesson
-   Exam scheduled
-   Exam result published
-   Assignment deadline
-   New announcement

Workflow:

``` text
System event
 ↓
Create notification
 ↓
Student dashboard
 ↓
Unread count
 ↓
Read notification
```

Do not make email mandatory at this stage.

------------------------------------------------------------------------

# 31. Phase 15 --- Announcements

Teacher/admin workflow:

``` text
Create announcement
 ↓
Choose audience
 ↓
Publish
 ↓
Create notifications
```

Audience could be:

-   All students
-   Course students
-   Specific group

------------------------------------------------------------------------

# 32. Phase 16 --- Certificates

Implement only after course completion rules are reliable.

Workflow:

``` text
Student completes course
 ↓
Check completion criteria
 ↓
Generate certificate record
 ↓
Provide certificate
```

Possible future fields:

``` text
certificate_id
student
course
issue_date
verification_code
```

A verification page can later be:

``` text
/certificates/[verification-code]
```

------------------------------------------------------------------------

# 33. Phase 17 --- Payments

Only implement when the teacher is ready to sell courses.

## Payment architecture

``` text
Student
 ↓
Checkout
 ↓
Payment provider
 ↓
Provider confirms payment
 ↓
Webhook/server verification
 ↓
Payment record
 ↓
Order completed
 ↓
Enrollment created
```

## Database concepts

``` text
Order
Payment
Enrollment
```

Do not mix these concepts into one table.

## Security

Never trust:

``` text
POST /enroll
{
  "paymentSuccessful": true
}
```

The backend must verify payment independently.

------------------------------------------------------------------------

# 34. Phase 18 --- Live Classes

This is optional and should come late.

Do not build video conferencing from scratch.

Prefer an existing free/low-cost meeting solution and store:

``` text
class
- title
- course_id
- start_time
- meeting_url
```

Student workflow:

``` text
Dashboard
 ↓
Upcoming class
 ↓
Join class
 ↓
External meeting platform
```

------------------------------------------------------------------------

# 35. Phase 19 --- Advanced Analytics

Teacher dashboard:

``` text
Total students
Course enrollments
Completion rate
Average exam score
Exam participation
Weak topics
Assignment performance
```

Course analytics:

``` text
Enrollment
Completion
Lesson drop-off
Exam performance
```

Avoid building complex analytics before real student data exists.

------------------------------------------------------------------------

# 36. Phase 20 --- Intelligent Recommendations

Only after enough performance data exists.

Possible recommendation logic:

``` text
Student performance
        ↓
Identify weak topic
        ↓
Find related lessons
        ↓
Find practice questions
        ↓
Recommend content
```

Do not require an AI API for the first recommendation engine.

A rule-based system can be:

``` text
if topic_score < 60%:
    recommend revision lesson
    recommend practice set
    recommend topic test
```

This keeps the system free.

AI can be added later if it provides real value.

------------------------------------------------------------------------

# 37. Database Development Workflow

Never randomly edit production tables.

Use:

``` text
Schema definition
      ↓
Migration
      ↓
Local testing
      ↓
Review
      ↓
Apply migration
```

Recommended flow:

``` text
Drizzle schema
     ↓
Generate migration
     ↓
Review SQL
     ↓
Apply
     ↓
Test
```

Keep migrations in Git.

------------------------------------------------------------------------

# 38. Data Integrity Rules

Important rules:

-   Use foreign keys
-   Use unique constraints where necessary
-   Use indexes for frequently queried fields
-   Use timestamps
-   Validate enum/status values
-   Prevent duplicate enrollment
-   Prevent duplicate exam attempts where prohibited
-   Prevent unauthorized teacher access
-   Prevent students from accessing unowned courses
-   Keep payment records immutable where appropriate

Example:

``` text
(student_id, course_id)
```

should normally be unique in enrollment.

------------------------------------------------------------------------

# 39. API / Server Action Rules

Use Server Actions where they make the feature simpler.

Use Route Handlers when you need:

-   Public API
-   Webhooks
-   External integrations
-   File operations requiring an HTTP endpoint
-   Explicit API contracts

For every mutation:

``` text
Request
 ↓
Authentication
 ↓
Authorization
 ↓
Validation
 ↓
Business rule
 ↓
Database mutation
 ↓
Response
```

Use Zod or equivalent validation for external/user-controlled input.

------------------------------------------------------------------------

# 40. Security Workflow

Every protected feature should follow:

``` text
Is user authenticated?
        ↓
Does user have required role?
        ↓
Does user own/have access to resource?
        ↓
Is input valid?
        ↓
Perform operation
```

Important protections:

-   Clerk session validation
-   Server-side authorization
-   Input validation
-   File validation
-   Rate limiting where necessary
-   Secure secrets
-   No secret keys in client code
-   No answer-key leakage
-   No payment trust on frontend
-   No unrestricted private file URLs
-   SQL/ORM-safe queries
-   Proper error handling

------------------------------------------------------------------------

# 41. Environment Variables

Keep secrets in:

``` text
.env.local
```

Never commit it.

Example categories:

``` text
CLERK_*
DATABASE_URL
B2_*
NEXT_PUBLIC_*
```

Only variables explicitly intended for browser use should have a public
prefix.

Never expose:

-   Database credentials
-   B2 secret keys
-   Private API keys
-   Webhook secrets

------------------------------------------------------------------------

# 42. Git Workflow

Use:

``` text
main
```

for production.

Feature branches:

``` text
feature/auth
feature/course-management
feature/exam-engine
feature/student-progress
```

Workflow:

``` text
Create branch
 ↓
Implement feature
 ↓
Test
 ↓
Commit
 ↓
Push
 ↓
Pull request
 ↓
Review
 ↓
Merge
 ↓
Vercel deploy
```

Use meaningful commits:

``` text
feat: add course creation
feat: implement exam attempts
fix: prevent duplicate enrollment
refactor: extract course authorization
```

------------------------------------------------------------------------

# 43. Testing Strategy

Do not wait until the end to test.

## Unit tests

Test:

-   Score calculation
-   Negative marking
-   Progress calculation
-   Ranking
-   Permission rules
-   Course completion rules

## Integration tests

Test:

-   Authentication flow
-   Enrollment
-   Course access
-   Exam submission
-   Result creation

## End-to-end tests

Important flows:

``` text
Student registration
Student enrollment
Student learning
Student exam
Teacher course creation
Teacher exam creation
```

------------------------------------------------------------------------

# 44. Manual Acceptance Tests

Before calling a phase complete, manually verify:

## Student

-   Can register
-   Can login
-   Can browse courses
-   Can enroll
-   Can access enrolled content
-   Cannot access unauthorized content
-   Can complete lessons
-   Progress updates
-   Can take exam
-   Results are correct

## Teacher

-   Can login
-   Can create course
-   Can edit own course
-   Can create lessons
-   Can publish course
-   Can create questions
-   Can create exam
-   Can view results

## Security

-   Student cannot access teacher routes
-   Student cannot edit course
-   Teacher cannot edit another teacher's course
-   Correct answers are not exposed
-   Private materials are protected

------------------------------------------------------------------------

# 45. UI Development Workflow

Establish the design system before creating dozens of pages.

## Define

-   Typography
-   Brand color
-   Neutral colors
-   Spacing
-   Border radius
-   Shadows
-   Buttons
-   Inputs
-   Cards
-   Tables
-   Dialogs
-   Dropdowns
-   Toasts
-   Empty states
-   Loading states
-   Error states

Use Tailwind + shadcn/ui.

Avoid:

-   Excessive gradients
-   Excessive animations
-   Too many colors
-   Too many cards
-   Unnecessary carousels
-   Inconsistent spacing

------------------------------------------------------------------------

# 46. Responsive Design

Desktop:

``` text
Sidebar + content
```

Mobile:

``` text
Drawer + content
```

Test:

-   320px
-   375px
-   768px
-   1024px
-   1440px+

Especially test:

-   Exam interface
-   Video player
-   Tables
-   Course builder
-   Dashboard

------------------------------------------------------------------------

# 47. Accessibility

At minimum:

-   Semantic HTML
-   Keyboard navigation
-   Visible focus states
-   Proper labels
-   Good color contrast
-   Accessible buttons
-   Alt text
-   Error messages
-   Form validation feedback

Do not treat accessibility as a final decoration.

------------------------------------------------------------------------

# 48. SEO

Public pages should be SEO-friendly.

Implement:

-   Metadata
-   Open Graph metadata
-   Semantic headings
-   Course page metadata
-   Sitemap
-   Robots configuration
-   Clean URLs
-   Structured data where useful

Private dashboards do not need public SEO.

------------------------------------------------------------------------

# 49. Performance

Because the platform is hosted on a free tier:

Prefer:

-   Server Components
-   Static rendering where possible
-   Cached public course pages
-   Optimized images
-   Pagination
-   Lazy loading
-   Minimal client-side JavaScript

Avoid:

-   Huge client components
-   Unnecessary polling
-   Loading every course at once
-   Large images
-   Unnecessary database queries

------------------------------------------------------------------------

# 50. Free-Tier Monitoring

Create a simple infrastructure checklist:

``` text
Vercel usage
Neon storage/compute
Clerk user count
B2 storage
B2 bandwidth
Cloudflare usage
```

Do not assume free tiers are unlimited.

Set up a habit of checking usage before releasing the platform to many
users.

------------------------------------------------------------------------

# 51. MVP Definition

The first production-capable MVP is:

## Public

-   Home
-   Courses
-   Course details
-   Teacher information
-   Login
-   Register

## Student

-   Dashboard
-   My courses
-   Course learning
-   Video lessons
-   Materials
-   Progress

## Teacher

-   Dashboard
-   Course CRUD
-   Module CRUD
-   Lesson CRUD
-   Material management
-   Publish/unpublish

## Authentication

-   Clerk
-   Student role
-   Teacher role
-   Server-side authorization

## Infrastructure

-   Vercel
-   Neon
-   Clerk
-   B2
-   Cloudflare
-   GitHub

This is the first major milestone.

------------------------------------------------------------------------

# 52. MVP Success Criteria

The MVP is successful when this complete workflow works:

``` text
Teacher
  ↓
Login
  ↓
Create Course
  ↓
Create Module
  ↓
Create Lesson
  ↓
Attach Video
  ↓
Attach PDF
  ↓
Publish
        ↓
Student
  ↓
Register
  ↓
Login
  ↓
Browse Course
  ↓
Enroll
  ↓
Open Course
  ↓
Watch Lesson
  ↓
Read Material
  ↓
Complete Lesson
  ↓
Progress Updates
```

If this works reliably, the platform has a real foundation.

------------------------------------------------------------------------

# 53. Second Major Milestone

Then implement:

``` text
Teacher
  ↓
Create Question Bank
  ↓
Create Exam
  ↓
Publish Exam
        ↓
Student
  ↓
Start Exam
  ↓
Answer
  ↓
Autosave
  ↓
Submit
        ↓
Server
  ↓
Evaluate
  ↓
Result
        ↓
Student
  ↓
Review Performance
```

This is the second major milestone.

------------------------------------------------------------------------

# 54. Third Major Milestone

Then:

``` text
Exam Results
     ↓
Performance Analytics
     ↓
Weak Topic Detection
     ↓
Recommended Lessons
     ↓
Recommended Practice
```

This is where the platform starts becoming differentiated.

------------------------------------------------------------------------

# 55. Future Feature Roadmap

After the core system works:

``` text
Phase A
Course + Learning
        ↓
Phase B
Exams + Results
        ↓
Phase C
Performance Analytics
        ↓
Phase D
Assignments
        ↓
Phase E
Payments
        ↓
Phase F
Certificates
        ↓
Phase G
Notifications
        ↓
Phase H
Live Classes
        ↓
Phase I
Advanced Recommendations
        ↓
Phase J
AI-assisted learning
```

Do not reverse this order without a real product reason.

------------------------------------------------------------------------

# 56. Things NOT to Build Initially

Do not initially build:

-   Microservices
-   Custom video streaming
-   Custom authentication
-   Custom payment gateway
-   Chat system
-   Real-time messaging
-   AI tutor
-   AI-generated exams
-   Complex recommendation engine
-   Mobile app
-   Kubernetes
-   Dedicated backend server
-   Complex event-driven architecture
-   Custom analytics infrastructure

Every one of these can be added later.

------------------------------------------------------------------------

# 57. Final Architecture

``` text
                         CLOUDFLARE
                    DNS / Basic Security
                              |
                              v
                           VERCEL
                              |
                    +---------+---------+
                    |                   |
                    v                   v
               NEXT.JS APP          STATIC ASSETS
                    |
       +------------+-------------+
       |            |             |
       v            v             v
    CLERK         NEON            B2
    Auth        PostgreSQL      Storage
       |            |             |
       +------------+-------------+
                    |
                    v
              DOMAIN LOGIC
                    |
      +-------------+-------------+
      |             |             |
      v             v             v
   Learning      Testing       Business
   Courses       Exams         Enrollment
   Lessons       Results       Payments
   Materials     Analytics     Orders
   Progress
```

------------------------------------------------------------------------

# 58. Final Development Order

The exact implementation order should be:

``` text
01. Requirements
02. Domain model
03. ER diagram
04. Repository setup
05. Next.js setup
06. Tailwind/shadcn setup
07. Clerk setup
08. Neon setup
09. Drizzle setup
10. Vercel deployment
11. User/role model
12. Authorization
13. Public layout
14. Homepage
15. Course listing
16. Course details
17. Teacher dashboard
18. Course CRUD
19. Module CRUD
20. Lesson CRUD
21. B2 integration
22. Student dashboard
23. Enrollment
24. Course learning page
25. Progress tracking
26. Exam database model
27. Question bank
28. Exam builder
29. Exam attempt
30. Autosave
31. Timer
32. Auto-grading
33. Results
34. Ranking
35. Performance analytics
36. Assignments
37. Notifications
38. Certificates
39. Payment integration
40. Advanced analytics
41. Recommendations
42. Security audit
43. Performance optimization
44. Accessibility audit
45. SEO audit
46. End-to-end testing
47. Production deployment
48. Usage monitoring
```

------------------------------------------------------------------------

# 59. The Golden Rule

For every new feature, ask:

1.  Does the teacher actually need it?
2.  Does the student actually benefit from it?
3.  Can it be implemented using the existing free stack?
4.  Does it introduce unnecessary infrastructure?
5.  Can we postpone it?
6.  Does it improve the core loop?

The core loop is:

``` text
                +----------------+
                |     COURSE     |
                +-------+--------+
                        |
                        v
                +----------------+
                |     STUDY      |
                +-------+--------+
                        |
                        v
                +----------------+
                |    PRACTICE    |
                +-------+--------+
                        |
                        v
                +----------------+
                |      EXAM      |
                +-------+--------+
                        |
                        v
                +----------------+
                |    RESULT      |
                +-------+--------+
                        |
                        v
                +----------------+
                |   PERFORMANCE  |
                +-------+--------+
                        |
                        v
                +----------------+
                | RECOMMENDATION |
                +-------+--------+
                        |
                        +----------> STUDY
```

Build this loop extremely well before trying to build everything else.

------------------------------------------------------------------------

# 60. Immediate Next Step

Do **not** start implementing all 60 phases at once.

The next engineering task should be:

``` text
Requirements
    ↓
Domain Model
    ↓
ER Diagram
    ↓
Database Schema
```

Specifically, define:

``` text
User
Teacher
Student
Course
CourseModule
Lesson
Material
Enrollment
Progress
Question
QuestionOption
Exam
ExamQuestion
ExamAttempt
ExamAnswer
Result
```

Then validate the relationships and business rules before creating the
actual Drizzle schema.

Once that is stable, implementation can proceed feature-by-feature
without repeatedly redesigning the database.
