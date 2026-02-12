import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Rocket,
  CircuitBoard,
  Code,
  Server,
  Brain,
  Library,
} from "lucide-react";

const sections = [
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "circuit-design", label: "Circuit Design", icon: CircuitBoard },
  { id: "api-reference", label: "API Reference", icon: Code },
  { id: "backends", label: "Backends", icon: Server },
  { id: "algorithms", label: "Algorithms", icon: Brain },
  { id: "sdk-libraries", label: "SDK & Libraries", icon: Library },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-muted rounded-md p-4 overflow-x-auto text-sm font-mono" data-testid="code-block">
      <code>{children}</code>
    </pre>
  );
}

function GettingStarted() {
  return (
    <div className="space-y-4">
      <Card data-testid="card-doc-getting-started">
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Welcome to QuantumCloud. Follow these steps to run your first quantum circuit.</p>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold">1. Create an Account</h3>
            <p className="text-muted-foreground">Register for a QuantumCloud account. Every new account receives 11 minutes (660 seconds) of free compute credits.</p>

            <h3 className="text-lg font-semibold">2. Design Your Circuit</h3>
            <p className="text-muted-foreground">Use the Circuit Composer to visually design quantum circuits, or upload an OpenQASM file directly.</p>

            <h3 className="text-lg font-semibold">3. Select a Backend</h3>
            <p className="text-muted-foreground">Choose from simulators for development or real quantum hardware for production workloads.</p>

            <h3 className="text-lg font-semibold">4. Submit and Monitor</h3>
            <p className="text-muted-foreground">Submit your job, monitor its progress, and view results with interactive visualizations.</p>
          </div>

          <h3 className="text-lg font-semibold mt-6">API Quick Start</h3>
          <p className="text-muted-foreground">You can also interact programmatically using your API key:</p>
          <CodeBlock>{`curl -X POST https://api.quantumcloud.io/v1/jobs \\
  -H "Authorization: Bearer qc_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "circuit_id": "your-circuit-id",
    "backend_id": "qiskit-aer-simulator",
    "shots": 1024,
    "algorithm_type": "raw_circuit"
  }'`}</CodeBlock>
        </CardContent>
      </Card>
    </div>
  );
}

