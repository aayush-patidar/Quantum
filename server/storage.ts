import { eq, desc, sql, count, and, isNull, gt, getTableColumns } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  type User, type InsertUser,
  type Organization, type InsertOrganization,
  type Circuit, type InsertCircuit,
  type Backend, type InsertBackend,
  type Job, type InsertJob,
  type JobResult, type InsertJobResult,
  type ApiKey, type InsertApiKey,
  type SupportTicket, type InsertSupportTicket,
  type SupportMessage, type InsertSupportMessage,
  type AssistantThread, type InsertAssistantThread,
  type AssistantMessage, type InsertAssistantMessage,
  type UseCaseJourney, type InsertUseCaseJourney,
  type LearningLab, type InsertLearningLab,
  type LabAttempt, type InsertLabAttempt,
  type Workspace, type InsertWorkspace,
  type ExperimentSnapshot, type InsertExperimentSnapshot,
  type DomainTemplate, type InsertDomainTemplate,
  type ClassicalBaseline, type InsertClassicalBaseline,
  type Course, type InsertCourse,
  type CourseLesson, type InsertCourseLesson,
  type CourseEnrollment, type InsertCourseEnrollment,
  type PublicExperiment, type InsertPublicExperiment,
  type OrgUsageEvent, type InsertOrgUsageEvent,
  type AnalyticsSnapshot, type InsertAnalyticsSnapshot,
  type OptimizationTrajectory, type InsertOptimizationTrajectory,
  type JobDiagnostic, type InsertJobDiagnostic,
  type NetworkExperiment, type InsertNetworkExperiment,
  type NetworkNode, type InsertNetworkNode,
  type NetworkChannel, type InsertNetworkChannel,
  type QuantumToken, type InsertQuantumToken,
  users, organizations, circuits, quantumBackends, jobs, jobResults,
  apiKeys, supportTickets, supportMessages, assistantThreads, assistantMessages,
  useCaseJourneys, learningLabs, labAttempts, workspaces, experimentSnapshots,
  domainTemplates, classicalBaselines, courses, courseLessons, courseEnrollments,
  publicExperiments, orgUsageEvents, analyticsSnapshots, optimizationTrajectories,
  jobDiagnostics, networkExperiments, networkNodes, networkChannels, quantumTokens,
} from "@shared/schema";

