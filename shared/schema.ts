import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums (simulated in SQLite as text check constraints or application logic)
export const userRoleEnum = z.enum(["admin", "researcher", "enterprise_user", "student"]);
export const orgPlanEnum = z.enum(["free", "academic", "enterprise"]);
export const visibilityEnum = z.enum(["private", "team", "public"]);
export const providerEnum = z.enum(["ibm", "local_simulator", "pennylane", "aqt", "aws", "nec", "iqm", "pasqal", "quera", "rigetti", "quantinuum"]);
export const backendTypeEnum = z.enum(["simulator", "real_device"]);
export const backendStatusEnum = z.enum(["online", "offline", "maintenance"]);
export const jobStatusEnum = z.enum(["queued", "running", "completed", "failed", "cancelled"]);
export const algorithmTypeEnum = z.enum(["raw_circuit", "vqe", "qaoa", "qml"]);
export const ticketStatusEnum = z.enum(["open", "in_progress", "resolved", "closed"]);
export const ticketPriorityEnum = z.enum(["low", "medium", "high", "critical"]);
export const experienceLevelEnum = z.enum(["beginner", "intermediate", "expert"]);
export const workspaceStatusEnum = z.enum(["creating", "running", "stopped", "expired", "error"]);
export const templateDomainEnum = z.enum(["finance", "chemistry", "optimization", "security", "smart_grid", "business_analytics"]);
export const labDifficultyEnum = z.enum(["beginner", "intermediate", "advanced"]);
export const compilationProfileEnum = z.enum(["fast", "balanced", "high_fidelity"]);
export const mitigationProfileEnum = z.enum(["none", "fast", "balanced", "high_fidelity"]);
export const backendModeEnum = z.enum(["explicit", "auto"]);
export const courseRoleEnum = z.enum(["instructor", "student"]);
export const networkProtocolEnum = z.enum(["teleportation", "qkd", "entanglement_swapping"]);

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"), // orgPlanEnum
  allowedBackends: text("allowed_backends", { mode: "json" }), // array
  allowedAlgorithms: text("allowed_algorithms", { mode: "json" }), // array
  maxJobsPerDay: integer("max_jobs_per_day").default(100),
  maxConcurrentJobs: integer("max_concurrent_jobs").default(5),
  maxCredits: real("max_credits").default(10000),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("researcher"), // userRoleEnum
  organizationId: text("organization_id").references(() => organizations.id),
  displayName: text("display_name"),
  company: text("company"),
  phone: text("phone"),
  bio: text("bio"),
  creditBalance: real("credit_balance").notNull().default(660),
  experienceLevel: text("experience_level").notNull().default("beginner"), // experienceLevelEnum
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const circuits = sqliteTable("circuits", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  userId: text("user_id").notNull().references(() => users.id),
  organizationId: text("organization_id").references(() => organizations.id),
  qasm: text("qasm"),
  circuitData: text("circuit_data", { mode: "json" }),
  tags: text("tags", { mode: "json" }), // array
  visibility: text("visibility").notNull().default("private"), // visibilityEnum
  version: integer("version").notNull().default(1),
  parentId: text("parent_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quantumBackends = sqliteTable("quantum_backends", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  provider: text("provider").notNull(), // providerEnum
  backendType: text("backend_type").notNull(), // backendTypeEnum
  qubitCount: integer("qubit_count").notNull(),
  status: text("status").notNull().default("online"), // backendStatusEnum
  properties: text("properties", { mode: "json" }),
  queueDepth: integer("queue_depth").notNull().default(0),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  circuitId: text("circuit_id").notNull().references(() => circuits.id),
  backendId: text("backend_id").notNull().references(() => quantumBackends.id),
  status: text("status").notNull().default("queued"), // jobStatusEnum
  algorithmType: text("algorithm_type").notNull().default("raw_circuit"), // algorithmTypeEnum
  shots: integer("shots").notNull(),
  parameters: text("parameters", { mode: "json" }),
  priority: integer("priority").notNull().default(0),
  providerJobId: text("provider_job_id"),
  creditsUsed: real("credits_used").default(0),
  backendMode: text("backend_mode").notNull().default("explicit"), // backendModeEnum
  compilationProfile: text("compilation_profile").notNull().default("balanced"), // compilationProfileEnum
  mitigationProfile: text("mitigation_profile").notNull().default("none"), // mitigationProfileEnum
  reliabilityScore: integer("reliability_score"),
  reliabilityLabel: text("reliability_label"),
  isTrustedRun: integer("is_trusted_run", { mode: "boolean" }).notNull().default(false),
  manifestHash: text("manifest_hash"),
  routerRationale: text("router_rationale"),
  classicalBaselineId: text("classical_baseline_id"),
  submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  errorMessage: text("error_message"),
});

