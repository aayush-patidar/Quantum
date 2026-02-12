import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", ["admin", "researcher", "enterprise_user", "student"]);
export const orgPlanEnum = pgEnum("org_plan", ["free", "academic", "enterprise"]);
export const visibilityEnum = pgEnum("visibility", ["private", "team", "public"]);
export const providerEnum = pgEnum("provider", ["ibm", "local_simulator", "pennylane", "aqt", "aws", "nec", "iqm", "pasqal", "quera", "rigetti", "quantinuum"]);
export const backendTypeEnum = pgEnum("backend_type", ["simulator", "real_device"]);
export const backendStatusEnum = pgEnum("backend_status", ["online", "offline", "maintenance"]);
export const jobStatusEnum = pgEnum("job_status", ["queued", "running", "completed", "failed", "cancelled"]);
export const algorithmTypeEnum = pgEnum("algorithm_type", ["raw_circuit", "vqe", "qaoa", "qml"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "critical"]);

export const experienceLevelEnum = pgEnum("experience_level", ["beginner", "intermediate", "expert"]);
export const workspaceStatusEnum = pgEnum("workspace_status", ["creating", "running", "stopped", "expired", "error"]);
export const templateDomainEnum = pgEnum("template_domain", ["finance", "chemistry", "optimization", "security", "smart_grid", "business_analytics"]);
export const labDifficultyEnum = pgEnum("lab_difficulty", ["beginner", "intermediate", "advanced"]);
export const compilationProfileEnum = pgEnum("compilation_profile", ["fast", "balanced", "high_fidelity"]);
export const mitigationProfileEnum = pgEnum("mitigation_profile", ["none", "fast", "balanced", "high_fidelity"]);
export const backendModeEnum = pgEnum("backend_mode", ["explicit", "auto"]);
export const courseRoleEnum = pgEnum("course_role", ["instructor", "student"]);
export const networkProtocolEnum = pgEnum("network_protocol", ["teleportation", "qkd", "entanglement_swapping"]);

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: orgPlanEnum("plan").notNull().default("free"),
  allowedBackends: text("allowed_backends").array(),
  allowedAlgorithms: text("allowed_algorithms").array(),
  maxJobsPerDay: integer("max_jobs_per_day").default(100),
  maxConcurrentJobs: integer("max_concurrent_jobs").default(5),
  maxCredits: real("max_credits").default(10000),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("researcher"),
  organizationId: varchar("organization_id").references(() => organizations.id),
  displayName: text("display_name"),
  company: text("company"),
  phone: text("phone"),
  bio: text("bio"),
  creditBalance: real("credit_balance").notNull().default(660),
  experienceLevel: experienceLevelEnum("experience_level").notNull().default("beginner"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const circuits = pgTable("circuits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  userId: varchar("user_id").notNull().references(() => users.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  qasm: text("qasm"),
  circuitData: jsonb("circuit_data"),
  tags: text("tags").array(),
  visibility: visibilityEnum("visibility").notNull().default("private"),
  version: integer("version").notNull().default(1),
  parentId: varchar("parent_id"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const quantumBackends = pgTable("quantum_backends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  provider: providerEnum("provider").notNull(),
  backendType: backendTypeEnum("backend_type").notNull(),
  qubitCount: integer("qubit_count").notNull(),
  status: backendStatusEnum("status").notNull().default("online"),
  properties: jsonb("properties"),
  queueDepth: integer("queue_depth").notNull().default(0),
});

export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  circuitId: varchar("circuit_id").notNull().references(() => circuits.id),
  backendId: varchar("backend_id").notNull().references(() => quantumBackends.id),
  status: jobStatusEnum("status").notNull().default("queued"),
  algorithmType: algorithmTypeEnum("algorithm_type").notNull().default("raw_circuit"),
  shots: integer("shots").notNull(),
  parameters: jsonb("parameters"),
  priority: integer("priority").notNull().default(0),
  providerJobId: text("provider_job_id"),
  creditsUsed: real("credits_used").default(0),
  backendMode: backendModeEnum("backend_mode").notNull().default("explicit"),
  compilationProfile: compilationProfileEnum("compilation_profile").notNull().default("balanced"),
  mitigationProfile: mitigationProfileEnum("mitigation_profile").notNull().default("none"),
  reliabilityScore: integer("reliability_score"),
  reliabilityLabel: text("reliability_label"),
  isTrustedRun: boolean("is_trusted_run").notNull().default(false),
  manifestHash: text("manifest_hash"),
  routerRationale: text("router_rationale"),
  classicalBaselineId: varchar("classical_baseline_id"),
  submittedAt: timestamp("submitted_at").notNull().default(sql`now()`),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
});