const sqlite = new Database("quantum.db");
export const db = drizzle(sqlite);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  getOrganization(id: string): Promise<Organization | undefined>;
  createOrganization(org: InsertOrganization): Promise<Organization>;

  getCircuit(id: string): Promise<Circuit | undefined>;
  getCircuitsByUser(userId: string): Promise<Circuit[]>;
  createCircuit(circuit: InsertCircuit): Promise<Circuit>;
  updateCircuit(id: string, data: Partial<InsertCircuit>): Promise<Circuit | undefined>;
  deleteCircuit(id: string): Promise<void>;

  getBackend(id: string): Promise<Backend | undefined>;
  getAllBackends(): Promise<Backend[]>;
  createBackend(backend: InsertBackend): Promise<Backend>;

  getJob(id: string): Promise<Job | undefined>;
  getJobsByUser(userId: string): Promise<Job[]>;
  createJob(job: InsertJob): Promise<Job>;
  updateJobStatus(id: string, status: string, errorMessage?: string): Promise<Job | undefined>;
  getJobsByStatus(status: string): Promise<Job[]>;

  getJobResult(id: string): Promise<JobResult | undefined>;
  getJobResultByJobId(jobId: string): Promise<JobResult | undefined>;
  createJobResult(result: InsertJobResult): Promise<JobResult>;

  getJobStats(): Promise<Record<string, number>>;
  getRecentJobs(limit?: number): Promise<Job[]>;
  getRecentCircuits(limit?: number): Promise<Circuit[]>;

  getApiKeysByUser(userId: string): Promise<ApiKey[]>;
  createApiKey(key: InsertApiKey): Promise<ApiKey>;
  revokeApiKey(id: string): Promise<void>;
  getLatestApiKey(userId: string): Promise<ApiKey | undefined>;

  getSupportTicketsByUser(userId: string): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  getSupportMessages(ticketId: string): Promise<SupportMessage[]>;
  createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage>;

  getAssistantThreadsByUser(userId: string): Promise<AssistantThread[]>;
  getAssistantThread(id: string): Promise<AssistantThread | undefined>;
  createAssistantThread(thread: InsertAssistantThread): Promise<AssistantThread>;
  getAssistantMessages(threadId: string): Promise<AssistantMessage[]>;
  createAssistantMessage(message: InsertAssistantMessage): Promise<AssistantMessage>;

  updateCreditBalance(userId: string, delta: number): Promise<User | undefined>;
  getCreditBalance(userId: string): Promise<number>;

  getAllUseCaseJourneys(): Promise<UseCaseJourney[]>;
  getUseCaseJourney(id: string): Promise<UseCaseJourney | undefined>;
  createUseCaseJourney(data: InsertUseCaseJourney): Promise<UseCaseJourney>;

  getAllLearningLabs(): Promise<LearningLab[]>;
  getLearningLab(id: string): Promise<LearningLab | undefined>;
  createLearningLab(data: InsertLearningLab): Promise<LearningLab>;
  getLabAttemptsByUser(userId: string, labId: string): Promise<LabAttempt[]>;
  createLabAttempt(data: InsertLabAttempt): Promise<LabAttempt>;

  getWorkspacesByUser(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string): Promise<Workspace | undefined>;
  createWorkspace(data: InsertWorkspace): Promise<Workspace>;
  updateWorkspaceStatus(id: string, status: string): Promise<Workspace | undefined>;

  getSnapshotsByUser(userId: string): Promise<ExperimentSnapshot[]>;
  getSnapshot(id: string): Promise<ExperimentSnapshot | undefined>;
  createSnapshot(data: InsertExperimentSnapshot): Promise<ExperimentSnapshot>;

  getAllDomainTemplates(): Promise<DomainTemplate[]>;
  getDomainTemplate(id: string): Promise<DomainTemplate | undefined>;
  getDomainTemplatesByDomain(domain: string): Promise<DomainTemplate[]>;
  createDomainTemplate(data: InsertDomainTemplate): Promise<DomainTemplate>;

  getClassicalBaseline(jobId: string): Promise<ClassicalBaseline | undefined>;
  createClassicalBaseline(data: InsertClassicalBaseline): Promise<ClassicalBaseline>;

  getAllCourses(): Promise<Course[]>;
  getAllCoursesWithStats(): Promise<(Course & { lessonCount: number })[]>;
  getCourse(id: string): Promise<Course | undefined>;
  getCoursesByInstructor(userId: string): Promise<Course[]>;
  createCourse(data: InsertCourse): Promise<Course>;
  updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined>;

  getLessonsByCourse(courseId: string): Promise<CourseLesson[]>;
  createLesson(data: InsertCourseLesson): Promise<CourseLesson>;

  getEnrollmentsByUser(userId: string): Promise<CourseEnrollment[]>;
  getEnrollmentsByCourse(courseId: string): Promise<CourseEnrollment[]>;
  getEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined>;
  createEnrollment(data: InsertCourseEnrollment): Promise<CourseEnrollment>;
  getEnrolledCoursesWithStats(userId: string): Promise<(Course & { lessonCount: number })[]>;
  updateEnrollmentProgress(id: string, progress: number, completedLessons: string[]): Promise<CourseEnrollment | undefined>;

  getAllPublicExperiments(): Promise<PublicExperiment[]>;
  getPublicExperiment(id: string): Promise<PublicExperiment | undefined>;
  createPublicExperiment(data: InsertPublicExperiment): Promise<PublicExperiment>;
  incrementPublicExperimentLikes(id: string): Promise<void>;
  incrementPublicExperimentForks(id: string): Promise<void>;

  createOrgUsageEvent(data: InsertOrgUsageEvent): Promise<OrgUsageEvent>;
  getOrgUsageEvents(orgId: string): Promise<OrgUsageEvent[]>;

  createAnalyticsSnapshot(data: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot>;
  getAnalyticsSnapshots(orgId: string): Promise<AnalyticsSnapshot[]>;

  getTrajectories(jobId: string): Promise<OptimizationTrajectory[]>;
  createTrajectory(data: InsertOptimizationTrajectory): Promise<OptimizationTrajectory>;
  createTrajectories(data: InsertOptimizationTrajectory[]): Promise<void>;

  getJobDiagnostics(jobId: string): Promise<JobDiagnostic | undefined>;
  createJobDiagnostic(data: InsertJobDiagnostic): Promise<JobDiagnostic>;

  getNetworkExperimentsByUser(userId: string): Promise<NetworkExperiment[]>;
  getNetworkExperiment(id: string): Promise<NetworkExperiment | undefined>;
  createNetworkExperiment(data: InsertNetworkExperiment): Promise<NetworkExperiment>;
  updateNetworkExperiment(id: string, data: Partial<InsertNetworkExperiment>): Promise<NetworkExperiment | undefined>;
  getNetworkNodes(experimentId: string): Promise<NetworkNode[]>;
  createNetworkNode(data: InsertNetworkNode): Promise<NetworkNode>;
  getNetworkChannels(experimentId: string): Promise<NetworkChannel[]>;
  createNetworkChannel(data: InsertNetworkChannel): Promise<NetworkChannel>;

  getTokensByUser(userId: string): Promise<QuantumToken[]>;
  createToken(data: InsertQuantumToken): Promise<QuantumToken>;
  getToken(id: string): Promise<QuantumToken | undefined>;
  revokeToken(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async getCircuit(id: string): Promise<Circuit | undefined> {
    const [circuit] = await db.select().from(circuits).where(eq(circuits.id, id));
    return circuit;
  }

  async getCircuitsByUser(userId: string): Promise<Circuit[]> {
    return db.select().from(circuits).where(eq(circuits.userId, userId)).orderBy(desc(circuits.createdAt));
  }

  async createCircuit(circuit: InsertCircuit): Promise<Circuit> {
    const [created] = await db.insert(circuits).values(circuit).returning();
    return created;
  }

  async updateCircuit(id: string, data: Partial<InsertCircuit>): Promise<Circuit | undefined> {
    const [updated] = await db.update(circuits).set({ ...data, updatedAt: new Date() }).where(eq(circuits.id, id)).returning();
    return updated;
  }

  async deleteCircuit(id: string): Promise<void> {
    await db.delete(circuits).where(eq(circuits.id, id));
  }

  async getBackend(id: string): Promise<Backend | undefined> {
    const [backend] = await db.select().from(quantumBackends).where(eq(quantumBackends.id, id));
    return backend;
  }

  async getAllBackends(): Promise<Backend[]> {
    return db.select().from(quantumBackends);
  }

  async createBackend(backend: InsertBackend): Promise<Backend> {
    const [created] = await db.insert(quantumBackends).values(backend).returning();
    return created;
  }

  async getJob(id: string): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async getJobsByUser(userId: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.userId, userId)).orderBy(desc(jobs.submittedAt));
  }

  async createJob(job: InsertJob): Promise<Job> {
    const [created] = await db.insert(jobs).values(job).returning();
    return created;
  }

  async updateJobStatus(id: string, status: string, errorMessage?: string): Promise<Job | undefined> {
    const updateData: Record<string, any> = { status };
    if (status === "running") {
      updateData.startedAt = new Date();
    } else if (status === "completed" || status === "failed" || status === "cancelled") {
      updateData.completedAt = new Date();
    }
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    const [updated] = await db.update(jobs).set(updateData).where(eq(jobs.id, id)).returning();
    return updated;
  }

  async getJobsByStatus(status: string): Promise<Job[]> {
    return db.select().from(jobs).where(eq(jobs.status, status as any));
  }

  async getJobResult(id: string): Promise<JobResult | undefined> {
    const [result] = await db.select().from(jobResults).where(eq(jobResults.id, id));
    return result;
  }

  async getJobResultByJobId(jobId: string): Promise<JobResult | undefined> {
    const [result] = await db.select().from(jobResults).where(eq(jobResults.jobId, jobId));
    return result;
  }

  async createJobResult(result: InsertJobResult): Promise<JobResult> {
    const [created] = await db.insert(jobResults).values(result).returning();
    return created;
  }

  async getJobStats(): Promise<Record<string, number>> {
    const results = await db.select({
      status: jobs.status,
      count: count(),
    }).from(jobs).groupBy(jobs.status);

    const stats: Record<string, number> = {};
    for (const row of results) {
      stats[row.status] = row.count;
    }
    return stats;
  }

  async getRecentJobs(limit = 10): Promise<Job[]> {
    return db.select().from(jobs).orderBy(desc(jobs.submittedAt)).limit(limit);
  }

  async getRecentCircuits(limit = 10): Promise<Circuit[]> {
    return db.select().from(circuits).orderBy(desc(circuits.createdAt)).limit(limit);
  }

  async getApiKeysByUser(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt))).orderBy(desc(apiKeys.createdAt));
  }

  async createApiKey(key: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(key).returning();
    return created;
  }

  async revokeApiKey(id: string): Promise<void> {
    await db.update(apiKeys).set({ revokedAt: new Date() }).where(eq(apiKeys.id, id));
  }

  async getLatestApiKey(userId: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.userId, userId)).orderBy(desc(apiKeys.createdAt)).limit(1);
    return key;
  }

  async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket;
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async updateSupportTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets).set({ ...data, updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
    return updated;
  }

  async getSupportMessages(ticketId: string): Promise<SupportMessage[]> {
    return db.select().from(supportMessages).where(eq(supportMessages.ticketId, ticketId)).orderBy(supportMessages.createdAt);
  }

  async createSupportMessage(message: InsertSupportMessage): Promise<SupportMessage> {
    const [created] = await db.insert(supportMessages).values(message).returning();
    return created;
  }

  async getAssistantThreadsByUser(userId: string): Promise<AssistantThread[]> {
    return db.select().from(assistantThreads).where(eq(assistantThreads.userId, userId)).orderBy(desc(assistantThreads.createdAt));
  }

  async getAssistantThread(id: string): Promise<AssistantThread | undefined> {
    const [thread] = await db.select().from(assistantThreads).where(eq(assistantThreads.id, id));
    return thread;
  }

  async createAssistantThread(thread: InsertAssistantThread): Promise<AssistantThread> {
    const [created] = await db.insert(assistantThreads).values(thread).returning();
    return created;
  }

  async getAssistantMessages(threadId: string): Promise<AssistantMessage[]> {
    return db.select().from(assistantMessages).where(eq(assistantMessages.threadId, threadId)).orderBy(assistantMessages.createdAt);
  }

  async createAssistantMessage(message: InsertAssistantMessage): Promise<AssistantMessage> {
    const [created] = await db.insert(assistantMessages).values(message).returning();
    return created;
  }

  async updateCreditBalance(userId: string, delta: number): Promise<User | undefined> {
    const [updated] = await db.update(users).set({
      creditBalance: sql`${users.creditBalance} + ${delta}`,
    }).where(eq(users.id, userId)).returning();
    return updated;
  }

  async getCreditBalance(userId: string): Promise<number> {
    const [user] = await db.select({ creditBalance: users.creditBalance }).from(users).where(eq(users.id, userId));
    return user?.creditBalance ?? 0;
  }

  async getAllUseCaseJourneys(): Promise<UseCaseJourney[]> {
    return db.select().from(useCaseJourneys);
  }

  async getUseCaseJourney(id: string): Promise<UseCaseJourney | undefined> {
    const [journey] = await db.select().from(useCaseJourneys).where(eq(useCaseJourneys.id, id));
    return journey;
  }

  async createUseCaseJourney(data: InsertUseCaseJourney): Promise<UseCaseJourney> {
    const [created] = await db.insert(useCaseJourneys).values(data).returning();
    return created;
  }

  async getAllLearningLabs(): Promise<LearningLab[]> {
    return db.select().from(learningLabs).orderBy(learningLabs.sortOrder);
  }

  async getLearningLab(id: string): Promise<LearningLab | undefined> {
    const [lab] = await db.select().from(learningLabs).where(eq(learningLabs.id, id));
    return lab;
  }

  async createLearningLab(data: InsertLearningLab): Promise<LearningLab> {
    const [created] = await db.insert(learningLabs).values(data).returning();
    return created;
  }

  async getLabAttemptsByUser(userId: string, labId: string): Promise<LabAttempt[]> {
    return db.select().from(labAttempts).where(and(eq(labAttempts.userId, userId), eq(labAttempts.labId, labId)));
  }

  async createLabAttempt(data: InsertLabAttempt): Promise<LabAttempt> {
    const [created] = await db.insert(labAttempts).values(data).returning();
    return created;
  }

  async getWorkspacesByUser(userId: string): Promise<Workspace[]> {
    return db.select().from(workspaces).where(eq(workspaces.userId, userId)).orderBy(desc(workspaces.createdAt));
  }

  async getWorkspace(id: string): Promise<Workspace | undefined> {
    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return workspace;
  }

  async createWorkspace(data: InsertWorkspace): Promise<Workspace> {
    const [created] = await db.insert(workspaces).values(data).returning();
    return created;
  }

  async updateWorkspaceStatus(id: string, status: string): Promise<Workspace | undefined> {
    const [updated] = await db.update(workspaces).set({ status: status as any }).where(eq(workspaces.id, id)).returning();
    return updated;
  }

  async getSnapshotsByUser(userId: string): Promise<ExperimentSnapshot[]> {
    return db.select().from(experimentSnapshots).where(eq(experimentSnapshots.userId, userId));
  }

  async getSnapshot(id: string): Promise<ExperimentSnapshot | undefined> {
    const [snapshot] = await db.select().from(experimentSnapshots).where(eq(experimentSnapshots.id, id));
    return snapshot;
  }

  async createSnapshot(data: InsertExperimentSnapshot): Promise<ExperimentSnapshot> {
    const [created] = await db.insert(experimentSnapshots).values(data).returning();
    return created;
  }

  async getAllDomainTemplates(): Promise<DomainTemplate[]> {
    return db.select().from(domainTemplates);
  }

  async getDomainTemplate(id: string): Promise<DomainTemplate | undefined> {
    const [template] = await db.select().from(domainTemplates).where(eq(domainTemplates.id, id));
    return template;
  }

  async getDomainTemplatesByDomain(domain: string): Promise<DomainTemplate[]> {
    return db.select().from(domainTemplates).where(eq(domainTemplates.domain, domain as any));
  }

  async createDomainTemplate(data: InsertDomainTemplate): Promise<DomainTemplate> {
    const [created] = await db.insert(domainTemplates).values(data).returning();
    return created;
  }

  async getClassicalBaseline(jobId: string): Promise<ClassicalBaseline | undefined> {
    const [baseline] = await db.select().from(classicalBaselines).where(eq(classicalBaselines.jobId, jobId));
    return baseline;
  }

  async createClassicalBaseline(data: InsertClassicalBaseline): Promise<ClassicalBaseline> {
    const [created] = await db.insert(classicalBaselines).values(data).returning();
    return created;
  }

  async getAllCourses(): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.isPublished, true));
  }

  async getAllCoursesWithStats(): Promise<(Course & { lessonCount: number })[]> {
    const results = await db
      .select({
        ...getTableColumns(courses),
        lessonCount: count(courseLessons.id),
      })
      .from(courses)
      .leftJoin(courseLessons, eq(courses.id, courseLessons.courseId))
      .where(eq(courses.isPublished, true))
      .groupBy(courses.id);

    return results.map((r) => ({
      ...r,
      lessonCount: Number(r.lessonCount),
    }));
  }

  async getCourse(id: string): Promise<Course | undefined> {
    const [course] = await db.select().from(courses).where(eq(courses.id, id));
    return course;
  }

  async getCoursesByInstructor(userId: string): Promise<Course[]> {
    return db.select().from(courses).where(eq(courses.instructorId, userId));
  }

  async createCourse(data: InsertCourse): Promise<Course> {
    const [created] = await db.insert(courses).values(data).returning();
    return created;
  }

  async updateCourse(id: string, data: Partial<InsertCourse>): Promise<Course | undefined> {
    const [updated] = await db.update(courses).set({ ...data, updatedAt: new Date() }).where(eq(courses.id, id)).returning();
    return updated;
  }

  async getLessonsByCourse(courseId: string): Promise<CourseLesson[]> {
    return db.select().from(courseLessons).where(eq(courseLessons.courseId, courseId)).orderBy(courseLessons.sortOrder);
  }

  async createLesson(data: InsertCourseLesson): Promise<CourseLesson> {
    const [created] = await db.insert(courseLessons).values(data).returning();
    return created;
  }

  async getEnrollmentsByUser(userId: string): Promise<CourseEnrollment[]> {
    return db.select().from(courseEnrollments).where(eq(courseEnrollments.userId, userId));
  }

  async getEnrollmentsByCourse(courseId: string): Promise<CourseEnrollment[]> {
    return db.select().from(courseEnrollments).where(eq(courseEnrollments.courseId, courseId));
  }

  async getEnrolledCoursesWithStats(userId: string): Promise<(Course & { lessonCount: number })[]> {
    console.log("🔍 getEnrolledCoursesWithStats called with userId:", userId);

    const results = await db
      .select({
        ...getTableColumns(courses),
        lessonCount: count(courseLessons.id),
      })
      .from(courses)
      .innerJoin(courseEnrollments, eq(courses.id, courseEnrollments.courseId))
      .leftJoin(courseLessons, eq(courses.id, courseLessons.courseId))
      .where(eq(courseEnrollments.userId, userId))
      .groupBy(courses.id);

    console.log("🔍 Query returned", results.length, "courses");
    console.log("🔍 Course IDs:", results.map(r => r.id));

    return results.map((r) => ({
      ...r,
      lessonCount: Number(r.lessonCount),
    }));
  }

  async getEnrollment(courseId: string, userId: string): Promise<CourseEnrollment | undefined> {
    const [enrollment] = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.userId, userId)));
    return enrollment;
  }

  async createEnrollment(data: InsertCourseEnrollment): Promise<CourseEnrollment> {
    const [created] = await db.insert(courseEnrollments).values(data).returning();
    return created;
  }

  async updateEnrollmentProgress(id: string, progress: number, completedLessons: string[]): Promise<CourseEnrollment | undefined> {
    const [updated] = await db.update(courseEnrollments).set({ progress, completedLessons }).where(eq(courseEnrollments.id, id)).returning();
    return updated;
  }

  async getAllPublicExperiments(): Promise<PublicExperiment[]> {
    return db.select().from(publicExperiments).orderBy(desc(publicExperiments.createdAt));
  }

  async getPublicExperiment(id: string): Promise<PublicExperiment | undefined> {
    const [experiment] = await db.select().from(publicExperiments).where(eq(publicExperiments.id, id));
    return experiment;
  }

  async createPublicExperiment(data: InsertPublicExperiment): Promise<PublicExperiment> {
    const [created] = await db.insert(publicExperiments).values(data).returning();
    return created;
  }

  async incrementPublicExperimentLikes(id: string): Promise<void> {
    await db.update(publicExperiments).set({ likes: sql`${publicExperiments.likes} + 1` }).where(eq(publicExperiments.id, id));
  }

  async incrementPublicExperimentForks(id: string): Promise<void> {
    await db.update(publicExperiments).set({ forks: sql`${publicExperiments.forks} + 1` }).where(eq(publicExperiments.id, id));
  }

  async createOrgUsageEvent(data: InsertOrgUsageEvent): Promise<OrgUsageEvent> {
    const [created] = await db.insert(orgUsageEvents).values(data).returning();
    return created;
  }

  async getOrgUsageEvents(orgId: string): Promise<OrgUsageEvent[]> {
    return db.select().from(orgUsageEvents).where(eq(orgUsageEvents.organizationId, orgId));
  }

  async createAnalyticsSnapshot(data: InsertAnalyticsSnapshot): Promise<AnalyticsSnapshot> {
    const [created] = await db.insert(analyticsSnapshots).values(data).returning();
    return created;
  }

  async getAnalyticsSnapshots(orgId: string): Promise<AnalyticsSnapshot[]> {
    return db.select().from(analyticsSnapshots).where(eq(analyticsSnapshots.organizationId, orgId));
  }

  async getTrajectories(jobId: string): Promise<OptimizationTrajectory[]> {
    return db.select().from(optimizationTrajectories).where(eq(optimizationTrajectories.jobId, jobId)).orderBy(optimizationTrajectories.iteration);
  }

  async createTrajectory(data: InsertOptimizationTrajectory): Promise<OptimizationTrajectory> {
    const [created] = await db.insert(optimizationTrajectories).values(data).returning();
    return created;
  }

  async createTrajectories(data: InsertOptimizationTrajectory[]): Promise<void> {
    await db.insert(optimizationTrajectories).values(data);
  }

  async getJobDiagnostics(jobId: string): Promise<JobDiagnostic | undefined> {
    const [diagnostic] = await db.select().from(jobDiagnostics).where(eq(jobDiagnostics.jobId, jobId));
    return diagnostic;
  }

  async createJobDiagnostic(data: InsertJobDiagnostic): Promise<JobDiagnostic> {
    const [created] = await db.insert(jobDiagnostics).values(data).returning();
    return created;
  }

  async getNetworkExperimentsByUser(userId: string): Promise<NetworkExperiment[]> {
    return db.select().from(networkExperiments).where(eq(networkExperiments.userId, userId));
  }

  async getNetworkExperiment(id: string): Promise<NetworkExperiment | undefined> {
    const [experiment] = await db.select().from(networkExperiments).where(eq(networkExperiments.id, id));
    return experiment;
  }

  async createNetworkExperiment(data: InsertNetworkExperiment): Promise<NetworkExperiment> {
    const [created] = await db.insert(networkExperiments).values(data).returning();
    return created;
  }

  async updateNetworkExperiment(id: string, data: Partial<InsertNetworkExperiment>): Promise<NetworkExperiment | undefined> {
    const [updated] = await db.update(networkExperiments).set(data).where(eq(networkExperiments.id, id)).returning();
    return updated;
  }

  async getNetworkNodes(experimentId: string): Promise<NetworkNode[]> {
    return db.select().from(networkNodes).where(eq(networkNodes.experimentId, experimentId));
  }

  async createNetworkNode(data: InsertNetworkNode): Promise<NetworkNode> {
    const [created] = await db.insert(networkNodes).values(data).returning();
    return created;
  }

  async getNetworkChannels(experimentId: string): Promise<NetworkChannel[]> {
    return db.select().from(networkChannels).where(eq(networkChannels.experimentId, experimentId));
  }

  async createNetworkChannel(data: InsertNetworkChannel): Promise<NetworkChannel> {
    const [created] = await db.insert(networkChannels).values(data).returning();
    return created;
  }

  async getTokensByUser(userId: string): Promise<QuantumToken[]> {
    return db.select().from(quantumTokens).where(
      and(
        eq(quantumTokens.userId, userId),
        isNull(quantumTokens.revokedAt)
      )
    );
  }

  async createToken(data: InsertQuantumToken): Promise<QuantumToken> {
    const [created] = await db.insert(quantumTokens).values(data).returning();
    return created;
  }

  async getToken(id: string): Promise<QuantumToken | undefined> {
    const [token] = await db.select().from(quantumTokens).where(eq(quantumTokens.id, id));
    return token;
  }

  async revokeToken(id: string): Promise<void> {
    await db.update(quantumTokens).set({ revokedAt: new Date() }).where(eq(quantumTokens.id, id));
  }
}

export const storage = new DatabaseStorage();