export const jobResults = sqliteTable("job_results", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id),
  measurements: text("measurements", { mode: "json" }).notNull(),
  expectationValues: text("expectation_values", { mode: "json" }),
  convergenceData: text("convergence_data", { mode: "json" }),
  executionTime: real("execution_time").notNull(),
  metadata: text("metadata", { mode: "json" }),
});

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  label: text("label").notNull().default("Default"),
  lastUsedAt: text("last_used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  revokedAt: text("revoked_at"),
});

export const supportTickets = sqliteTable("support_tickets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("open"), // ticketStatusEnum
  priority: text("priority").notNull().default("medium"), // ticketPriorityEnum
  category: text("category").notNull().default("general"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supportMessages = sqliteTable("support_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  ticketId: text("ticket_id").notNull().references(() => supportTickets.id),
  userId: text("user_id"),
  isStaff: integer("is_staff", { mode: "boolean" }).notNull().default(false),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const assistantThreads = sqliteTable("assistant_threads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull().default("New Conversation"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const assistantMessages = sqliteTable("assistant_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  threadId: text("thread_id").notNull().references(() => assistantThreads.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  circuitIds: text("circuit_ids", { mode: "json" }), // array
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const useCaseJourneys = sqliteTable("use_case_journeys", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  algorithmType: text("algorithm_type").notNull(), // algorithmTypeEnum
  domain: text("domain").notNull(), // templateDomainEnum
  defaultParams: text("default_params", { mode: "json" }),
  steps: text("steps", { mode: "json" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const learningLabs = sqliteTable("learning_labs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  difficulty: text("difficulty").notNull(), // labDifficultyEnum
  category: text("category"),
  objectives: text("objectives", { mode: "json" }), // array
  initialCircuit: text("initial_circuit", { mode: "json" }),
  expectedResults: text("expected_results", { mode: "json" }),
  hints: text("hints", { mode: "json" }), // array
  estimatedMinutes: integer("estimated_minutes"),
  sortOrder: integer("sort_order"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const labAttempts = sqliteTable("lab_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  labId: text("lab_id").notNull().references(() => learningLabs.id),
  userId: text("user_id").notNull().references(() => users.id),
  circuitData: text("circuit_data", { mode: "json" }),
  results: text("results", { mode: "json" }),
  passed: integer("passed", { mode: "boolean" }),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  framework: text("framework"),
  status: text("status").notNull().default("creating"), // workspaceStatusEnum
  config: text("config", { mode: "json" }),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const experimentSnapshots = sqliteTable("experiment_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  jobId: text("job_id").notNull().references(() => jobs.id),
  circuitId: text("circuit_id").notNull().references(() => circuits.id),
  backendId: text("backend_id").notNull().references(() => quantumBackends.id),
  code: text("code"),
  framework: text("framework"),
  algorithmConfig: text("algorithm_config", { mode: "json" }),
  sdkVersions: text("sdk_versions", { mode: "json" }),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const domainTemplates = sqliteTable("domain_templates", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  domain: text("domain").notNull(), // templateDomainEnum
  algorithmType: text("algorithm_type").notNull(), // algorithmTypeEnum
  circuitTemplate: text("circuit_template", { mode: "json" }),
  defaultParams: text("default_params", { mode: "json" }),
  inputSchema: text("input_schema", { mode: "json" }),
  tags: text("tags", { mode: "json" }), // array
  difficulty: text("difficulty"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const classicalBaselines = sqliteTable("classical_baselines", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id),
  templateId: text("template_id").references(() => domainTemplates.id),
  algorithm: text("algorithm"),
  result: text("result", { mode: "json" }),
  accuracy: real("accuracy"),
  executionTime: real("execution_time"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const courses = sqliteTable("courses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description"),
  instructorId: text("instructor_id").notNull().references(() => users.id),
  difficulty: text("difficulty").notNull(), // labDifficultyEnum
  category: text("category"),
  tags: text("tags", { mode: "json" }), // array
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const courseLessons = sqliteTable("course_lessons", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  content: text("content"),
  sortOrder: integer("sort_order"),
  labId: text("lab_id").references(() => learningLabs.id),
  circuitId: text("circuit_id").references(() => circuits.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const courseEnrollments = sqliteTable("course_enrollments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId: text("course_id").notNull().references(() => courses.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: text("role").notNull().default("student"), // courseRoleEnum
  progress: integer("progress").notNull().default(0),
  completedLessons: text("completed_lessons", { mode: "json" }), // array
  enrolledAt: text("enrolled_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const publicExperiments = sqliteTable("public_experiments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  circuitId: text("circuit_id").references(() => circuits.id),
  jobId: text("job_id").references(() => jobs.id),
  snapshotId: text("snapshot_id").references(() => experimentSnapshots.id),
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags", { mode: "json" }), // array
  likes: integer("likes").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orgUsageEvents = sqliteTable("org_usage_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(),
  amount: real("amount").notNull().default(0),
  metadata: text("metadata", { mode: "json" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const analyticsSnapshots = sqliteTable("analytics_snapshots", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organization_id").references(() => organizations.id),
  period: text("period").notNull(),
  metrics: text("metrics", { mode: "json" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const optimizationTrajectories = sqliteTable("optimization_trajectories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id),
  iteration: integer("iteration").notNull(),
  parameters: text("parameters", { mode: "json" }),
  costValue: real("cost_value").notNull(),
  gradientNorm: real("gradient_norm").notNull(),
  metadata: text("metadata", { mode: "json" }),
});

export const jobDiagnostics = sqliteTable("job_diagnostics", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  jobId: text("job_id").notNull().references(() => jobs.id),
  category: text("category").notNull(),
  cause: text("cause"),
  suggestions: text("suggestions", { mode: "json" }), // array
  circuitProperties: text("circuit_properties", { mode: "json" }),
  backendMetadata: text("backend_metadata", { mode: "json" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const networkNodes = sqliteTable("network_nodes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  experimentId: text("experiment_id"),
  name: text("name").notNull(),
  nodeType: text("node_type"),
  properties: text("properties", { mode: "json" }),
});

export const networkChannels = sqliteTable("network_channels", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  experimentId: text("experiment_id"),
  sourceNodeId: text("source_node_id").notNull().references(() => networkNodes.id),
  targetNodeId: text("target_node_id").notNull().references(() => networkNodes.id),
  protocol: text("protocol").notNull(), // networkProtocolEnum
  properties: text("properties", { mode: "json" }),
});

export const networkExperiments = sqliteTable("network_experiments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  protocol: text("protocol").notNull(), // networkProtocolEnum
  topology: text("topology", { mode: "json" }),
  results: text("results", { mode: "json" }),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const quantumTokens = sqliteTable("quantum_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  tokenType: text("token_type").notNull(),
  payload: text("payload", { mode: "json" }),
  issuedAt: text("issued_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  expiresAt: text("expires_at"),
  revokedAt: text("revoked_at"),
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCircuitSchema = createInsertSchema(circuits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBackendSchema = createInsertSchema(quantumBackends).omit({
  id: true,
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  submittedAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertJobResultSchema = createInsertSchema(jobResults).omit({
  id: true,
  metadata: true, // metadata can be null
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
  revokedAt: true,
});

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportMessageSchema = createInsertSchema(supportMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAssistantThreadSchema = createInsertSchema(assistantThreads).omit({
  id: true,
  createdAt: true,
});

export const insertAssistantMessageSchema = createInsertSchema(assistantMessages).omit({
  id: true,
  createdAt: true,
});

export const insertUseCaseJourneySchema = createInsertSchema(useCaseJourneys).omit({
  id: true,
  createdAt: true,
});

export const insertLearningLabSchema = createInsertSchema(learningLabs).omit({
  id: true,
  createdAt: true,
});

export const insertLabAttemptSchema = createInsertSchema(labAttempts).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
});

export const insertExperimentSnapshotSchema = createInsertSchema(experimentSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertDomainTemplateSchema = createInsertSchema(domainTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertClassicalBaselineSchema = createInsertSchema(classicalBaselines).omit({
  id: true,
  createdAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseLessonSchema = createInsertSchema(courseLessons).omit({
  id: true,
  createdAt: true,
});

export const insertCourseEnrollmentSchema = createInsertSchema(courseEnrollments).omit({
  id: true,
  enrolledAt: true,
});

export const insertPublicExperimentSchema = createInsertSchema(publicExperiments).omit({
  id: true,
  createdAt: true,
});

export const insertOrgUsageEventSchema = createInsertSchema(orgUsageEvents).omit({
  id: true,
  createdAt: true,
});

export const insertAnalyticsSnapshotSchema = createInsertSchema(analyticsSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertOptimizationTrajectorySchema = createInsertSchema(optimizationTrajectories).omit({
  id: true,
});

export const insertJobDiagnosticSchema = createInsertSchema(jobDiagnostics).omit({
  id: true,
  createdAt: true,
});

export const insertNetworkNodeSchema = createInsertSchema(networkNodes).omit({
  id: true,
});

export const insertNetworkChannelSchema = createInsertSchema(networkChannels).omit({
  id: true,
});

export const insertNetworkExperimentSchema = createInsertSchema(networkExperiments).omit({
  id: true,
  createdAt: true,
});

export const insertQuantumTokenSchema = createInsertSchema(quantumTokens).omit({
  id: true,
  issuedAt: true,
  expiresAt: true,
  revokedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertCircuit = z.infer<typeof insertCircuitSchema>;
export type Circuit = typeof circuits.$inferSelect;

export type InsertBackend = z.infer<typeof insertBackendSchema>;
export type Backend = typeof quantumBackends.$inferSelect;

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

export type InsertJobResult = z.infer<typeof insertJobResultSchema>;
export type JobResult = typeof jobResults.$inferSelect;

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

export type InsertSupportMessage = z.infer<typeof insertSupportMessageSchema>;
export type SupportMessage = typeof supportMessages.$inferSelect;

export type InsertAssistantThread = z.infer<typeof insertAssistantThreadSchema>;
export type AssistantThread = typeof assistantThreads.$inferSelect;

export type InsertAssistantMessage = z.infer<typeof insertAssistantMessageSchema>;
export type AssistantMessage = typeof assistantMessages.$inferSelect;

export type InsertUseCaseJourney = z.infer<typeof insertUseCaseJourneySchema>;
export type UseCaseJourney = typeof useCaseJourneys.$inferSelect;

export type InsertLearningLab = z.infer<typeof insertLearningLabSchema>;
export type LearningLab = typeof learningLabs.$inferSelect;

export type InsertLabAttempt = z.infer<typeof insertLabAttemptSchema>;
export type LabAttempt = typeof labAttempts.$inferSelect;

export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;

export type InsertExperimentSnapshot = z.infer<typeof insertExperimentSnapshotSchema>;
export type ExperimentSnapshot = typeof experimentSnapshots.$inferSelect;

export type InsertDomainTemplate = z.infer<typeof insertDomainTemplateSchema>;
export type DomainTemplate = typeof domainTemplates.$inferSelect;

export type InsertClassicalBaseline = z.infer<typeof insertClassicalBaselineSchema>;
export type ClassicalBaseline = typeof classicalBaselines.$inferSelect;

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

export type InsertCourseLesson = z.infer<typeof insertCourseLessonSchema>;
export type CourseLesson = typeof courseLessons.$inferSelect;

export type InsertCourseEnrollment = z.infer<typeof insertCourseEnrollmentSchema>;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;

export type InsertPublicExperiment = z.infer<typeof insertPublicExperimentSchema>;
export type PublicExperiment = typeof publicExperiments.$inferSelect;

export type InsertOrgUsageEvent = z.infer<typeof insertOrgUsageEventSchema>;
export type OrgUsageEvent = typeof orgUsageEvents.$inferSelect;

export type InsertAnalyticsSnapshot = z.infer<typeof insertAnalyticsSnapshotSchema>;
export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;

export type InsertOptimizationTrajectory = z.infer<typeof insertOptimizationTrajectorySchema>;
export type OptimizationTrajectory = typeof optimizationTrajectories.$inferSelect;

export type InsertJobDiagnostic = z.infer<typeof insertJobDiagnosticSchema>;
export type JobDiagnostic = typeof jobDiagnostics.$inferSelect;

export type InsertNetworkNode = z.infer<typeof insertNetworkNodeSchema>;
export type NetworkNode = typeof networkNodes.$inferSelect;

export type InsertNetworkChannel = z.infer<typeof insertNetworkChannelSchema>;
export type NetworkChannel = typeof networkChannels.$inferSelect;

export type InsertNetworkExperiment = z.infer<typeof insertNetworkExperimentSchema>;
export type NetworkExperiment = typeof networkExperiments.$inferSelect;

export type InsertQuantumToken = z.infer<typeof insertQuantumTokenSchema>;
export type QuantumToken = typeof quantumTokens.$inferSelect;
