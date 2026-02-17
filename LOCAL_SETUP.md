# Local Setup Guide

This project has been configured to run locally on Windows with SQLite.

## Prerequisites
- Node.js (v20+)
- npm

## Configuration
The project uses a local SQLite database (`quantum.db`) instead of PostgreSQL to simplify local development.
The database schema is defined in `shared/schema.ts` and adapted for SQLite.

## Environment Variables
A `.env` file has been created with necessary variables:
- `PORT=3000` (Running on port 3000 to avoid conflicts)
- `NODE_ENV=development`
- `AI_INTEGRATIONS_OPENAI_API_KEY` (Placeholder - update if you want AI features)

## Running the App

1. **Install Dependencies** (Already done)
   ```bash
   npm install
   ```

2. **Setup Database** (Already done - created quantum.db)
   ```bash
   npm run db:push
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:3000`.

## Notes
- The database logic in `server/storage.ts` has been switched to use `better-sqlite3`.
- The `package.json` scripts have been updated for Windows compatibility (removed unix-style env vars).
