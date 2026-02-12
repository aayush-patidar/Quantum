# QuantumCloud

## Overview

QuantumCloud is a full-stack web application that serves as a quantum computing cloud platform. It allows users to design quantum circuits, submit simulation jobs to various backends, and visualize results. The app features a circuit composer (visual editor), job queue management, backend status monitoring, and result visualization with charts.

The project follows a monorepo structure with a React frontend, Express backend, and PostgreSQL database using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Directory Structure
- `client/` — React frontend (Vite-based SPA)
- `server/` — Express backend (API + static serving)
- `shared/` — Shared code between frontend and backend (schema definitions)
- `migrations/` — Drizzle database migrations
- `script/` — Build scripts

### Frontend
- **Framework**: React with TypeScript
- **Bundler**: Vite
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation via @hookform/resolvers
- **Charts**: Recharts for result visualization
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

**Key Pages:**
- `/login` — Authentication (login/register with tabs)
- `/` — Dashboard with job stats and recent activity
- `/composer` — Visual quantum circuit editor
- `/circuits` — User's saved circuits list
- `/jobs` — Job queue with filtering by status and algorithm type
- `/backends` — Available quantum backends and their status
- `/results` — Job results with measurement histograms

### Backend
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript, run via `tsx` in development
- **API Pattern**: REST API under `/api/` prefix
- **Session Management**: express-session with MemoryStore (development) — connect-pg-simple is available for production
- **Authentication**: Custom implementation using scrypt password hashing with session-based auth. No external auth libraries like Passport are actively used in routes despite being in dependencies.
- **Middleware**: Request logging for API routes with timing, JSON body parsing with raw body preservation (for potential webhook verification)
- **Quantum Simulation**: Jobs are simulated server-side with randomized measurement results and artificial delays to mimic real quantum execution

### Database
- **Database**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Push**: `npm run db:push` uses drizzle-kit to push schema changes directly

**Key Tables:**
- `users` — User accounts with roles (admin, researcher, enterprise_user, student)
- `organizations` — Multi-tenant organization support with plan tiers (free, academic, enterprise)
- `circuits` — Quantum circuit definitions with QASM and JSON circuit data, versioning, visibility controls
- `quantum_backends` — Available backends (IBM, local simulator, PennyLane) with status tracking
- `jobs` — Job queue with status tracking (queued, running, completed, failed, cancelled) and algorithm type classification
- `job_results` — Measurement results and metadata for completed jobs

All primary keys use UUID generation via `gen_random_uuid()`.

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production Build**: Two-step — Vite builds the client to `dist/public/`, esbuild bundles the server to `dist/index.cjs`
- **Server bundling**: Select dependencies are bundled (allowlisted) to reduce cold start syscalls; others are kept external

### Authentication Flow
- Session-based auth stored server-side
- `/api/auth/register` — Create account
- `/api/auth/login` — Login with username/password
- `/api/auth/logout` — Destroy session
- `/api/auth/me` — Get current user (returns 401 if not authenticated)
- `requireAuth` middleware protects API routes

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database. Must be provisioned and `DATABASE_URL` environment variable must be set. Used for all data storage including sessions (connect-pg-simple available).

### Key NPM Dependencies
- **drizzle-orm** + **drizzle-kit**: Database ORM and migration tooling
- **express**: HTTP server framework (v5)
- **@tanstack/react-query**: Async state management
- **recharts**: Data visualization for quantum measurement results
- **zod** + **drizzle-zod**: Schema validation
- **react-hook-form**: Form state management
- **wouter**: Client-side routing
- **shadcn/ui** components (Radix UI based): Full component library
- **date-fns**: Date formatting utilities

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner`: Development tooling (conditionally loaded)