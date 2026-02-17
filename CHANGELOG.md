# Changelog

## Fix My Courses to Show Only Enrolled Courses (2026-02-17)
- **Fixed**: "My Courses" tab now correctly shows only courses the user has enrolled in
- **Removed**: Hard-coded course data from "My Courses" section
- **Enhanced**: Empty state UI with improved messaging and "Browse Courses" button
- **Verified**: Backend enrollment filtering is working correctly via `getEnrolledCoursesWithStats`
- **Updated**: Removed outdated comment suggesting backend filtering wasn't working

## Unify Education into Courses (2026-02-17)
- Unified Education and Courses pages into a single "Quantum Courses" experience.
- Removed standalone "Education" page and navigation link.
- Added redirect from `/education` to `/courses`.
- Enhanced Course Cards in Browse view to match the previous Education UI style.
- Added lesson count stats to `/api/courses` endpoint.
