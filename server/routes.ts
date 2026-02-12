import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import { scryptSync, randomBytes, timingSafeEqual, createHash } from "crypto";
import OpenAI from "openai";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

function generateApiKey(): string {
  return "qc_" + randomBytes(32).toString("hex");
}

function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
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
    { name: "IBM Eagle r3", provider: "ibm" as const, backendType: "real_device" as const, qubitCount: 127, status: "online" as const, properties: { gateSet: ["cx", "rz", "sx", "x", "id"], connectivity: "heavy-hex", t1: 200, t2: 150, errorRate: 0.003 }, queueDepth: 12 },
    { name: "IBM Heron", provider: "ibm" as const, backendType: "real_device" as const, qubitCount: 133, status: "online" as const, properties: { gateSet: ["ecr", "rz", "sx", "x", "id"], connectivity: "heavy-hex", t1: 250, t2: 180, errorRate: 0.002 }, queueDepth: 8 },
    { name: "IBM Marrakesh", provider: "ibm" as const, backendType: "real_device" as const, qubitCount: 156, status: "online" as const, properties: { gateSet: ["cx", "rz", "sx", "x", "id"], connectivity: "heavy-hex", t1: 220, t2: 160, errorRate: 0.0025 }, queueDepth: 15 },
    { name: "IBM Pittsburgh", provider: "ibm" as const, backendType: "real_device" as const, qubitCount: 65, status: "online" as const, properties: { gateSet: ["cx", "rz", "sx", "x", "id"], connectivity: "heavy-hex", t1: 180, t2: 140, errorRate: 0.004 }, queueDepth: 5 },
    { name: "IBM Kingston", provider: "ibm" as const, backendType: "real_device" as const, qubitCount: 27, status: "maintenance" as const, properties: { gateSet: ["cx", "rz", "sx", "x", "id"], connectivity: "heavy-hex", t1: 150, t2: 120, errorRate: 0.005 }, queueDepth: 0 },
    { name: "IBM Miami", provider: "ibm" as const, backendType: "real_device" as const, qubitCount: 27, status: "online" as const, properties: { gateSet: ["cx", "rz", "sx", "x", "id"], connectivity: "falcon", t1: 130, t2: 100, errorRate: 0.006 }, queueDepth: 3 },
    { name: "Qiskit Aer Simulator", provider: "local_simulator" as const, backendType: "simulator" as const, qubitCount: 32, status: "online" as const, properties: { gateSet: ["u1", "u2", "u3", "cx", "id", "x", "y", "z", "h", "s", "t"], connectivity: "all-to-all", noiseless: true }, queueDepth: 0 },
    { name: "Aer Noise Simulator", provider: "local_simulator" as const, backendType: "simulator" as const, qubitCount: 24, status: "online" as const, properties: { gateSet: ["u1", "u2", "u3", "cx", "id", "x", "y", "z", "h", "s", "t"], connectivity: "all-to-all", noiseModel: "ibm_brisbane" }, queueDepth: 0 },
    { name: "PennyLane Default", provider: "pennylane" as const, backendType: "simulator" as const, qubitCount: 20, status: "online" as const, properties: { gateSet: ["PauliX", "PauliY", "PauliZ", "Hadamard", "CNOT", "RX", "RY", "RZ"], connectivity: "all-to-all", differentiable: true }, queueDepth: 0 },
    { name: "PennyLane Lightning", provider: "pennylane" as const, backendType: "simulator" as const, qubitCount: 30, status: "maintenance" as const, properties: { gateSet: ["PauliX", "PauliY", "PauliZ", "Hadamard", "CNOT", "RX", "RY", "RZ", "Toffoli"], connectivity: "all-to-all", accelerated: true }, queueDepth: 0 },
    { name: "AQT IBEX Q1", provider: "aqt" as const, backendType: "real_device" as const, qubitCount: 24, status: "online" as const, properties: { gateSet: ["Rz", "R", "Rxx", "MS"], connectivity: "all-to-all", technology: "trapped-ion", t1: 1000, t2: 500, errorRate: 0.001 }, queueDepth: 6 },
    { name: "AWS Braket DM1", provider: "aws" as const, backendType: "simulator" as const, qubitCount: 17, status: "online" as const, properties: { gateSet: ["H", "CNOT", "X", "Y", "Z", "Rx", "Ry", "Rz", "SWAP", "T", "S"], connectivity: "all-to-all", densityMatrix: true, noiseSimulation: true }, queueDepth: 0 },
    { name: "AWS Braket TN1", provider: "aws" as const, backendType: "simulator" as const, qubitCount: 50, status: "online" as const, properties: { gateSet: ["H", "CNOT", "X", "Y", "Z", "Rx", "Ry", "Rz", "SWAP"], connectivity: "all-to-all", tensorNetwork: true }, queueDepth: 2 },
    { name: "AWS Braket SV1", provider: "aws" as const, backendType: "simulator" as const, qubitCount: 34, status: "online" as const, properties: { gateSet: ["H", "CNOT", "X", "Y", "Z", "Rx", "Ry", "Rz", "SWAP", "T", "S", "CCX"], connectivity: "all-to-all", stateVector: true }, queueDepth: 0 },
    { name: "NEC Vector Annealer", provider: "nec" as const, backendType: "real_device" as const, qubitCount: 100000, status: "online" as const, properties: { type: "quantum-annealer", connectivity: "fully-connected", technology: "vector-annealing", maxVariables: 100000 }, queueDepth: 4 },
    { name: "IQM Emerald", provider: "iqm" as const, backendType: "real_device" as const, qubitCount: 5, status: "online" as const, properties: { gateSet: ["CZ", "PRX", "Rz"], connectivity: "star", technology: "superconducting", t1: 35, t2: 25, errorRate: 0.005 }, queueDepth: 2 },
    { name: "IQM Garnet", provider: "iqm" as const, backendType: "real_device" as const, qubitCount: 20, status: "online" as const, properties: { gateSet: ["CZ", "PRX", "Rz", "MOVE"], connectivity: "square-lattice", technology: "superconducting", t1: 40, t2: 30, errorRate: 0.004 }, queueDepth: 7 },
    { name: "Pasqal Emulator", provider: "pasqal" as const, backendType: "simulator" as const, qubitCount: 100, status: "online" as const, properties: { gateSet: ["Rydberg", "local-detuning", "global-drive"], connectivity: "programmable", technology: "neutral-atom", analogMode: true }, queueDepth: 0 },
    { name: "Pasqal Fresnel", provider: "pasqal" as const, backendType: "real_device" as const, qubitCount: 100, status: "online" as const, properties: { gateSet: ["Rydberg", "local-detuning", "global-drive"], connectivity: "programmable-2D", technology: "neutral-atom", t1: 5000, errorRate: 0.01 }, queueDepth: 10 },
    { name: "QuEra Aquila", provider: "quera" as const, backendType: "real_device" as const, qubitCount: 256, status: "online" as const, properties: { gateSet: ["Rydberg-blockade", "global-drive", "local-detuning"], connectivity: "programmable-geometry", technology: "neutral-atom", maxAtoms: 256, errorRate: 0.005 }, queueDepth: 8 },
    { name: "Rigetti Ankaa-3", provider: "rigetti" as const, backendType: "real_device" as const, qubitCount: 84, status: "online" as const, properties: { gateSet: ["CZ", "XY", "Rx", "Rz"], connectivity: "square-octagon", technology: "superconducting", t1: 25, t2: 18, errorRate: 0.005 }, queueDepth: 6 },
    { name: "Rigetti Aspen-M-3", provider: "rigetti" as const, backendType: "real_device" as const, qubitCount: 80, status: "maintenance" as const, properties: { gateSet: ["CZ", "XY", "Rx", "Rz"], connectivity: "octagonal", technology: "superconducting", t1: 20, t2: 15, errorRate: 0.006 }, queueDepth: 0 },
    { name: "Quantinuum H1-1", provider: "quantinuum" as const, backendType: "real_device" as const, qubitCount: 20, status: "online" as const, properties: { gateSet: ["Rz", "U1q", "ZZ"], connectivity: "all-to-all", technology: "trapped-ion", t1: 10000, t2: 3000, errorRate: 0.001, quantumVolume: 524288 }, queueDepth: 14 },
    { name: "Quantinuum H2-1", provider: "quantinuum" as const, backendType: "real_device" as const, qubitCount: 56, status: "online" as const, properties: { gateSet: ["Rz", "U1q", "ZZ"], connectivity: "all-to-all", technology: "trapped-ion", t1: 12000, t2: 4000, errorRate: 0.0008, quantumVolume: 65536 }, queueDepth: 20 },
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
    description: "Creates a maximally entangled Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2",
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

  await storage.createCircuit({
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

  const job1 = await storage.createJob({ userId: demoUser.id, circuitId: bellCircuit.id, backendId: qiskitAer.id, algorithmType: "raw_circuit" as const, shots: 1024 });
  await storage.updateJobStatus(job1.id, "running");
  await storage.createJobResult({ jobId: job1.id, measurements: {"00": 512, "01": 3, "10": 5, "11": 504}, executionTime: 1.2, expectationValues: {"ZZ": 0.984} });
  await storage.updateJobStatus(job1.id, "completed");

  const job2 = await storage.createJob({ userId: demoUser.id, circuitId: bellCircuit.id, backendId: pennyDefault.id, algorithmType: "vqe" as const, shots: 4096 });
  await storage.updateJobStatus(job2.id, "running");
  const convergenceData = Array.from({length: 20}, (_, i) => ({ iteration: i, energy: -0.2 - 0.95 * (1 - Math.exp(-i / 5)), gradient: 0.5 * Math.exp(-i / 5) }));
  await storage.createJobResult({ jobId: job2.id, measurements: {"000": 1800, "001": 500, "010": 400, "011": 200, "100": 600, "101": 300, "110": 196, "111": 100}, convergenceData, executionTime: 4.7, expectationValues: {"H": -1.137} });
  await storage.updateJobStatus(job2.id, "completed");

  const job3 = await storage.createJob({ userId: demoUser.id, circuitId: bellCircuit.id, backendId: aerNoise.id, algorithmType: "qaoa" as const, shots: 2048 });
  await storage.updateJobStatus(job3.id, "running");

  const job4 = await storage.createJob({ userId: demoUser.id, circuitId: bellCircuit.id, backendId: ibmEagle.id, algorithmType: "raw_circuit" as const, shots: 1024 });
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

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, role } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) return res.status(409).json({ message: "Username already exists" });
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) return res.status(409).json({ message: "Email already exists" });
      const user = await storage.createUser({ username, email, password: hashPassword(password), role: role || "researcher" });
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
      if (!username || !password) return res.status(400).json({ message: "Username and password are required" });
      const user = await storage.getUserByUsername(username);
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      if (!verifyPassword(password, user.password)) return res.status(401).json({ message: "Invalid credentials" });
      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Login failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to get user" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out" });
    });
  });

  // Profile routes
  app.patch("/api/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      const { displayName, company, phone, bio, email } = req.body;
      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (company !== undefined) updateData.company = company;
      if (phone !== undefined) updateData.phone = phone;
      if (bio !== undefined) updateData.bio = bio;
      if (email !== undefined) updateData.email = email;
      const user = await storage.updateUser(req.session.userId!, updateData);
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to update profile" });
    }
  });

  app.post("/api/profile/change-password", requireAuth, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Both passwords required" });
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (!verifyPassword(currentPassword, user.password)) return res.status(401).json({ message: "Current password is incorrect" });
      await storage.updateUser(req.session.userId!, { password: hashPassword(newPassword) });
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to change password" });
    }
  });

  // Circuit routes
  app.get("/api/circuits", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuits = await storage.getCircuitsByUser(req.session.userId!);
      res.json(circuits);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/circuits/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuit = await storage.getCircuit(req.params.id);
      if (!circuit) return res.status(404).json({ message: "Circuit not found" });
      res.json(circuit);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/circuits", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuit = await storage.createCircuit({ ...req.body, userId: req.session.userId! });
      res.status(201).json(circuit);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/circuits/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuit = await storage.getCircuit(req.params.id);
      if (!circuit) return res.status(404).json({ message: "Circuit not found" });
      const updated = await storage.updateCircuit(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/circuits/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const circuit = await storage.getCircuit(req.params.id);
      if (!circuit) return res.status(404).json({ message: "Circuit not found" });
      await storage.deleteCircuit(req.params.id);
      res.json({ message: "Circuit deleted" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Backend routes
  app.get("/api/backends", requireAuth, async (_req: Request, res: Response) => {
    try { res.json(await storage.getAllBackends()); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/backends/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const backend = await storage.getBackend(req.params.id);
      if (!backend) return res.status(404).json({ message: "Backend not found" });
      res.json(backend);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Job routes
  app.get("/api/jobs", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getJobsByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/jobs/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      res.json(job);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/jobs", requireAuth, async (req: Request, res: Response) => {
    try {
      const balance = await storage.getCreditBalance(req.session.userId!);
      const estimatedCost = (req.body.shots || 1024) * 0.001;
      if (balance < estimatedCost) {
        return res.status(402).json({ message: "Insufficient credits. Please purchase more credits to continue." });
      }
      const job = await storage.createJob({ ...req.body, userId: req.session.userId!, creditsUsed: estimatedCost });
      await storage.updateCreditBalance(req.session.userId!, -estimatedCost);
      simulateQuantumJob(job.id, job.shots, job.algorithmType).catch(err => {
        console.error(`Simulation failed for job ${job.id}:`, err);
        storage.updateJobStatus(job.id, "failed", err.message).catch(() => {});
      });
      res.status(201).json(job);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Results
  app.get("/api/results/:jobId", requireAuth, async (req: Request, res: Response) => {
    try {
      const result = await storage.getJobResultByJobId(req.params.jobId);
      if (!result) return res.status(404).json({ message: "Result not found" });
      res.json(result);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Dashboard
  app.get("/api/dashboard/stats", requireAuth, async (_req: Request, res: Response) => {
    try { res.json(await storage.getJobStats()); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/dashboard/recent-jobs", requireAuth, async (_req: Request, res: Response) => {
    try { res.json(await storage.getRecentJobs(10)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/dashboard/recent-circuits", requireAuth, async (_req: Request, res: Response) => {
    try { res.json(await storage.getRecentCircuits(10)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // API Keys
  app.get("/api/keys", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getApiKeysByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/keys", requireAuth, async (req: Request, res: Response) => {
    try {
      const latestKey = await storage.getLatestApiKey(req.session.userId!);
      if (latestKey && !latestKey.revokedAt) {
        const hoursSince = (Date.now() - new Date(latestKey.createdAt).getTime()) / (1000 * 60 * 60);
        if (hoursSince < 24) {
          const nextAvailable = new Date(new Date(latestKey.createdAt).getTime() + 24 * 60 * 60 * 1000);
          return res.status(429).json({ message: "You can only generate a new API key once every 24 hours.", nextAvailable });
        }
      }
      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = rawKey.substring(0, 10) + "...";
      const label = req.body.label || "Default";
      const apiKey = await storage.createApiKey({ userId: req.session.userId!, keyHash, keyPrefix, label });
      res.status(201).json({ ...apiKey, key: rawKey });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/keys/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.revokeApiKey(req.params.id);
      res.json({ message: "API key revoked" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Credits
  app.get("/api/credits", requireAuth, async (req: Request, res: Response) => {
    try {
      const balance = await storage.getCreditBalance(req.session.userId!);
      res.json({ balance, balanceMinutes: balance / 60 });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/credits/purchase", requireAuth, async (req: Request, res: Response) => {
    try {
      const { minutes, paymentMethod } = req.body;
      if (!minutes || minutes < 1) return res.status(400).json({ message: "Invalid minutes" });
      const seconds = minutes * 60;
      await storage.updateCreditBalance(req.session.userId!, seconds);
      const user = await storage.getUser(req.session.userId!);
      res.json({ message: "Credits purchased successfully", newBalance: user?.creditBalance, minutes });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // Support Tickets
  app.get("/api/support/tickets", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getSupportTicketsByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/support/tickets/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const ticket = await storage.getSupportTicket(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      const messages = await storage.getSupportMessages(req.params.id);
      res.json({ ...ticket, messages });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/support/tickets", requireAuth, async (req: Request, res: Response) => {
    try {
      const { subject, description, priority, category } = req.body;
      if (!subject || !description) return res.status(400).json({ message: "Subject and description required" });
      const ticket = await storage.createSupportTicket({ userId: req.session.userId!, subject, description, priority: priority || "medium", category: category || "general" });
      if (description) {
        await storage.createSupportMessage({ ticketId: ticket.id, userId: req.session.userId!, message: description, isStaff: false });
      }
      res.status(201).json(ticket);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/support/tickets/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const msg = await storage.createSupportMessage({ ticketId: req.params.id, userId: req.session.userId!, message, isStaff: false });
      res.status(201).json(msg);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  // AI Assistant
  app.get("/api/assistant/threads", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getAssistantThreadsByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/assistant/threads", requireAuth, async (req: Request, res: Response) => {
    try {
      const thread = await storage.createAssistantThread({ userId: req.session.userId!, title: req.body.title || "New Conversation" });
      res.status(201).json(thread);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/assistant/threads/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getAssistantMessages(req.params.id)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/assistant/threads/:id/messages", requireAuth, async (req: Request, res: Response) => {
    try {
      const { content, circuitIds } = req.body;
      if (!content) return res.status(400).json({ message: "Content required" });

      await storage.createAssistantMessage({ threadId: req.params.id, role: "user", content, circuitIds: circuitIds || [] });

      const existingMessages = await storage.getAssistantMessages(req.params.id);
      const circuits = await storage.getCircuitsByUser(req.session.userId!);

      const systemPrompt = `You are QuantumBot, an expert quantum computing assistant on the QuantumCloud platform. You have deep expertise in:
- Quantum circuit design and optimization
- Quantum algorithms (VQE, QAOA, QFT, Grover's, Shor's, etc.)
- Quantum error correction and noise mitigation
- Quantum machine learning
- Various quantum hardware platforms (IBM, IQM, Rigetti, Quantinuum, Pasqal, QuEra, etc.)
- OpenQASM, Qiskit, Cirq, PennyLane, and other quantum frameworks

The user has access to ${circuits.length} circuits on the platform. ${circuits.length > 0 ? `Their circuits include: ${circuits.slice(0, 5).map(c => `"${c.name}" (${(c.tags || []).join(', ')})`).join('; ')}` : ''}

Help users design circuits, debug quantum programs, explain quantum concepts, optimize algorithms, and make the best use of available quantum backends. Be concise but thorough. Use proper quantum notation when relevant.`;

      const chatMessages: any[] = [
        { role: "system", content: systemPrompt },
        ...existingMessages.map(m => ({ role: m.role, content: m.content }))
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_tokens: 2048,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      await storage.createAssistantMessage({ threadId: req.params.id, role: "assistant", content: fullResponse });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Assistant error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ message: error.message });
      }
    }
  });

  return httpServer;
}
