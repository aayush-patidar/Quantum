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

  await storage.createUseCaseJourney({
    name: "Portfolio Optimization",
    description: "Optimize a financial portfolio using QAOA to find the best asset allocation that maximizes returns while minimizing risk.",
    algorithmType: "qaoa" as const,
    domain: "finance" as const,
    defaultParams: { numAssets: 4, riskTolerance: 0.5, budget: 100000 },
    steps: [{ step: 1, title: "Define Assets" }, { step: 2, title: "Set Constraints" }, { step: 3, title: "Run Optimization" }, { step: 4, title: "Analyze Results" }],
  });

  await storage.createUseCaseJourney({
    name: "Molecular Ground State",
    description: "Calculate the ground state energy of a molecule using the Variational Quantum Eigensolver (VQE) algorithm.",
    algorithmType: "vqe" as const,
    domain: "chemistry" as const,
    defaultParams: { molecule: "H2", basisSet: "sto-3g", bondLength: 0.735 },
    steps: [{ step: 1, title: "Select Molecule" }, { step: 2, title: "Configure Ansatz" }, { step: 3, title: "Run VQE" }, { step: 4, title: "Analyze Energy" }],
  });

  await storage.createUseCaseJourney({
    name: "Max-Cut",
    description: "Solve the Max-Cut graph problem using QAOA to partition graph vertices into two sets maximizing edge cuts.",
    algorithmType: "qaoa" as const,
    domain: "optimization" as const,
    defaultParams: { numNodes: 5, edgeProbability: 0.6 },
    steps: [{ step: 1, title: "Define Graph" }, { step: 2, title: "Set QAOA Depth" }, { step: 3, title: "Run Optimization" }, { step: 4, title: "Visualize Partition" }],
  });

  await storage.createUseCaseJourney({
    name: "Quantum Classifier",
    description: "Build a quantum machine learning classifier using parameterized quantum circuits for binary classification tasks.",
    algorithmType: "qml" as const,
    domain: "business_analytics" as const,
    defaultParams: { numFeatures: 4, numLayers: 3, learningRate: 0.01 },
    steps: [{ step: 1, title: "Prepare Data" }, { step: 2, title: "Design Ansatz" }, { step: 3, title: "Train Model" }, { step: 4, title: "Evaluate Accuracy" }],
  });

  await storage.createLearningLab({
    title: "Bell State Lab",
    description: "Learn to create and measure a Bell state, the simplest example of quantum entanglement.",
    difficulty: "beginner" as const,
    category: "entanglement",
    objectives: ["Create a Bell state using H and CNOT gates", "Measure both qubits", "Verify entanglement through correlated measurements"],
    initialCircuit: { qubits: 2, steps: 4, gates: [] },
    expectedResults: { "00": 0.5, "11": 0.5 },
    hints: ["Start with a Hadamard gate on qubit 0", "Use CNOT with qubit 0 as control and qubit 1 as target"],
    estimatedMinutes: 15,
    sortOrder: 1,
  });

  await storage.createLearningLab({
    title: "Superposition Lab",
    description: "Explore quantum superposition by placing qubits in equal superposition states and observing measurement outcomes.",
    difficulty: "beginner" as const,
    category: "fundamentals",
    objectives: ["Apply Hadamard gates to create superposition", "Understand measurement probabilities", "Compare single vs multi-qubit superposition"],
    initialCircuit: { qubits: 1, steps: 2, gates: [] },
    expectedResults: { "0": 0.5, "1": 0.5 },
    hints: ["Apply a Hadamard gate to qubit 0", "Measure the qubit to observe equal probabilities"],
    estimatedMinutes: 10,
    sortOrder: 2,
  });

  await storage.createLearningLab({
    title: "Entanglement Lab",
    description: "Create and verify multi-qubit entangled states including GHZ and W states.",
    difficulty: "intermediate" as const,
    category: "entanglement",
    objectives: ["Create a 3-qubit GHZ state", "Verify entanglement through measurement correlations", "Compare GHZ and W state properties"],
    initialCircuit: { qubits: 3, steps: 6, gates: [] },
    expectedResults: { "000": 0.5, "111": 0.5 },
    hints: ["Apply H to first qubit, then cascade CNOT gates", "GHZ state should show only |000> and |111> outcomes"],
    estimatedMinutes: 25,
    sortOrder: 3,
  });

  await storage.createDomainTemplate({
    name: "Portfolio Optimization",
    description: "Optimize portfolio allocation using QAOA for maximum risk-adjusted returns.",
    domain: "finance" as const,
    algorithmType: "qaoa" as const,
    circuitTemplate: { qubits: 4, ansatz: "qaoa", depth: 2 },
    defaultParams: { numAssets: 4, riskTolerance: 0.5 },
    inputSchema: { numAssets: { type: "integer", min: 2, max: 10 }, riskTolerance: { type: "number", min: 0, max: 1 } },
    tags: ["finance", "optimization", "portfolio"],
    difficulty: "intermediate",
  });

  await storage.createDomainTemplate({
    name: "Drug Discovery",
    description: "Calculate molecular ground state energies for drug candidate screening using VQE.",
    domain: "chemistry" as const,
    algorithmType: "vqe" as const,
    circuitTemplate: { qubits: 4, ansatz: "uccsd", depth: 1 },
    defaultParams: { molecule: "H2", basisSet: "sto-3g" },
    inputSchema: { molecule: { type: "string" }, basisSet: { type: "string", enum: ["sto-3g", "6-31g"] } },
    tags: ["chemistry", "drug-discovery", "vqe"],
    difficulty: "advanced",
  });

  await storage.createDomainTemplate({
    name: "Max-Cut Solver",
    description: "Solve graph partitioning problems using QAOA for network optimization.",
    domain: "optimization" as const,
    algorithmType: "qaoa" as const,
    circuitTemplate: { qubits: 5, ansatz: "qaoa", depth: 3 },
    defaultParams: { numNodes: 5, edgeProbability: 0.5 },
    inputSchema: { numNodes: { type: "integer", min: 3, max: 20 }, edgeProbability: { type: "number", min: 0.1, max: 1 } },
    tags: ["optimization", "graph", "max-cut"],
    difficulty: "intermediate",
  });

  await storage.createDomainTemplate({
    name: "Fraud Detection",
    description: "Quantum-enhanced anomaly detection for identifying fraudulent transactions.",
    domain: "security" as const,
    algorithmType: "qml" as const,
    circuitTemplate: { qubits: 4, ansatz: "hardware_efficient", depth: 4 },
    defaultParams: { numFeatures: 4, threshold: 0.8 },
    inputSchema: { numFeatures: { type: "integer", min: 2, max: 8 }, threshold: { type: "number", min: 0.5, max: 0.99 } },
    tags: ["security", "ml", "anomaly-detection"],
    difficulty: "advanced",
  });

  await storage.createDomainTemplate({
    name: "Grid Optimization",
    description: "Optimize power grid distribution using quantum optimization for smart energy management.",
    domain: "smart_grid" as const,
    algorithmType: "qaoa" as const,
    circuitTemplate: { qubits: 6, ansatz: "qaoa", depth: 2 },
    defaultParams: { numNodes: 6, loadFactor: 0.7 },
    inputSchema: { numNodes: { type: "integer", min: 3, max: 12 }, loadFactor: { type: "number", min: 0.1, max: 1 } },
    tags: ["energy", "smart-grid", "optimization"],
    difficulty: "intermediate",
  });

  await storage.createDomainTemplate({
    name: "Supply Chain",
    description: "Optimize supply chain logistics using quantum computing for routing and scheduling.",
    domain: "business_analytics" as const,
    algorithmType: "qaoa" as const,
    circuitTemplate: { qubits: 5, ansatz: "qaoa", depth: 2 },
    defaultParams: { numWarehouses: 3, numDestinations: 5 },
    inputSchema: { numWarehouses: { type: "integer", min: 2, max: 8 }, numDestinations: { type: "integer", min: 2, max: 10 } },
    tags: ["logistics", "supply-chain", "optimization"],
    difficulty: "intermediate",
  });

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
      const { displayName, company, phone, bio, email, experienceLevel } = req.body;
      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (company !== undefined) updateData.company = company;
      if (phone !== undefined) updateData.phone = phone;
      if (bio !== undefined) updateData.bio = bio;
      if (email !== undefined) updateData.email = email;
      if (experienceLevel !== undefined) updateData.experienceLevel = experienceLevel;
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
      const jobData: any = { ...req.body, userId: req.session.userId!, creditsUsed: estimatedCost };
      if (req.body.backendMode !== undefined) jobData.backendMode = req.body.backendMode;
      if (req.body.compilationProfile !== undefined) jobData.compilationProfile = req.body.compilationProfile;
      if (req.body.mitigationProfile !== undefined) jobData.mitigationProfile = req.body.mitigationProfile;
      if (req.body.isTrustedRun !== undefined) jobData.isTrustedRun = req.body.isTrustedRun;
      const job = await storage.createJob(jobData);
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

  app.get("/api/usecases", async (_req: Request, res: Response) => {
    try { res.json(await storage.getAllUseCaseJourneys()); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/usecases/:id", async (req: Request, res: Response) => {
    try {
      const journey = await storage.getUseCaseJourney(req.params.id);
      if (!journey) return res.status(404).json({ message: "Use case journey not found" });
      res.json(journey);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/usecases/:id/run", requireAuth, async (req: Request, res: Response) => {
    try {
      const journey = await storage.getUseCaseJourney(req.params.id);
      if (!journey) return res.status(404).json({ message: "Use case journey not found" });
      const { params, backendId } = req.body;
      if (!backendId) return res.status(400).json({ message: "backendId is required" });
      const mergedParams = { ...(journey.defaultParams as any || {}), ...(params || {}) };
      const numQubits = mergedParams.numAssets || mergedParams.numNodes || mergedParams.numFeatures || 4;
      let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${numQubits}];\ncreg c[${numQubits}];\n`;
      if (journey.algorithmType === "qaoa") {
        for (let i = 0; i < numQubits; i++) qasm += `h q[${i}];\n`;
        for (let i = 0; i < numQubits - 1; i++) qasm += `cx q[${i}],q[${i+1}];\nrz(0.5) q[${i+1}];\ncx q[${i}],q[${i+1}];\n`;
        for (let i = 0; i < numQubits; i++) qasm += `rx(0.5) q[${i}];\n`;
      } else if (journey.algorithmType === "vqe") {
        for (let i = 0; i < numQubits; i++) qasm += `ry(0.5) q[${i}];\n`;
        for (let i = 0; i < numQubits - 1; i++) qasm += `cx q[${i}],q[${i+1}];\n`;
      } else if (journey.algorithmType === "qml") {
        for (let i = 0; i < numQubits; i++) qasm += `h q[${i}];\nry(0.3) q[${i}];\n`;
        for (let i = 0; i < numQubits - 1; i++) qasm += `cx q[${i}],q[${i+1}];\n`;
      } else {
        for (let i = 0; i < numQubits; i++) qasm += `h q[${i}];\n`;
      }
      for (let i = 0; i < numQubits; i++) qasm += `measure q[${i}] -> c[${i}];\n`;
      const circuit = await storage.createCircuit({
        name: `${journey.name} Circuit`,
        description: `Auto-generated from use case: ${journey.name}`,
        userId: req.session.userId!,
        qasm,
        circuitData: mergedParams,
        tags: [journey.algorithmType, journey.domain],
        visibility: "private" as const,
      });
      const shots = 1024;
      const estimatedCost = shots * 0.001;
      const balance = await storage.getCreditBalance(req.session.userId!);
      if (balance < estimatedCost) return res.status(402).json({ message: "Insufficient credits" });
      const job = await storage.createJob({
        userId: req.session.userId!,
        circuitId: circuit.id,
        backendId,
        algorithmType: journey.algorithmType as any,
        shots,
        creditsUsed: estimatedCost,
      });
      await storage.updateCreditBalance(req.session.userId!, -estimatedCost);
      simulateQuantumJob(job.id, shots, journey.algorithmType).catch(err => {
        storage.updateJobStatus(job.id, "failed", err.message).catch(() => {});
      });
      res.status(201).json({ circuit, job });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/labs", async (_req: Request, res: Response) => {
    try { res.json(await storage.getAllLearningLabs()); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/labs/:id", async (req: Request, res: Response) => {
    try {
      const lab = await storage.getLearningLab(req.params.id);
      if (!lab) return res.status(404).json({ message: "Lab not found" });
      res.json(lab);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/labs/:id/attempt", requireAuth, async (req: Request, res: Response) => {
    try {
      const lab = await storage.getLearningLab(req.params.id);
      if (!lab) return res.status(404).json({ message: "Lab not found" });
      const { circuitData, results } = req.body;
      const expected = lab.expectedResults as Record<string, number> || {};
      let matchCount = 0;
      let totalKeys = Object.keys(expected).length || 1;
      for (const key of Object.keys(expected)) {
        const expectedVal = expected[key];
        const actualVal = results?.[key] ?? 0;
        if (Math.abs(expectedVal - actualVal) <= expectedVal * 0.2) {
          matchCount++;
        }
      }
      const score = Math.round((matchCount / totalKeys) * 100);
      const passed = score >= 70;
      let feedback = passed ? "Excellent work! Your results match the expected outcomes." : "Not quite right. Review the hints and try adjusting your circuit.";
      if (score === 100) feedback = "Perfect score! You have mastered this lab.";
      const attempt = await storage.createLabAttempt({
        labId: req.params.id,
        userId: req.session.userId!,
        circuitData,
        results,
        passed,
        score,
        feedback,
      });
      res.status(201).json(attempt);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/workspaces", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getWorkspacesByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/workspaces", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, framework, config } = req.body;
      if (!name) return res.status(400).json({ message: "Name is required" });
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const workspace = await storage.createWorkspace({
        userId: req.session.userId!,
        name,
        framework,
        config,
        status: "running" as const,
        expiresAt,
      });
      res.status(201).json(workspace);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/workspaces/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const workspace = await storage.getWorkspace(req.params.id);
      if (!workspace) return res.status(404).json({ message: "Workspace not found" });
      res.json(workspace);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/workspaces/:id/stop", requireAuth, async (req: Request, res: Response) => {
    try {
      const workspace = await storage.updateWorkspaceStatus(req.params.id, "stopped");
      if (!workspace) return res.status(404).json({ message: "Workspace not found" });
      res.json(workspace);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/workspaces/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const workspace = await storage.updateWorkspaceStatus(req.params.id, "expired");
      if (!workspace) return res.status(404).json({ message: "Workspace not found" });
      res.json(workspace);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/programs/submit", requireAuth, async (req: Request, res: Response) => {
    try {
      const { code, framework, backendId, shots: reqShots, algorithmType } = req.body;
      if (!code || !framework || !backendId) return res.status(400).json({ message: "code, framework, and backendId are required" });
      const shots = reqShots || 1024;
      const circuit = await storage.createCircuit({
        name: `${framework} Program`,
        description: `Submitted via ${framework} framework`,
        userId: req.session.userId!,
        qasm: framework === "openqasm" ? code : undefined,
        circuitData: { code, framework },
        tags: [framework],
        visibility: "private" as const,
      });
      const estimatedCost = shots * 0.001;
      const balance = await storage.getCreditBalance(req.session.userId!);
      if (balance < estimatedCost) return res.status(402).json({ message: "Insufficient credits" });
      const job = await storage.createJob({
        userId: req.session.userId!,
        circuitId: circuit.id,
        backendId,
        algorithmType: (algorithmType || "raw_circuit") as any,
        shots,
        creditsUsed: estimatedCost,
      });
      await storage.updateCreditBalance(req.session.userId!, -estimatedCost);
      simulateQuantumJob(job.id, shots, algorithmType || "raw_circuit").catch(err => {
        storage.updateJobStatus(job.id, "failed", err.message).catch(() => {});
      });
      res.status(201).json({ circuit, job });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/snapshots", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getSnapshotsByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/snapshots/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const snapshot = await storage.getSnapshot(req.params.id);
      if (!snapshot) return res.status(404).json({ message: "Snapshot not found" });
      res.json(snapshot);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/snapshots", requireAuth, async (req: Request, res: Response) => {
    try {
      const { jobId } = req.body;
      if (!jobId) return res.status(400).json({ message: "jobId is required" });
      const job = await storage.getJob(jobId);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const circuit = await storage.getCircuit(job.circuitId);
      const backend = await storage.getBackend(job.backendId);
      const snapshot = await storage.createSnapshot({
        userId: req.session.userId!,
        jobId: job.id,
        circuitId: job.circuitId,
        backendId: job.backendId,
        code: circuit?.qasm || undefined,
        framework: "openqasm",
        algorithmConfig: { algorithmType: job.algorithmType, shots: job.shots, parameters: job.parameters },
        sdkVersions: { platform: "1.0.0" },
        notes: `Snapshot of job ${job.id} on ${backend?.name || "unknown backend"}`,
      });
      res.status(201).json(snapshot);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/snapshots/:id/rerun", requireAuth, async (req: Request, res: Response) => {
    try {
      const snapshot = await storage.getSnapshot(req.params.id);
      if (!snapshot) return res.status(404).json({ message: "Snapshot not found" });
      const backendId = req.body.backendId || snapshot.backendId;
      const config = snapshot.algorithmConfig as any || {};
      const shots = config.shots || 1024;
      const estimatedCost = shots * 0.001;
      const balance = await storage.getCreditBalance(req.session.userId!);
      if (balance < estimatedCost) return res.status(402).json({ message: "Insufficient credits" });
      const job = await storage.createJob({
        userId: req.session.userId!,
        circuitId: snapshot.circuitId,
        backendId,
        algorithmType: (config.algorithmType || "raw_circuit") as any,
        shots,
        creditsUsed: estimatedCost,
      });
      await storage.updateCreditBalance(req.session.userId!, -estimatedCost);
      simulateQuantumJob(job.id, shots, config.algorithmType || "raw_circuit").catch(err => {
        storage.updateJobStatus(job.id, "failed", err.message).catch(() => {});
      });
      res.status(201).json(job);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/templates", async (req: Request, res: Response) => {
    try {
      const domain = req.query.domain as string | undefined;
      if (domain) {
        res.json(await storage.getDomainTemplatesByDomain(domain));
      } else {
        res.json(await storage.getAllDomainTemplates());
      }
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/templates/:id", async (req: Request, res: Response) => {
    try {
      const template = await storage.getDomainTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/templates/:id/run", requireAuth, async (req: Request, res: Response) => {
    try {
      const template = await storage.getDomainTemplate(req.params.id);
      if (!template) return res.status(404).json({ message: "Template not found" });
      const { params, backendId, shots: reqShots } = req.body;
      if (!backendId) return res.status(400).json({ message: "backendId is required" });
      const shots = reqShots || 1024;
      const mergedParams = { ...(template.defaultParams as any || {}), ...(params || {}) };
      const templateCircuit = template.circuitTemplate as any || {};
      const numQubits = templateCircuit.qubits || 4;
      let qasm = `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[${numQubits}];\ncreg c[${numQubits}];\n`;
      for (let i = 0; i < numQubits; i++) qasm += `h q[${i}];\n`;
      if (template.algorithmType === "qaoa") {
        for (let i = 0; i < numQubits - 1; i++) qasm += `cx q[${i}],q[${i+1}];\nrz(0.5) q[${i+1}];\ncx q[${i}],q[${i+1}];\n`;
        for (let i = 0; i < numQubits; i++) qasm += `rx(0.5) q[${i}];\n`;
      } else if (template.algorithmType === "vqe") {
        for (let i = 0; i < numQubits; i++) qasm += `ry(0.5) q[${i}];\n`;
        for (let i = 0; i < numQubits - 1; i++) qasm += `cx q[${i}],q[${i+1}];\n`;
      }
      for (let i = 0; i < numQubits; i++) qasm += `measure q[${i}] -> c[${i}];\n`;
      const circuit = await storage.createCircuit({
        name: `${template.name} Circuit`,
        description: `Generated from template: ${template.name}`,
        userId: req.session.userId!,
        qasm,
        circuitData: mergedParams,
        tags: template.tags || [template.domain, template.algorithmType],
        visibility: "private" as const,
      });
      const estimatedCost = shots * 0.001;
      const balance = await storage.getCreditBalance(req.session.userId!);
      if (balance < estimatedCost) return res.status(402).json({ message: "Insufficient credits" });
      const job = await storage.createJob({
        userId: req.session.userId!,
        circuitId: circuit.id,
        backendId,
        algorithmType: template.algorithmType as any,
        shots,
        creditsUsed: estimatedCost,
      });
      await storage.updateCreditBalance(req.session.userId!, -estimatedCost);
      simulateQuantumJob(job.id, shots, template.algorithmType).catch(err => {
        storage.updateJobStatus(job.id, "failed", err.message).catch(() => {});
      });
      let baseline = null;
      if (template.domain === "finance" || template.domain === "optimization") {
        baseline = await storage.createClassicalBaseline({
          jobId: job.id,
          templateId: template.id,
          algorithm: "classical_" + template.algorithmType,
          result: { optimalValue: Math.random() * 100, iterations: Math.floor(Math.random() * 1000) },
          accuracy: 0.85 + Math.random() * 0.1,
          executionTime: 0.5 + Math.random() * 2,
        });
      }
      res.status(201).json({ circuit, job, baseline });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/backends/recommend", requireAuth, async (req: Request, res: Response) => {
    try {
      const { qubitCount, algorithmType, compilationProfile } = req.body;
      if (!qubitCount) return res.status(400).json({ message: "qubitCount is required" });
      const allBackends = await storage.getAllBackends();
      const eligible = allBackends.filter(b => b.status === "online" && b.qubitCount >= qubitCount);
      const scored = eligible.map(b => {
        const props = b.properties as any || {};
        const errorRate = props.errorRate || 0.01;
        const queueScore = Math.max(0, 100 - b.queueDepth * 5);
        const errorScore = Math.max(0, 100 - errorRate * 10000);
        const qubitDiff = b.qubitCount - qubitCount;
        const qubitScore = Math.max(0, 100 - qubitDiff * 2);
        const total = queueScore * 0.4 + errorScore * 0.35 + qubitScore * 0.25;
        let rationale = `Queue: ${b.queueDepth} jobs, Error rate: ${errorRate}, ${b.qubitCount} qubits`;
        if (b.backendType === "simulator") rationale += ", Simulator (no queue delay)";
        return { backend: b, score: Math.round(total), rationale };
      });
      scored.sort((a, b) => b.score - a.score);
      res.json(scored.slice(0, 3));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/jobs/estimate", requireAuth, async (req: Request, res: Response) => {
    try {
      const { backendId, shots, algorithmType, compilationProfile, mitigationProfile } = req.body;
      if (!backendId || !shots) return res.status(400).json({ message: "backendId and shots are required" });
      const backend = await storage.getBackend(backendId);
      if (!backend) return res.status(404).json({ message: "Backend not found" });
      const props = backend.properties as any || {};
      const estimatedQueueTime = backend.queueDepth * 30;
      const isSimulator = backend.backendType === "simulator";
      const estimatedRunTime = isSimulator ? shots * 0.001 : shots * 0.01;
      const creditCost = shots * 0.001;
      const errorRate = props.errorRate || (isSimulator ? 0 : 0.01);
      let reliabilityScore = isSimulator ? 99 : Math.max(0, Math.round(100 - errorRate * 10000));
      if (mitigationProfile === "high_fidelity") reliabilityScore = Math.min(99, reliabilityScore + 10);
      else if (mitigationProfile === "balanced") reliabilityScore = Math.min(99, reliabilityScore + 5);
      let reliabilityLabel = "Low";
      if (reliabilityScore >= 90) reliabilityLabel = "High";
      else if (reliabilityScore >= 70) reliabilityLabel = "Medium";
      res.json({ estimatedQueueTime, estimatedRunTime, creditCost, reliabilityScore, reliabilityLabel });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/jobs/:id/manifest", requireAuth, async (req: Request, res: Response) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) return res.status(404).json({ message: "Job not found" });
      const circuit = await storage.getCircuit(job.circuitId);
      const backend = await storage.getBackend(job.backendId);
      const result = await storage.getJobResultByJobId(job.id);
      const manifest = {
        jobId: job.id,
        circuitId: job.circuitId,
        circuitName: circuit?.name,
        backendId: job.backendId,
        backendName: backend?.name,
        algorithmType: job.algorithmType,
        shots: job.shots,
        compilationProfile: job.compilationProfile,
        mitigationProfile: job.mitigationProfile,
        isTrustedRun: job.isTrustedRun,
        backendMode: job.backendMode,
        parameters: job.parameters,
        status: job.status,
        submittedAt: job.submittedAt,
        completedAt: job.completedAt,
        executionTime: result?.executionTime,
        measurements: result?.measurements,
      };
      const manifestJson = JSON.stringify(manifest, null, 2);
      const hash = createHash("sha256").update(manifestJson).digest("hex");
      res.json({ manifest, hash });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/jobs/:id/trajectory", requireAuth, async (req: Request, res: Response) => {
    try {
      const trajectories = await storage.getTrajectories(req.params.id);
      let summary: any = null;
      if (trajectories.length > 0) {
        const bestValue = Math.min(...trajectories.map(t => t.costValue));
        const totalIterations = trajectories.length;
        const halfBestIdx = trajectories.findIndex(t => t.costValue <= bestValue * 1.1);
        const convergenceSpeed = halfBestIdx >= 0 ? halfBestIdx : totalIterations;
        summary = { convergenceSpeed, bestValue, totalIterations };
      }
      res.json({ trajectories, summary });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/jobs/:id/diagnostics", requireAuth, async (req: Request, res: Response) => {
    try {
      let diagnostic = await storage.getJobDiagnostics(req.params.id);
      if (!diagnostic) {
        const job = await storage.getJob(req.params.id);
        if (job && job.status === "failed") {
          const circuit = await storage.getCircuit(job.circuitId);
          const backend = await storage.getBackend(job.backendId);
          const backendProps = backend?.properties as any || {};
          let category = "unknown";
          let cause = job.errorMessage || "Unknown error";
          const suggestions: string[] = [];
          if (cause.toLowerCase().includes("timeout")) {
            category = "timeout";
            suggestions.push("Try a backend with a shorter queue");
            suggestions.push("Reduce the number of shots");
          } else if (cause.toLowerCase().includes("memory") || cause.toLowerCase().includes("qubit")) {
            category = "resource";
            suggestions.push("Use a simulator with more qubits");
            suggestions.push("Simplify the circuit");
          } else {
            category = "execution";
            suggestions.push("Check circuit validity");
            suggestions.push("Try a different backend");
            suggestions.push("Contact support if the issue persists");
          }
          diagnostic = await storage.createJobDiagnostic({
            jobId: job.id,
            category,
            cause,
            suggestions,
            circuitProperties: circuit?.circuitData as any || null,
            backendMetadata: { name: backend?.name, type: backend?.backendType, errorRate: backendProps.errorRate },
          });
        }
      }
      res.json(diagnostic || null);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/courses", async (req: Request, res: Response) => {
    try {
      const allCourses = await storage.getAllCourses();
      const difficulty = req.query.difficulty as string | undefined;
      if (difficulty) {
        res.json(allCourses.filter(c => c.difficulty === difficulty));
      } else {
        res.json(allCourses);
      }
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/courses/:id", async (req: Request, res: Response) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const lessons = await storage.getLessonsByCourse(req.params.id);
      res.json({ ...course, lessons });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/courses", requireAuth, async (req: Request, res: Response) => {
    try {
      const { title, description, difficulty, category, tags } = req.body;
      if (!title || !difficulty) return res.status(400).json({ message: "title and difficulty are required" });
      const course = await storage.createCourse({
        title,
        description,
        instructorId: req.session.userId!,
        difficulty: difficulty as any,
        category,
        tags,
      });
      res.status(201).json(course);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/courses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const course = await storage.getCourse(req.params.id);
      if (!course) return res.status(404).json({ message: "Course not found" });
      const updated = await storage.updateCourse(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/courses/:id/lessons", requireAuth, async (req: Request, res: Response) => {
    try {
      const { title, content, sortOrder, labId, circuitId } = req.body;
      if (!title) return res.status(400).json({ message: "title is required" });
      const lesson = await storage.createLesson({
        courseId: req.params.id,
        title,
        content,
        sortOrder,
        labId,
        circuitId,
      });
      res.status(201).json(lesson);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/courses/:id/enroll", requireAuth, async (req: Request, res: Response) => {
    try {
      const enrollment = await storage.getEnrollment(req.params.id, req.session.userId!);
      res.json(enrollment || null);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/courses/:id/enroll", requireAuth, async (req: Request, res: Response) => {
    try {
      const existing = await storage.getEnrollment(req.params.id, req.session.userId!);
      if (existing) return res.status(409).json({ message: "Already enrolled" });
      const enrollment = await storage.createEnrollment({
        courseId: req.params.id,
        userId: req.session.userId!,
        role: "student" as const,
        progress: 0,
        completedLessons: [],
      });
      res.status(201).json(enrollment);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/courses/:id/progress", requireAuth, async (req: Request, res: Response) => {
    try {
      const { progress, completedLessons } = req.body;
      const enrollment = await storage.getEnrollment(req.params.id, req.session.userId!);
      if (!enrollment) return res.status(404).json({ message: "Enrollment not found" });
      const updated = await storage.updateEnrollmentProgress(enrollment.id, progress, completedLessons);
      res.json(updated);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/gallery", async (req: Request, res: Response) => {
    try {
      const all = await storage.getAllPublicExperiments();
      const tags = req.query.tags as string | undefined;
      if (tags) {
        const tagList = tags.split(",").map(t => t.trim());
        res.json(all.filter(e => e.tags?.some(t => tagList.includes(t))));
      } else {
        res.json(all);
      }
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/gallery/:id", async (req: Request, res: Response) => {
    try {
      const experiment = await storage.getPublicExperiment(req.params.id);
      if (!experiment) return res.status(404).json({ message: "Experiment not found" });
      res.json(experiment);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/gallery", requireAuth, async (req: Request, res: Response) => {
    try {
      const { circuitId, jobId, snapshotId, title, description, tags } = req.body;
      if (!title) return res.status(400).json({ message: "title is required" });
      const experiment = await storage.createPublicExperiment({
        userId: req.session.userId!,
        circuitId,
        jobId,
        snapshotId,
        title,
        description,
        tags,
      });
      res.status(201).json(experiment);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/gallery/:id/like", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.incrementPublicExperimentLikes(req.params.id);
      const experiment = await storage.getPublicExperiment(req.params.id);
      res.json(experiment);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/gallery/:id/fork", requireAuth, async (req: Request, res: Response) => {
    try {
      const experiment = await storage.getPublicExperiment(req.params.id);
      if (!experiment) return res.status(404).json({ message: "Experiment not found" });
      await storage.incrementPublicExperimentForks(req.params.id);
      if (experiment.circuitId) {
        const originalCircuit = await storage.getCircuit(experiment.circuitId);
        if (originalCircuit) {
          const forkedCircuit = await storage.createCircuit({
            name: `${originalCircuit.name} (forked)`,
            description: originalCircuit.description,
            userId: req.session.userId!,
            qasm: originalCircuit.qasm,
            circuitData: originalCircuit.circuitData,
            tags: originalCircuit.tags,
            visibility: "private" as const,
            parentId: originalCircuit.id,
          });
          return res.status(201).json(forkedCircuit);
        }
      }
      res.json({ message: "Forked successfully" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/org/policies", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) return res.status(404).json({ message: "No organization found" });
      const org = await storage.getOrganization(user.organizationId);
      if (!org) return res.status(404).json({ message: "Organization not found" });
      res.json({
        allowedBackends: org.allowedBackends,
        allowedAlgorithms: org.allowedAlgorithms,
        maxJobsPerDay: org.maxJobsPerDay,
        maxConcurrentJobs: org.maxConcurrentJobs,
        maxCredits: org.maxCredits,
        plan: org.plan,
      });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/org/policies", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) return res.status(404).json({ message: "No organization found" });
      const { allowedBackends, allowedAlgorithms, maxJobsPerDay, maxConcurrentJobs, maxCredits } = req.body;
      const updateData: any = {};
      if (allowedBackends !== undefined) updateData.allowedBackends = allowedBackends;
      if (allowedAlgorithms !== undefined) updateData.allowedAlgorithms = allowedAlgorithms;
      if (maxJobsPerDay !== undefined) updateData.maxJobsPerDay = maxJobsPerDay;
      if (maxConcurrentJobs !== undefined) updateData.maxConcurrentJobs = maxConcurrentJobs;
      if (maxCredits !== undefined) updateData.maxCredits = maxCredits;
      const { db } = await import("./storage");
      const { organizations } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db.update(organizations).set(updateData).where(eq(organizations.id, user.organizationId)).returning();
      res.json(updated);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/org/usage", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) return res.status(404).json({ message: "No organization found" });
      res.json(await storage.getOrgUsageEvents(user.organizationId));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/org/analytics", requireAuth, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.organizationId) return res.status(404).json({ message: "No organization found" });
      res.json(await storage.getAnalyticsSnapshots(user.organizationId));
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/qnet/experiments", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getNetworkExperimentsByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/qnet/experiments/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const experiment = await storage.getNetworkExperiment(req.params.id);
      if (!experiment) return res.status(404).json({ message: "Network experiment not found" });
      const nodes = await storage.getNetworkNodes(req.params.id);
      const channels = await storage.getNetworkChannels(req.params.id);
      res.json({ ...experiment, nodes, channels });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/qnet/experiments", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, description, protocol, topology } = req.body;
      if (!name || !protocol) return res.status(400).json({ message: "name and protocol are required" });
      const experiment = await storage.createNetworkExperiment({
        userId: req.session.userId!,
        name,
        description,
        protocol: protocol as any,
        topology,
        status: "draft",
      });
      res.status(201).json(experiment);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.patch("/api/qnet/experiments/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const experiment = await storage.getNetworkExperiment(req.params.id);
      if (!experiment) return res.status(404).json({ message: "Network experiment not found" });
      const updated = await storage.updateNetworkExperiment(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/qnet/experiments/:id/run", requireAuth, async (req: Request, res: Response) => {
    try {
      const experiment = await storage.getNetworkExperiment(req.params.id);
      if (!experiment) return res.status(404).json({ message: "Network experiment not found" });
      let results: any = {};
      if (experiment.protocol === "teleportation") {
        results = {
          fidelity: 0.85 + Math.random() * 0.14,
          successProbability: 0.9 + Math.random() * 0.09,
          bellPairConsumption: Math.floor(Math.random() * 10) + 1,
          totalTime: Math.random() * 100,
        };
      } else if (experiment.protocol === "qkd") {
        results = {
          keyRate: 1000 + Math.floor(Math.random() * 9000),
          qber: Math.random() * 0.11,
          secureKeyLength: Math.floor(Math.random() * 256) + 64,
          protocol: "BB84",
        };
      } else if (experiment.protocol === "entanglement_swapping") {
        results = {
          fidelity: 0.7 + Math.random() * 0.25,
          successProbability: 0.5 + Math.random() * 0.4,
          swapDepth: Math.floor(Math.random() * 5) + 1,
          endToEndEntanglement: Math.random() > 0.3,
        };
      }
      const updated = await storage.updateNetworkExperiment(req.params.id, {
        results,
        status: "completed",
      } as any);
      res.json(updated);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/qnet/experiments/:id/nodes", requireAuth, async (req: Request, res: Response) => {
    try {
      const { name, nodeType, properties } = req.body;
      if (!name) return res.status(400).json({ message: "name is required" });
      const node = await storage.createNetworkNode({
        experimentId: req.params.id,
        name,
        nodeType,
        properties,
      });
      res.status(201).json(node);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/qnet/experiments/:id/channels", requireAuth, async (req: Request, res: Response) => {
    try {
      const { sourceNodeId, targetNodeId, protocol, properties } = req.body;
      if (!sourceNodeId || !targetNodeId || !protocol) return res.status(400).json({ message: "sourceNodeId, targetNodeId, and protocol are required" });
      const channel = await storage.createNetworkChannel({
        experimentId: req.params.id,
        sourceNodeId,
        targetNodeId,
        protocol: protocol as any,
        properties,
      });
      res.status(201).json(channel);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/tokens", requireAuth, async (req: Request, res: Response) => {
    try { res.json(await storage.getTokensByUser(req.session.userId!)); }
    catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.post("/api/tokens/issue", requireAuth, async (req: Request, res: Response) => {
    try {
      const { tokenType, payload, expiresInHours } = req.body;
      if (!tokenType) return res.status(400).json({ message: "tokenType is required" });
      const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : undefined;
      const token = await storage.createToken({
        userId: req.session.userId!,
        tokenType,
        payload,
      });
      if (expiresAt) {
        const { db } = await import("./storage");
        const { quantumTokens } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(quantumTokens).set({ expiresAt }).where(eq(quantumTokens.id, token.id));
        token.expiresAt = expiresAt;
      }
      res.status(201).json(token);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.get("/api/tokens/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const token = await storage.getToken(req.params.id);
      if (!token) return res.status(404).json({ message: "Token not found" });
      res.json(token);
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  app.delete("/api/tokens/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.revokeToken(req.params.id);
      res.json({ message: "Token revoked" });
    } catch (error: any) { res.status(500).json({ message: error.message }); }
  });

  return httpServer;
}
