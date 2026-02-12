import { eq, desc, sql, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  type User, type InsertUser,
  type Organization, type InsertOrganization,
  type Circuit, type InsertCircuit,
  type Backend, type InsertBackend,
  type Job, type InsertJob,
  type JobResult, type InsertJobResult,
  users, organizations, circuits, quantumBackends, jobs, jobResults,
} from "@shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
}

export const storage = new DatabaseStorage();
