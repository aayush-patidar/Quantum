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

export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: orgPlanEnum("plan").notNull().default("free"),
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
