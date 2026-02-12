# QuantumCloud

## Overview

QuantumCloud is a full-stack web application that serves as a quantum computing cloud platform. It allows users to design quantum circuits, submit simulation jobs to various backends, and visualize results. The platform includes a visual circuit composer with Bloch sphere visualization, multi-language code export, job queue management, 24 quantum backends from 11 providers, AI-powered quantum expert assistant, credit system, API key management, support ticketing, documentation hub, education courses, and hackathon organization.

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
- `/composer` — Visual quantum circuit editor with 20 gates, Bloch sphere, multi-language export
- `/circuits` — User's saved circuits list
- `/jobs` — Job queue with filtering by status and algorithm type
- `/backends` — 24 quantum backends from IBM, AWS, AQT, IQM, Pasqal, QuEra, Rigetti, Quantinuum, NEC, PennyLane
- `/results` — Job results with measurement histograms
- `/settings` — Account settings (profile, security, API keys with 24hr cooldown, credits/billing)
- `/support` — Support ticket system with messaging
- `/assistant` — AI quantum expert chat (GPT-4o powered, SSE streaming)
- `/documentation` — Static documentation hub (getting started, API reference, algorithms, SDKs)
- `/education` — Course catalog with difficulty filtering
- `/hackathon` — Hackathon listings with status/difficulty filters
- `/use-cases` — Guided quantum use case wizards (finance, chemistry, optimization)
- `/labs` — Interactive learning labs with difficulty filters and attempt tracking
- `/workspaces` — Ephemeral development workspaces (Qiskit, PennyLane, Cirq)
- `/templates` — Domain-specific quantum templates with classical baselines
- `/gallery` — Public experiment gallery with likes and forks
- `/code-submit` — Multi-framework code submission (Qiskit, PennyLane, Cirq, OpenQASM)
- `/courses` — Course management with browse/enroll/teach tabs
- `/analytics` — Platform analytics with Recharts visualizations
- `/network-lab` — Quantum network protocol simulator (Teleportation, QKD, Entanglement Swapping)
- `/snapshots` — Experiment snapshot management for reproducibility

**Sidebar Navigation Groups:**
- Platform: Dashboard, Circuit Composer, My Circuits, Jobs, Backends, Results
- Tools & Learning: AI Assistant, Documentation, Education, Hackathons, Use Cases, Labs, Workspaces, Templates, Gallery, Code Submit, Courses, Analytics, Network Lab, Snapshots
- Account: Settings, Support

### Backend
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript, run via `tsx` in development
- **API Pattern**: REST API under `/api/` prefix
- **Session Management**: express-session with MemoryStore (development) — connect-pg-simple is available for production
- **Authentication**: Custom implementation using scrypt password hashing with session-based auth
- **AI Assistant**: OpenAI GPT-4o via Replit AI Integrations, SSE streaming responses
- **Quantum Simulation**: Jobs are simulated server-side with randomized measurement results and artificial delays
- **Credit System**: 660 seconds (11 minutes) initial balance, jobs cost shots * 0.001 credits
- **API Key Management**: SHA-256 hashed keys with 24-hour generation cooldown

### Database
- **Database**: PostgreSQL (required, via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Push**: `npm run db:push` uses drizzle-kit to push schema changes directly

**Key Tables:**
- `users` — User accounts with roles (admin, researcher, enterprise_user, student), credit_balance, experienceLevel field
- `organizations` — Multi-tenant organization support with plan tiers (free, academic, enterprise)
- `circuits` — Quantum circuit definitions with QASM and JSON circuit data, versioning, visibility controls
- `quantum_backends` — 24 backends from 11 providers (ibm, aws, aqt, iqm, pasqal, quera, rigetti, quantinuum, nec, local_simulator, pennylane)
- `jobs` — Job queue with status tracking, credit deduction, backendMode, compilationProfile, mitigationProfile, reliabilityScore, isTrustedRun, manifestHash, routerRationale
- `job_results` — Measurement results and metadata for completed jobs
- `api_keys` — User API keys with SHA-256 hashing, prefix display, 24hr cooldown
- `support_tickets` — Support tickets with status/priority/category tracking
- `support_messages` — Message threads within support tickets
- `assistant_threads` — AI assistant conversation threads
- `assistant_messages` — Messages within assistant threads (user and assistant roles)
- `use_case_journeys` — Guided use case wizard definitions (finance, chemistry, optimization)
- `learning_labs` — Interactive quantum computing labs with objectives and hints
- `lab_attempts` — User attempts at learning labs with scoring
- `workspaces` — Ephemeral development environments for different frameworks
- `experiment_snapshots` — Reproducible experiment records from jobs
- `domain_templates` — Pre-built quantum circuit templates by domain
- `classical_baselines` — Classical algorithm baselines for comparison
- `courses` — Course catalog with instructor support
- `course_lessons` — Individual lessons within courses
- `course_enrollments` — Student enrollments with progress tracking
- `public_experiments` — Gallery of shared experiments with likes/forks
- `org_usage_events` — Organization usage tracking
- `analytics_snapshots` — Platform analytics data points
- `optimization_trajectories` — Optimization algorithm trajectory tracking
- `job_diagnostics` — Detailed job diagnostic information
- `network_nodes` — Quantum network topology nodes
- `network_channels` — Quantum network channels between nodes
- `network_experiments` — Quantum network protocol simulations
- `quantum_tokens` — Token management system

All primary keys use UUID generation via `gen_random_uuid()`.

### API Routes
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- **Profile**: `PATCH /api/profile`, `POST /api/profile/change-password`
- **Circuits**: CRUD at `/api/circuits`
- **Backends**: `GET /api/backends`, `GET /api/backends/:id`
- **Jobs**: CRUD at `/api/jobs` (POST requires credit balance)
- **Results**: `GET /api/results/:jobId`
- **Dashboard**: `GET /api/dashboard/stats`, `/api/dashboard/recent-jobs`, `/api/dashboard/recent-circuits`
- **API Keys**: `GET /api/keys`, `POST /api/keys` (24hr cooldown), `DELETE /api/keys/:id`
- **Credits**: `GET /api/credits`, `POST /api/credits/purchase`
- **Support**: CRUD at `/api/support/tickets`, `POST /api/support/tickets/:id/messages`
- **Assistant**: `GET/POST /api/assistant/threads`, `GET/POST /api/assistant/threads/:id/messages` (SSE streaming)

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production Build**: Two-step — Vite builds the client to `dist/public/`, esbuild bundles the server to `dist/index.cjs`
- **Server bundling**: Select dependencies are bundled (allowlisted) to reduce cold start syscalls; others are kept external

### Circuit Composer Features
- **Gate Palette**: 20 gates across 5 categories (Single Qubit: H, X, Y, Z, S, T, SX, SDG, TDG; Rotation: RX, RY, RZ; Multi-Qubit: CNOT, CZ, SWAP, CCX; Controlled Rotations: CRX, CRY, CRZ; Measurement: M)
- **Bloch Sphere**: Canvas-based 3D visualization of qubit state
- **Multi-Language Export**: OpenQASM, Python/Qiskit, Cirq, C++ (Staq), Java (Strange)
- **Circuit Grid**: Interactive visual editor with qubit wires and gate placement

## External Dependencies

### Required Services
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **OpenAI API**: For AI assistant (via Replit AI Integrations, uses `AI_INTEGRATIONS_OPENAI_API_KEY`)

### Key NPM Dependencies
- **drizzle-orm** + **drizzle-kit**: Database ORM and migration tooling
- **express**: HTTP server framework (v5)
- **openai**: OpenAI client for AI assistant
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
