import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { insertUserSchema, insertCircuitSchema, insertJobSchema } from "@shared/schema";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const verify = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(hash), Buffer.from(verify));
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function simulateQuantumJob(jobId: string, shots: number, algorithmType: string) {
  await new Promise(r => setTimeout(r, 1000));
  await storage.updateJobStatus(jobId, "running");

  const execTime = 1 + Math.random() * 4;
  await new Promise(r => setTimeout(r, execTime * 1000));

  const numQubits = 3;
  const measurements: Record<string, number> = {};
  let remaining = shots;
  const states = Array.from({length: 2**numQubits}, (_, i) => i.toString(2).padStart(numQubits, '0'));

  for (let i = 0; i < states.length - 1 && remaining > 0; i++) {
    const count = Math.floor(Math.random() * remaining * 0.6);
    if (count > 0) { measurements[states[i]] = count; remaining -= count; }
  }
  if (remaining > 0) measurements[states[states.length-1]] = remaining;

  let convergenceData = null;
  if (algorithmType === "vqe" || algorithmType === "qaoa") {
    convergenceData = Array.from({length: 20}, (_, i) => ({
      iteration: i,
      energy: -0.5 - Math.random() * 0.5 * (1 - Math.exp(-i/5)),
      gradient: Math.random() * 0.1 * Math.exp(-i/5)
    }));
  }

  await storage.createJobResult({
    jobId, measurements, convergenceData,
    executionTime: execTime,
    expectationValues: { Z: -0.3 + Math.random() * 0.6 },
    metadata: { simulator: "local_aer", timestamp: new Date().toISOString() }
  });

  await storage.updateJobStatus(jobId, "completed");
}

