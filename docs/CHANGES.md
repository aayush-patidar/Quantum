# Technical Changes Log

## 2026-02-17: Fix My Courses Enrollment Filtering
- **Objective**: Ensure "My Courses" shows only user-enrolled courses, not hard-coded data.
- **Files Modified**:
  - `client/src/pages/courses.tsx`: Enhanced empty state UI, removed outdated comment.
  - `CHANGELOG.md`: Added entry for this fix.
  - `docs/CHANGES.md`: Added technical details.
  - `docs/changes/2026-02-17_my-courses-enrollment-only.md`: Created detailed documentation.
- **Backend Verification**:
  - `server/storage.ts`: `getEnrolledCoursesWithStats()` correctly uses `innerJoin` on `courseEnrollments`.
  - `server/routes.ts`: `/api/courses?enrolled=true` properly calls `getEnrolledCoursesWithStats()`.
- **Frontend Changes**:
  - Removed misleading comment suggesting backend doesn't filter properly.
  - Enhanced empty state with title, description, and "Browse Courses" button.
  - Query key `["/api/courses?enrolled=true"]` correctly fetches enrolled courses only.
- **Data Model**:
  - Enrollments stored in `course_enrollments` table with `userId` + `courseId`.
  - No hard-coded enrollments in seed data - users must explicitly enroll.

## 2026-02-17: Unify Education into Courses
- **Objective**: Consolidate redundant "Education" and "Courses" pages.
- **Files Modified**:
  - `client/src/pages/courses.tsx`: Major refactor to include Education UI features (Cards, Filter, Stats).
  - `client/src/App.tsx`: Replaced `/education` route with Redirect.
  - `client/src/components/app-sidebar.tsx`: Removed Education link.
  - `server/storage.ts`: Added `getAllCoursesWithStats` to fetch lesson counts.
  - `server/routes.ts`: Updated `/api/courses` to use `getAllCoursesWithStats`.
  - Deleted `client/src/pages/education.tsx`.
- **Key Features Migrated**:
  - Course Card UI with Icons and Difficulty Badges.
  - Lesson Count display (fetched from DB via new query logic).
  - Duration estimation logic (mocked based on lesson count).