export const jobResults = pgTable("job_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  measurements: jsonb("measurements").notNull(),
  expectationValues: jsonb("expectation_values"),
  convergenceData: jsonb("convergence_data"),
  executionTime: real("execution_time").notNull(),
  metadata: jsonb("metadata"),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  keyHash: text("key_hash").notNull(),
  keyPrefix: text("key_prefix").notNull(),
  label: text("label").notNull().default("Default"),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  revokedAt: timestamp("revoked_at"),
});

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  priority: ticketPriorityEnum("priority").notNull().default("medium"),
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const supportMessages = pgTable("support_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id),
  userId: varchar("user_id"),
  isStaff: boolean("is_staff").notNull().default(false),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const assistantThreads = pgTable("assistant_threads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const assistantMessages = pgTable("assistant_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  threadId: varchar("thread_id").notNull().references(() => assistantThreads.id),
  role: text("role").notNull(),
  content: text("content").notNull(),
  circuitIds: text("circuit_ids").array(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const useCaseJourneys = pgTable("use_case_journeys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  algorithmType: algorithmTypeEnum("algorithm_type").notNull(),
  domain: templateDomainEnum("domain").notNull(),
  defaultParams: jsonb("default_params"),
  steps: jsonb("steps"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const learningLabs = pgTable("learning_labs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  difficulty: labDifficultyEnum("difficulty").notNull(),
  category: text("category"),
  objectives: text("objectives").array(),
  initialCircuit: jsonb("initial_circuit"),
  expectedResults: jsonb("expected_results"),
  hints: text("hints").array(),
  estimatedMinutes: integer("estimated_minutes"),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const labAttempts = pgTable("lab_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  labId: varchar("lab_id").notNull().references(() => learningLabs.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  circuitData: jsonb("circuit_data"),
  results: jsonb("results"),
  passed: boolean("passed"),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  framework: text("framework"),
  status: workspaceStatusEnum("status").notNull().default("creating"),
  config: jsonb("config"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const experimentSnapshots = pgTable("experiment_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  circuitId: varchar("circuit_id").notNull().references(() => circuits.id),
  backendId: varchar("backend_id").notNull().references(() => quantumBackends.id),
  code: text("code"),
  framework: text("framework"),
  algorithmConfig: jsonb("algorithm_config"),
  sdkVersions: jsonb("sdk_versions"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const domainTemplates = pgTable("domain_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  domain: templateDomainEnum("domain").notNull(),
  algorithmType: algorithmTypeEnum("algorithm_type").notNull(),
  circuitTemplate: jsonb("circuit_template"),
  defaultParams: jsonb("default_params"),
  inputSchema: jsonb("input_schema"),
  tags: text("tags").array(),
  difficulty: text("difficulty"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const classicalBaselines = pgTable("classical_baselines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  templateId: varchar("template_id").references(() => domainTemplates.id),
  algorithm: text("algorithm"),
  result: jsonb("result"),
  accuracy: real("accuracy"),
  executionTime: real("execution_time"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  instructorId: varchar("instructor_id").notNull().references(() => users.id),
  difficulty: labDifficultyEnum("difficulty").notNull(),
  category: text("category"),
  tags: text("tags").array(),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const courseLessons = pgTable("course_lessons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  title: text("title").notNull(),
  content: text("content"),
  sortOrder: integer("sort_order"),
  labId: varchar("lab_id").references(() => learningLabs.id),
  circuitId: varchar("circuit_id").references(() => circuits.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const courseEnrollments = pgTable("course_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: courseRoleEnum("role").notNull().default("student"),
  progress: integer("progress").notNull().default(0),
  completedLessons: text("completed_lessons").array(),
  enrolledAt: timestamp("enrolled_at").notNull().default(sql`now()`),
});

export const publicExperiments = pgTable("public_experiments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  circuitId: varchar("circuit_id").references(() => circuits.id),
  jobId: varchar("job_id").references(() => jobs.id),
  snapshotId: varchar("snapshot_id").references(() => experimentSnapshots.id),
  title: text("title").notNull(),
  description: text("description"),
  tags: text("tags").array(),
  likes: integer("likes").notNull().default(0),
  forks: integer("forks").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const orgUsageEvents = pgTable("org_usage_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").notNull().references(() => organizations.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(),
  amount: real("amount").notNull().default(0),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const analyticsSnapshots = pgTable("analytics_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id),
  period: text("period").notNull(),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const optimizationTrajectories = pgTable("optimization_trajectories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  iteration: integer("iteration").notNull(),
  parameters: jsonb("parameters"),
  costValue: real("cost_value").notNull(),
  gradientNorm: real("gradient_norm").notNull(),
  metadata: jsonb("metadata"),
});

export const jobDiagnostics = pgTable("job_diagnostics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => jobs.id),
  category: text("category").notNull(),
  cause: text("cause"),
  suggestions: text("suggestions").array(),
  circuitProperties: jsonb("circuit_properties"),
  backendMetadata: jsonb("backend_metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const networkNodes = pgTable("network_nodes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentId: varchar("experiment_id"),
  name: text("name").notNull(),
  nodeType: text("node_type"),
  properties: jsonb("properties"),
});

export const networkChannels = pgTable("network_channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentId: varchar("experiment_id"),
  sourceNodeId: varchar("source_node_id").notNull().references(() => networkNodes.id),
  targetNodeId: varchar("target_node_id").notNull().references(() => networkNodes.id),
  protocol: networkProtocolEnum("protocol").notNull(),
  properties: jsonb("properties"),
});

export const networkExperiments = pgTable("network_experiments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  protocol: networkProtocolEnum("protocol").notNull(),
  topology: jsonb("topology"),
  results: jsonb("results"),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const quantumTokens = pgTable("quantum_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tokenType: text("token_type").notNull(),
  payload: jsonb("payload"),
  issuedAt: timestamp("issued_at").notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
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