async function seedDatabase() {
  const existingBackends = await storage.getAllBackends();
  if (existingBackends.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with sample data...");

  const backends = [
    {
      name: "IBM Eagle r3",
      provider: "ibm" as const,
      backendType: "real_device" as const,
      qubitCount: 127,
      status: "online" as const,
      properties: { gateSet: ["cx", "rz", "sx", "x", "id"], connectivity: "heavy-hex", t1: 200, t2: 150, errorRate: 0.003 },
      queueDepth: 12
    },
    {
      name: "IBM Heron",
      provider: "ibm" as const,
      backendType: "real_device" as const,
      qubitCount: 133,
      status: "online" as const,
      properties: { gateSet: ["ecr", "rz", "sx", "x", "id"], connectivity: "heavy-hex", t1: 250, t2: 180, errorRate: 0.002 },
      queueDepth: 8
    },
    {
      name: "Qiskit Aer Simulator",
      provider: "local_simulator" as const,
      backendType: "simulator" as const,
      qubitCount: 32,
      status: "online" as const,
      properties: { gateSet: ["u1", "u2", "u3", "cx", "id", "x", "y", "z", "h", "s", "t"], connectivity: "all-to-all", noiseless: true },
      queueDepth: 0
    },
    {
      name: "Aer Noise Simulator",
      provider: "local_simulator" as const,
      backendType: "simulator" as const,
      qubitCount: 24,
      status: "online" as const,
      properties: { gateSet: ["u1", "u2", "u3", "cx", "id", "x", "y", "z", "h", "s", "t"], connectivity: "all-to-all", noiseModel: "ibm_brisbane" },
      queueDepth: 0
    },
    {
      name: "PennyLane Default",
      provider: "pennylane" as const,
      backendType: "simulator" as const,
      qubitCount: 20,
      status: "online" as const,
      properties: { gateSet: ["PauliX", "PauliY", "PauliZ", "Hadamard", "CNOT", "RX", "RY", "RZ"], connectivity: "all-to-all", differentiable: true },
      queueDepth: 0
    },
    {
      name: "PennyLane Lightning",
      provider: "pennylane" as const,
      backendType: "simulator" as const,
      qubitCount: 30,
      status: "maintenance" as const,
      properties: { gateSet: ["PauliX", "PauliY", "PauliZ", "Hadamard", "CNOT", "RX", "RY", "RZ", "Toffoli"], connectivity: "all-to-all", accelerated: true },
      queueDepth: 0
    }
  ];

  const createdBackends = [];
  for (const backend of backends) {
    const created = await storage.createBackend(backend);
    createdBackends.push(created);
  }

  const demoUser = await storage.createUser({
    username: "demo",
    email: "demo@quantumcloud.io",
    password: hashPassword("demo123"),
    role: "researcher" as const,
  });

  const bellCircuit = await storage.createCircuit({
    name: "Bell State Preparation",
    description: "Creates a maximally entangled Bell state |\u03A6+\u27E9 = (|00\u27E9 + |11\u27E9)/\u221A2",
    userId: demoUser.id,
    qasm: "OPENQASM 2.0;\ninclude \"qelib1.inc\";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];\nmeasure q[0] -> c[0];\nmeasure q[1] -> c[1];",
    circuitData: { qubits: 2, steps: 4, gates: [{id:"g1",gate:"H",qubit:0,step:0,color:"#3b82f6"},{id:"g2",gate:"CNOT",qubit:1,step:1,controlQubit:0,color:"#f59e0b"},{id:"g3",gate:"M",qubit:0,step:3,color:"#6b7280"},{id:"g4",gate:"M",qubit:1,step:3,color:"#6b7280"}] },
    tags: ["entanglement", "bell-state", "tutorial"],
    visibility: "public" as const,
  });

  const ghzCircuit = await storage.createCircuit({
    name: "GHZ State Circuit",
    description: "Greenberger-Horne-Zeilinger state on 3 qubits",
    userId: demoUser.id,
    qasm: "OPENQASM 2.0;\ninclude \"qelib1.inc\";\nqreg q[3];\ncreg c[3];\nh q[0];\ncx q[0],q[1];\ncx q[1],q[2];\nmeasure q[0] -> c[0];\nmeasure q[1] -> c[1];\nmeasure q[2] -> c[2];",
    circuitData: { qubits: 3, steps: 6, gates: [{id:"g1",gate:"H",qubit:0,step:0,color:"#3b82f6"},{id:"g2",gate:"CNOT",qubit:1,step:1,controlQubit:0,color:"#f59e0b"},{id:"g3",gate:"CNOT",qubit:2,step:2,controlQubit:1,color:"#f59e0b"},{id:"g4",gate:"M",qubit:0,step:5,color:"#6b7280"},{id:"g5",gate:"M",qubit:1,step:5,color:"#6b7280"},{id:"g6",gate:"M",qubit:2,step:5,color:"#6b7280"}] },
    tags: ["ghz", "entanglement", "multi-qubit"],
    visibility: "public" as const,
  });

  const qftCircuit = await storage.createCircuit({
    name: "Quantum Fourier Transform (3-qubit)",
    description: "QFT circuit implementation on 3 qubits with controlled rotations",
    userId: demoUser.id,
    qasm: "OPENQASM 2.0;\ninclude \"qelib1.inc\";\nqreg q[3];\ncreg c[3];\nh q[0];\nrz(pi/2) q[0];\ncx q[1],q[0];\nh q[1];\nrz(pi/4) q[0];\ncx q[2],q[0];\nrz(pi/2) q[1];\ncx q[2],q[1];\nh q[2];",
    circuitData: { qubits: 3, steps: 8, gates: [{id:"g1",gate:"H",qubit:0,step:0,color:"#3b82f6"},{id:"g2",gate:"RZ",qubit:0,step:1,color:"#c084fc",params:{angle:1.5708}},{id:"g3",gate:"CNOT",qubit:0,step:2,controlQubit:1,color:"#f59e0b"},{id:"g4",gate:"H",qubit:1,step:3,color:"#3b82f6"},{id:"g5",gate:"RZ",qubit:0,step:4,color:"#c084fc",params:{angle:0.7854}},{id:"g6",gate:"CNOT",qubit:0,step:5,controlQubit:2,color:"#f59e0b"},{id:"g7",gate:"RZ",qubit:1,step:5,color:"#c084fc",params:{angle:1.5708}},{id:"g8",gate:"H",qubit:2,step:7,color:"#3b82f6"}] },
    tags: ["qft", "fourier", "algorithm"],
    visibility: "private" as const,
  });

  const qiskitAer = createdBackends.find(b => b.name === "Qiskit Aer Simulator")!;
  const pennyDefault = createdBackends.find(b => b.name === "PennyLane Default")!;
  const aerNoise = createdBackends.find(b => b.name === "Aer Noise Simulator")!;
  const ibmEagle = createdBackends.find(b => b.name === "IBM Eagle r3")!;

  const job1 = await storage.createJob({
    userId: demoUser.id,
    circuitId: bellCircuit.id,
    backendId: qiskitAer.id,
    algorithmType: "raw_circuit" as const,
    shots: 1024,
  });
  await storage.updateJobStatus(job1.id, "running");
  await storage.createJobResult({
    jobId: job1.id,
    measurements: {"00": 512, "01": 3, "10": 5, "11": 504},
    executionTime: 1.2,
    expectationValues: {"ZZ": 0.984},
  });
  await storage.updateJobStatus(job1.id, "completed");

  const job2 = await storage.createJob({
    userId: demoUser.id,
    circuitId: bellCircuit.id,
    backendId: pennyDefault.id,
    algorithmType: "vqe" as const,
    shots: 4096,
  });
  await storage.updateJobStatus(job2.id, "running");
  const convergenceData = Array.from({length: 20}, (_, i) => ({
    iteration: i,
    energy: -0.2 - 0.95 * (1 - Math.exp(-i / 5)),
    gradient: 0.5 * Math.exp(-i / 5),
  }));
  await storage.createJobResult({
    jobId: job2.id,
    measurements: {"000": 1800, "001": 500, "010": 400, "011": 200, "100": 600, "101": 300, "110": 196, "111": 100},
    convergenceData,
    executionTime: 4.7,
    expectationValues: {"H": -1.137},
  });
  await storage.updateJobStatus(job2.id, "completed");

  const job3 = await storage.createJob({
    userId: demoUser.id,
    circuitId: bellCircuit.id,
    backendId: aerNoise.id,
    algorithmType: "qaoa" as const,
    shots: 2048,
  });
  await storage.updateJobStatus(job3.id, "running");

  const job4 = await storage.createJob({
    userId: demoUser.id,
    circuitId: bellCircuit.id,
    backendId: ibmEagle.id,
    algorithmType: "raw_circuit" as const,
    shots: 1024,
  });
  await storage.updateJobStatus(job4.id, "failed", "Backend queue timeout exceeded");

  console.log("Database seeded successfully!");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  seedDatabase().catch(console.error);

  const MemStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || "quantum-cloud-secret",
    resave: false,
    saveUninitialized: false,
    store: new MemStore({ checkPeriod: 86400000 }),
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
  }));

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, role } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      const hashedPassword = hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        role: role || "researcher",
      });

      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not logged in" });
    }
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/circuits", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuits = await storage.getCircuitsByUser(req.session.userId!);
      res.json(circuits);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get circuits" });
    }
  });

  app.get("/api/circuits/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuit = await storage.getCircuit(req.params.id);
      if (!circuit) {
        return res.status(404).json({ message: "Circuit not found" });
      }
      res.json(circuit);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get circuit" });
    }
  });

  app.post("/api/circuits", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuitData = { ...req.body, userId: req.session.userId! };
      const circuit = await storage.createCircuit(circuitData);
      res.status(201).json(circuit);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create circuit" });
    }
  });

  app.patch("/api/circuits/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuit = await storage.getCircuit(req.params.id);
      if (!circuit) {
        return res.status(404).json({ message: "Circuit not found" });
      }
      const updated = await storage.updateCircuit(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update circuit" });
    }
  });

  app.delete("/api/circuits/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuit = await storage.getCircuit(req.params.id);
      if (!circuit) {
        return res.status(404).json({ message: "Circuit not found" });
      }
      await storage.deleteCircuit(req.params.id);
      res.json({ message: "Circuit deleted" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to delete circuit" });
    }
  });

  app.get("/api/backends", requireAuth, async (_req: Request, res: Response) => {
    try {
      const backends = await storage.getAllBackends();
      res.json(backends);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get backends" });
    }
  });

  app.get("/api/backends/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const backend = await storage.getBackend(req.params.id);
      if (!backend) {
        return res.status(404).json({ message: "Backend not found" });
      }
      res.json(backend);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get backend" });
    }
  });

  app.get("/api/jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const userJobs = await storage.getJobsByUser(req.session.userId!);
      res.json(userJobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get jobs" });
    }
  });

  app.get("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }
      res.json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get job" });
    }
  });

  app.post("/api/jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const jobData = { ...req.body, userId: req.session.userId! };
      const job = await storage.createJob(jobData);

      simulateQuantumJob(job.id, job.shots, job.algorithmType).catch(err => {
        console.error(`Simulation failed for job ${job.id}:`, err);
        storage.updateJobStatus(job.id, "failed", err.message).catch(() => {});
      });

      res.status(201).json(job);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to create job" });
    }
  });

  app.get("/api/results/:jobId", requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await storage.getJobResultByJobId(req.params.jobId);
      if (!result) {
        return res.status(404).json({ message: "Result not found" });
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get result" });
    }
  });

  app.get("/api/dashboard/stats", requireAuth, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getJobStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get stats" });
    }
  });

  app.get("/api/dashboard/recent-jobs", requireAuth, async (_req: Request, res: Response) => {
    try {
      const recentJobs = await storage.getRecentJobs(10);
      res.json(recentJobs);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get recent jobs" });
    }
  });

  app.get("/api/dashboard/recent-circuits", requireAuth, async (_req: Request, res: Response) => {
    try {
      const recentCircuits = await storage.getRecentCircuits(10);
      res.json(recentCircuits);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get recent circuits" });
    }
  });

  return httpServer;
}