function CircuitDesign() {
  return (
    <div className="space-y-4">
      <Card data-testid="card-doc-circuit-design">
        <CardHeader>
          <CardTitle>Circuit Composer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>The Circuit Composer provides a visual drag-and-drop interface for building quantum circuits.</p>

          <h3 className="text-lg font-semibold">Available Gates</h3>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Single-Qubit Gates</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {["H", "X", "Y", "Z", "S", "T", "SX"].map((g) => (
                  <Badge key={g} variant="secondary" data-testid={`badge-gate-${g}`}>{g}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Standard Pauli gates, Hadamard, and phase gates for single-qubit operations.</p>
            </div>

            <div>
              <h4 className="font-medium">Rotation Gates</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {["RX", "RY", "RZ"].map((g) => (
                  <Badge key={g} variant="secondary" data-testid={`badge-gate-${g}`}>{g}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Parameterized rotation gates around X, Y, and Z axes.</p>
            </div>

            <div>
              <h4 className="font-medium">Multi-Qubit Gates</h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {["CNOT", "CZ", "SWAP", "CCX"].map((g) => (
                  <Badge key={g} variant="secondary" data-testid={`badge-gate-${g}`}>{g}</Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Controlled gates and swap operations for multi-qubit entanglement.</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-4">OpenQASM Export</h3>
          <p className="text-muted-foreground">Circuits can be exported as OpenQASM 2.0:</p>
          <CodeBlock>{`OPENQASM 2.0;
include "qelib1.inc";
qreg q[2];
creg c[2];
h q[0];
cx q[0],q[1];
measure q[0] -> c[0];
measure q[1] -> c[1];`}</CodeBlock>
        </CardContent>
      </Card>
    </div>
  );
}

function ApiReference() {
  return (
    <div className="space-y-4">
      <Card data-testid="card-doc-api-reference">
        <CardHeader>
          <CardTitle>REST API Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>All API endpoints require authentication via API key or session cookie.</p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Authentication</h3>
              <CodeBlock>{`# Login
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}

# Get current user
GET /api/auth/me
Authorization: Bearer qc_your_api_key`}</CodeBlock>
            </div>

            <div>
              <h3 className="font-semibold">Circuits</h3>
              <CodeBlock>{`# List circuits
GET /api/circuits

# Create circuit
POST /api/circuits
{
  "name": "Bell State",
  "description": "Bell state preparation",
  "qasm": "OPENQASM 2.0; ...",
  "tags": ["entanglement"],
  "visibility": "private"
}

# Get circuit by ID
GET /api/circuits/:id

# Update circuit
PATCH /api/circuits/:id

# Delete circuit
DELETE /api/circuits/:id`}</CodeBlock>
            </div>

            <div>
              <h3 className="font-semibold">Jobs</h3>
              <CodeBlock>{`# Submit a job
POST /api/jobs
{
  "circuitId": "circuit-uuid",
  "backendId": "backend-uuid",
  "algorithmType": "raw_circuit",
  "shots": 1024
}

# List jobs
GET /api/jobs

# Get job details
GET /api/jobs/:id

# Get job results
GET /api/results/:jobId`}</CodeBlock>
            </div>

            <div>
              <h3 className="font-semibold">Backends</h3>
              <CodeBlock>{`# List available backends
GET /api/backends

# Get backend details
GET /api/backends/:id`}</CodeBlock>
            </div>

            <div>
              <h3 className="font-semibold">API Keys</h3>
              <CodeBlock>{`# List API keys
GET /api/keys

# Generate new key
POST /api/keys
{ "label": "My Key" }

# Revoke key
DELETE /api/keys/:id`}</CodeBlock>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BackendsDoc() {
  return (
    <div className="space-y-4">
      <Card data-testid="card-doc-backends">
        <CardHeader>
          <CardTitle>Quantum Backends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>QuantumCloud connects to multiple quantum hardware providers and simulators.</p>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold flex flex-wrap items-center gap-2">IBM Quantum <Badge variant="outline">Superconducting</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">Access IBM Eagle (127 qubits), Heron (133 qubits), and other processors. Heavy-hex connectivity topology with gate sets including CX, RZ, SX, and X.</p>
            </div>

            <div>
              <h3 className="font-semibold flex flex-wrap items-center gap-2">Quantinuum <Badge variant="outline">Trapped Ion</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">H1-1 (20 qubits) and H2-1 (56 qubits) with all-to-all connectivity. Industry-leading quantum volume of 524,288.</p>
            </div>

            <div>
              <h3 className="font-semibold flex flex-wrap items-center gap-2">Rigetti <Badge variant="outline">Superconducting</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">Ankaa-3 (84 qubits) with square-octagon connectivity. Native CZ and XY gates.</p>
            </div>

            <div>
              <h3 className="font-semibold flex flex-wrap items-center gap-2">IQM <Badge variant="outline">Superconducting</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">Garnet (20 qubits) with square-lattice topology. Supports MOVE gate for qubit shuttling.</p>
            </div>

            <div>
              <h3 className="font-semibold flex flex-wrap items-center gap-2">Pasqal / QuEra <Badge variant="outline">Neutral Atom</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">Programmable atom arrays with up to 256 qubits (QuEra Aquila). Supports analog and digital quantum computing modes.</p>
            </div>

            <div>
              <h3 className="font-semibold flex flex-wrap items-center gap-2">AWS Braket <Badge variant="outline">Cloud Simulators</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">State vector (SV1, 34 qubits), density matrix (DM1, 17 qubits), and tensor network (TN1, 50 qubits) simulators.</p>
            </div>

            <div>
              <h3 className="font-semibold flex flex-wrap items-center gap-2">Local Simulators <Badge variant="outline">Software</Badge></h3>
              <p className="text-sm text-muted-foreground mt-1">Qiskit Aer noiseless (32 qubits) and noise simulators (24 qubits). PennyLane Default and Lightning backends with differentiable simulation support.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AlgorithmsDoc() {
  return (
    <div className="space-y-4">
      <Card data-testid="card-doc-algorithms">
        <CardHeader>
          <CardTitle>Quantum Algorithms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold">Variational Quantum Eigensolver (VQE)</h3>
            <p className="text-sm text-muted-foreground mt-1">A hybrid quantum-classical algorithm for finding ground state energies of molecular Hamiltonians. Uses parameterized circuits with classical optimization loops.</p>
            <CodeBlock>{`from qiskit.algorithms import VQE
from qiskit.circuit.library import EfficientSU2
from qiskit.primitives import Estimator

ansatz = EfficientSU2(num_qubits=4, reps=2)
estimator = Estimator()
vqe = VQE(estimator, ansatz, optimizer=COBYLA())
result = vqe.compute_minimum_eigenvalue(hamiltonian)`}</CodeBlock>
          </div>

          <div>
            <h3 className="font-semibold">Quantum Approximate Optimization Algorithm (QAOA)</h3>
            <p className="text-sm text-muted-foreground mt-1">Designed for combinatorial optimization problems like MaxCut. Alternates between cost and mixer unitaries with tunable parameters.</p>
            <CodeBlock>{`from qiskit.algorithms import QAOA
from qiskit.algorithms.optimizers import COBYLA

qaoa = QAOA(
    sampler=sampler,
    optimizer=COBYLA(),
    reps=3
)
result = qaoa.compute_minimum_eigenvalue(cost_operator)`}</CodeBlock>
          </div>

          <div>
            <h3 className="font-semibold">Quantum Machine Learning (QML)</h3>
            <p className="text-sm text-muted-foreground mt-1">Leverage quantum feature maps and variational classifiers for machine learning tasks. PennyLane provides automatic differentiation for quantum circuits.</p>
            <CodeBlock>{`import pennylane as qml
from pennylane import numpy as np

dev = qml.device("default.qubit", wires=4)

@qml.qnode(dev)
def circuit(params, x):
    qml.AngleEmbedding(x, wires=range(4))
    qml.StronglyEntanglingLayers(params, wires=range(4))
    return qml.expval(qml.PauliZ(0))`}</CodeBlock>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SdkLibraries() {
  return (
    <div className="space-y-4">
      <Card data-testid="card-doc-sdk">
        <CardHeader>
          <CardTitle>SDK & Libraries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold flex flex-wrap items-center gap-2">Qiskit <Badge variant="secondary">IBM</Badge></h3>
            <p className="text-sm text-muted-foreground mt-1">Full-stack quantum SDK for circuit design, simulation, and execution on IBM hardware.</p>
            <CodeBlock>{`pip install qiskit qiskit-aer

from qiskit import QuantumCircuit

qc = QuantumCircuit(2, 2)
qc.h(0)
qc.cx(0, 1)
qc.measure_all()

# Submit to QuantumCloud
from quantumcloud import Client
client = Client(api_key="qc_your_key")
job = client.run(qc, backend="ibm_eagle_r3", shots=1024)`}</CodeBlock>
          </div>

          <div>
            <h3 className="font-semibold flex flex-wrap items-center gap-2">Cirq <Badge variant="secondary">Google</Badge></h3>
            <p className="text-sm text-muted-foreground mt-1">Framework for creating, editing, and invoking noisy intermediate-scale quantum (NISQ) circuits.</p>
            <CodeBlock>{`pip install cirq

import cirq

qubits = cirq.LineQubit.range(2)
circuit = cirq.Circuit([
    cirq.H(qubits[0]),
    cirq.CNOT(qubits[0], qubits[1]),
    cirq.measure(*qubits, key='result')
])

print(circuit)`}</CodeBlock>
          </div>

          <div>
            <h3 className="font-semibold flex flex-wrap items-center gap-2">PennyLane <Badge variant="secondary">Xanadu</Badge></h3>
            <p className="text-sm text-muted-foreground mt-1">Cross-platform library for differentiable quantum computing, quantum machine learning, and quantum chemistry.</p>
            <CodeBlock>{`pip install pennylane

import pennylane as qml

dev = qml.device("default.qubit", wires=2)

@qml.qnode(dev)
def bell_state():
    qml.Hadamard(wires=0)
    qml.CNOT(wires=[0, 1])
    return qml.probs(wires=[0, 1])

print(bell_state())  # [0.5, 0., 0., 0.5]`}</CodeBlock>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const sectionComponents: Record<string, () => JSX.Element> = {
  "getting-started": GettingStarted,
  "circuit-design": CircuitDesign,
  "api-reference": ApiReference,
  "backends": BackendsDoc,
  "algorithms": AlgorithmsDoc,
  "sdk-libraries": SdkLibraries,
};

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const ActiveComponent = sectionComponents[activeSection];

  return (
    <div className="flex flex-col h-full" data-testid="page-documentation">
      <div className="p-6 pb-0">
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Documentation</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">Learn how to use the QuantumCloud platform</p>
      </div>

      <div className="flex flex-1 min-h-0 p-6 gap-4">
        <Card className="w-56 flex-shrink-0" data-testid="card-doc-nav">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                      activeSection === section.id
                        ? "bg-accent font-medium"
                        : "hover-elevate"
                    }`}
                    data-testid={`button-nav-${section.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        <div className="flex-1 min-w-0">
          <ScrollArea className="h-full">
            <ActiveComponent />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}