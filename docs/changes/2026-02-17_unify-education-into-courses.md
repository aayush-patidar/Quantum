# Unify Education into Courses

**Date**: 2026-02-17
**Author**: Antigravity

## Summary
The "Education" page was a static/mock prototype while "Courses" was the data-driven implementation. I have unified them by merging the superior UI of "Education" into the "Courses" page and removing the "Education" page.

## Why change was made
To eliminate redundancy and confusion for users by having a single "Courses" entry point that provides all specific functionality.

## Before/After behavior
- **Before**: Two sidebar items "Education" (static) and "Courses" (dynamic). Education had nice UI cards. Courses had basic UI.
- **After**: One sidebar item "Courses". The "Browse" tab now displays courses using the enhanced UI from the Education page, including icons, difficulty badges, and lesson counts. Navigating to `/education` redirects to `/courses`.

## Routes impacted
- `GET /education`: Redirects to `/courses`.
- `GET /api/courses`: Response now includes `lessonCount` property for each course.

## Components/services impacted
- `CoursesPage` (`client/src/pages/courses.tsx`)
- `AppRouter` (`client/src/App.tsx`)
- `AppSidebar` (`client/src/components/app-sidebar.tsx`)
- `DatabaseStorage` (`server/storage.ts`)

## How to verify manually (checklist)
1. Navigate to `/courses` via sidebar.
2. Verify "Browse Courses" tab shows course cards with icons and badges matching the "Education" style.
3. Verify "My Courses" tab works (if enrolled).
4. Verify "Teach" tab works.
5. Try to access `/education` directly in browser bar -> should redirect to `/courses`.
6. Verify "Education" is gone from sidebar.

## Follow-ups / TODOs
- Seed the database with the original "Education" mock courses if they are missing from the DB.
- Consider adding `estimatedMinutes` column to `courses` table to replace the mock duration calculation.
