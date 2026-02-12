import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Save,
  FileCode,
  Play,
  Copy,
} from "lucide-react";
import type { Backend } from "@shared/schema";

interface GateInstance {
  id: string;
  gate: string;
  qubit: number;
  step: number;
  controlQubit?: number;
  params?: { angle?: number };
  color: string;
}

interface CircuitState {
  qubits: number;
  steps: number;
  gates: GateInstance[];
  name: string;
  description: string;
}

interface GateDefinition {
  name: string;
  label: string;
  color: string;
  category: string;
  multiQubit?: boolean;
  hasParams?: boolean;
}

const GATE_DEFINITIONS: GateDefinition[] = [
  { name: "H", label: "H", color: "#3b82f6", category: "single" },
  { name: "X", label: "X", color: "#ef4444", category: "single" },
  { name: "Y", label: "Y", color: "#22c55e", category: "single" },
  { name: "Z", label: "Z", color: "#a855f7", category: "single" },
  { name: "S", label: "S", color: "#f97316", category: "single" },
  { name: "T", label: "T", color: "#06b6d4", category: "single" },
  { name: "SX", label: "SX", color: "#f43f5e", category: "single" },
  { name: "SDG", label: "S\u2020", color: "#fb923c", category: "single" },
  { name: "TDG", label: "T\u2020", color: "#67e8f9", category: "single" },
  { name: "RX", label: "RX", color: "#7dd3fc", category: "rotation", hasParams: true },
  { name: "RY", label: "RY", color: "#86efac", category: "rotation", hasParams: true },
  { name: "RZ", label: "RZ", color: "#c4b5fd", category: "rotation", hasParams: true },
  { name: "CNOT", label: "CX", color: "#f59e0b", category: "multi", multiQubit: true },
  { name: "CZ", label: "CZ", color: "#14b8a6", category: "multi", multiQubit: true },
  { name: "SWAP", label: "SW", color: "#ec4899", category: "multi", multiQubit: true },
  { name: "CCX", label: "CCX", color: "#d946ef", category: "multi", multiQubit: true },
  { name: "CRX", label: "CRX", color: "#0ea5e9", category: "controlled", multiQubit: true, hasParams: true },
  { name: "CRY", label: "CRY", color: "#10b981", category: "controlled", multiQubit: true, hasParams: true },
  { name: "CRZ", label: "CRZ", color: "#8b5cf6", category: "controlled", multiQubit: true, hasParams: true },
  { name: "M", label: "M", color: "#6b7280", category: "measurement" },
];

const CATEGORIES = [
  { id: "single", label: "Single Qubit Gates" },
  { id: "rotation", label: "Rotation Gates" },
  { id: "multi", label: "Multi-Qubit Gates" },
  { id: "controlled", label: "Controlled Rotations" },
  { id: "measurement", label: "Measurement" },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function generateQASM(circuit: CircuitState): string {
  const lines: string[] = [
    "OPENQASM 2.0;",
    'include "qelib1.inc";',
    `qreg q[${circuit.qubits}];`,
    `creg c[${circuit.qubits}];`,
  ];

  const sorted = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit);

  for (const g of sorted) {
    const angle = g.params?.angle ?? Math.PI;
    switch (g.gate) {
      case "H":
        lines.push(`h q[${g.qubit}];`);
        break;
      case "X":
        lines.push(`x q[${g.qubit}];`);
        break;
      case "Y":
        lines.push(`y q[${g.qubit}];`);
        break;
      case "Z":
        lines.push(`z q[${g.qubit}];`);
        break;
      case "S":
        lines.push(`s q[${g.qubit}];`);
        break;
      case "T":
        lines.push(`t q[${g.qubit}];`);
        break;
      case "SX":
        lines.push(`sx q[${g.qubit}];`);
        break;
      case "SDG":
        lines.push(`sdg q[${g.qubit}];`);
        break;
      case "TDG":
        lines.push(`tdg q[${g.qubit}];`);
        break;
      case "RX":
        lines.push(`rx(${angle.toFixed(4)}) q[${g.qubit}];`);
        break;
      case "RY":
        lines.push(`ry(${angle.toFixed(4)}) q[${g.qubit}];`);
        break;
      case "RZ":
        lines.push(`rz(${angle.toFixed(4)}) q[${g.qubit}];`);
        break;
      case "CNOT":
        lines.push(`cx q[${g.controlQubit ?? 0}],q[${g.qubit}];`);
        break;
      case "CZ":
        lines.push(`cz q[${g.controlQubit ?? 0}],q[${g.qubit}];`);
        break;
      case "SWAP":
        lines.push(`swap q[${g.controlQubit ?? 0}],q[${g.qubit}];`);
        break;
      case "CCX":
        lines.push(`ccx q[${g.controlQubit ?? 0}],q[${(g.controlQubit ?? 0) + 1}],q[${g.qubit}];`);
        break;
      case "CRX":
        lines.push(`crx(${angle.toFixed(4)}) q[${g.controlQubit ?? 0}],q[${g.qubit}];`);
        break;
      case "CRY":
        lines.push(`cry(${angle.toFixed(4)}) q[${g.controlQubit ?? 0}],q[${g.qubit}];`);
        break;
      case "CRZ":
        lines.push(`crz(${angle.toFixed(4)}) q[${g.controlQubit ?? 0}],q[${g.qubit}];`);
        break;
      case "M":
        lines.push(`measure q[${g.qubit}] -> c[${g.qubit}];`);
        break;
    }
  }

  return lines.join("\n");
}

function generateQiskitCode(circuit: CircuitState): string {
  const lines: string[] = [
    "from qiskit import QuantumCircuit",
    "",
    `qc = QuantumCircuit(${circuit.qubits}, ${circuit.qubits})`,
    "",
  ];

  const sorted = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit);

  for (const g of sorted) {
    const angle = g.params?.angle ?? Math.PI;
    switch (g.gate) {
      case "H":
        lines.push(`qc.h(${g.qubit})`);
        break;
      case "X":
        lines.push(`qc.x(${g.qubit})`);
        break;
      case "Y":
        lines.push(`qc.y(${g.qubit})`);
        break;
      case "Z":
        lines.push(`qc.z(${g.qubit})`);
        break;
      case "S":
        lines.push(`qc.s(${g.qubit})`);
        break;
      case "T":
        lines.push(`qc.t(${g.qubit})`);
        break;
      case "SX":
        lines.push(`qc.sx(${g.qubit})`);
        break;
      case "SDG":
        lines.push(`qc.sdg(${g.qubit})`);
        break;
      case "TDG":
        lines.push(`qc.tdg(${g.qubit})`);
        break;
      case "RX":
        lines.push(`qc.rx(${angle.toFixed(4)}, ${g.qubit})`);
        break;
      case "RY":
        lines.push(`qc.ry(${angle.toFixed(4)}, ${g.qubit})`);
        break;
      case "RZ":
        lines.push(`qc.rz(${angle.toFixed(4)}, ${g.qubit})`);
        break;
      case "CNOT":
        lines.push(`qc.cx(${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "CZ":
        lines.push(`qc.cz(${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "SWAP":
        lines.push(`qc.swap(${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "CCX":
        lines.push(`qc.ccx(${g.controlQubit ?? 0}, ${(g.controlQubit ?? 0) + 1}, ${g.qubit})`);
        break;
      case "CRX":
        lines.push(`qc.crx(${angle.toFixed(4)}, ${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "CRY":
        lines.push(`qc.cry(${angle.toFixed(4)}, ${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "CRZ":
        lines.push(`qc.crz(${angle.toFixed(4)}, ${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "M":
        lines.push(`qc.measure(${g.qubit}, ${g.qubit})`);
        break;
    }
  }

  if (!sorted.some((g) => g.gate === "M")) {
    lines.push("");
    lines.push("qc.measure_all()");
  }

  return lines.join("\n");
}

function generateCirqCode(circuit: CircuitState): string {
  const lines: string[] = [
    "import cirq",
    "",
    `qubits = cirq.LineQubit.range(${circuit.qubits})`,
    "circuit = cirq.Circuit()",
    "",
  ];

  const sorted = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit);

  for (const g of sorted) {
    const angle = g.params?.angle ?? Math.PI;
    switch (g.gate) {
      case "H":
        lines.push(`circuit.append(cirq.H(qubits[${g.qubit}]))`);
        break;
      case "X":
        lines.push(`circuit.append(cirq.X(qubits[${g.qubit}]))`);
        break;
      case "Y":
        lines.push(`circuit.append(cirq.Y(qubits[${g.qubit}]))`);
        break;
      case "Z":
        lines.push(`circuit.append(cirq.Z(qubits[${g.qubit}]))`);
        break;
      case "S":
        lines.push(`circuit.append(cirq.S(qubits[${g.qubit}]))`);
        break;
      case "T":
        lines.push(`circuit.append(cirq.T(qubits[${g.qubit}]))`);
        break;
      case "SX":
        lines.push(`circuit.append(cirq.X(qubits[${g.qubit}])**0.5)`);
        break;
      case "SDG":
        lines.push(`circuit.append(cirq.S(qubits[${g.qubit}])**-1)`);
        break;
      case "TDG":
        lines.push(`circuit.append(cirq.T(qubits[${g.qubit}])**-1)`);
        break;
      case "RX":
        lines.push(`circuit.append(cirq.rx(${angle.toFixed(4)})(qubits[${g.qubit}]))`);
        break;
      case "RY":
        lines.push(`circuit.append(cirq.ry(${angle.toFixed(4)})(qubits[${g.qubit}]))`);
        break;
      case "RZ":
        lines.push(`circuit.append(cirq.rz(${angle.toFixed(4)})(qubits[${g.qubit}]))`);
        break;
      case "CNOT":
        lines.push(`circuit.append(cirq.CNOT(qubits[${g.controlQubit ?? 0}], qubits[${g.qubit}]))`);
        break;
      case "CZ":
        lines.push(`circuit.append(cirq.CZ(qubits[${g.controlQubit ?? 0}], qubits[${g.qubit}]))`);
        break;
      case "SWAP":
        lines.push(`circuit.append(cirq.SWAP(qubits[${g.controlQubit ?? 0}], qubits[${g.qubit}]))`);
        break;
      case "CCX":
        lines.push(`circuit.append(cirq.CCX(qubits[${g.controlQubit ?? 0}], qubits[${(g.controlQubit ?? 0) + 1}], qubits[${g.qubit}]))`);
        break;
      case "CRX":
        lines.push(`circuit.append(cirq.ControlledGate(cirq.rx(${angle.toFixed(4)}))(qubits[${g.controlQubit ?? 0}], qubits[${g.qubit}]))`);
        break;
      case "CRY":
        lines.push(`circuit.append(cirq.ControlledGate(cirq.ry(${angle.toFixed(4)}))(qubits[${g.controlQubit ?? 0}], qubits[${g.qubit}]))`);
        break;
      case "CRZ":
        lines.push(`circuit.append(cirq.ControlledGate(cirq.rz(${angle.toFixed(4)}))(qubits[${g.controlQubit ?? 0}], qubits[${g.qubit}]))`);
        break;
      case "M":
        lines.push(`circuit.append(cirq.measure(qubits[${g.qubit}], key='m${g.qubit}'))`);
        break;
    }
  }

  lines.push("");
  lines.push("print(circuit)");

  return lines.join("\n");
}

function generateCppCode(circuit: CircuitState): string {
  const lines: string[] = [
    "#include <iostream>",
    '#include "staq/qasmtools.hpp"',
    "",
    "int main() {",
    `    const int N = ${circuit.qubits};`,
    "",
  ];

  const sorted = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit);

  for (const g of sorted) {
    const angle = g.params?.angle ?? Math.PI;
    switch (g.gate) {
      case "H":
        lines.push(`    apply_gate("h", {${g.qubit}});`);
        break;
      case "X":
        lines.push(`    apply_gate("x", {${g.qubit}});`);
        break;
      case "Y":
        lines.push(`    apply_gate("y", {${g.qubit}});`);
        break;
      case "Z":
        lines.push(`    apply_gate("z", {${g.qubit}});`);
        break;
      case "S":
        lines.push(`    apply_gate("s", {${g.qubit}});`);
        break;
      case "T":
        lines.push(`    apply_gate("t", {${g.qubit}});`);
        break;
      case "SX":
        lines.push(`    apply_gate("sx", {${g.qubit}});`);
        break;
      case "SDG":
        lines.push(`    apply_gate("sdg", {${g.qubit}});`);
        break;
      case "TDG":
        lines.push(`    apply_gate("tdg", {${g.qubit}});`);
        break;
      case "RX":
        lines.push(`    apply_gate("rx", {${g.qubit}}, ${angle.toFixed(4)});`);
        break;
      case "RY":
        lines.push(`    apply_gate("ry", {${g.qubit}}, ${angle.toFixed(4)});`);
        break;
      case "RZ":
        lines.push(`    apply_gate("rz", {${g.qubit}}, ${angle.toFixed(4)});`);
        break;
      case "CNOT":
        lines.push(`    apply_gate("cx", {${g.controlQubit ?? 0}, ${g.qubit}});`);
        break;
      case "CZ":
        lines.push(`    apply_gate("cz", {${g.controlQubit ?? 0}, ${g.qubit}});`);
        break;
      case "SWAP":
        lines.push(`    apply_gate("swap", {${g.controlQubit ?? 0}, ${g.qubit}});`);
        break;
      case "CCX":
        lines.push(`    apply_gate("ccx", {${g.controlQubit ?? 0}, ${(g.controlQubit ?? 0) + 1}, ${g.qubit}});`);
        break;
      case "CRX":
        lines.push(`    apply_gate("crx", {${g.controlQubit ?? 0}, ${g.qubit}}, ${angle.toFixed(4)});`);
        break;
      case "CRY":
        lines.push(`    apply_gate("cry", {${g.controlQubit ?? 0}, ${g.qubit}}, ${angle.toFixed(4)});`);
        break;
      case "CRZ":
        lines.push(`    apply_gate("crz", {${g.controlQubit ?? 0}, ${g.qubit}}, ${angle.toFixed(4)});`);
        break;
      case "M":
        lines.push(`    measure(${g.qubit});`);
        break;
    }
  }

  lines.push("");
  lines.push("    return 0;");
  lines.push("}");

  return lines.join("\n");
}

function generateJavaCode(circuit: CircuitState): string {
  const lines: string[] = [
    "import org.redfx.strange.*;",
    "import org.redfx.strange.gate.*;",
    "",
    "public class QuantumCircuit {",
    "    public static void main(String[] args) {",
    `        Program program = new Program(${circuit.qubits});`,
    "",
  ];

  const stepMap = new Map<number, string[]>();
  const sorted = [...circuit.gates].sort((a, b) => a.step - b.step || a.qubit - b.qubit);

  for (const g of sorted) {
    if (!stepMap.has(g.step)) stepMap.set(g.step, []);
    const stepGates = stepMap.get(g.step)!;
    const angle = g.params?.angle ?? Math.PI;

    switch (g.gate) {
      case "H":
        stepGates.push(`new Hadamard(${g.qubit})`);
        break;
      case "X":
        stepGates.push(`new X(${g.qubit})`);
        break;
      case "Y":
        stepGates.push(`new Y(${g.qubit})`);
        break;
      case "Z":
        stepGates.push(`new Z(${g.qubit})`);
        break;
      case "S":
        stepGates.push(`new S(${g.qubit})`);
        break;
      case "T":
        stepGates.push(`new T(${g.qubit})`);
        break;
      case "SX":
        stepGates.push(`new SX(${g.qubit})`);
        break;
      case "SDG":
        stepGates.push(`new Sdg(${g.qubit})`);
        break;
      case "TDG":
        stepGates.push(`new Tdg(${g.qubit})`);
        break;
      case "RX":
        stepGates.push(`new Rx(${g.qubit}, ${angle.toFixed(4)})`);
        break;
      case "RY":
        stepGates.push(`new Ry(${g.qubit}, ${angle.toFixed(4)})`);
        break;
      case "RZ":
        stepGates.push(`new Rz(${g.qubit}, ${angle.toFixed(4)})`);
        break;
      case "CNOT":
        stepGates.push(`new Cnot(${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "CZ":
        stepGates.push(`new Cz(${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "SWAP":
        stepGates.push(`new Swap(${g.controlQubit ?? 0}, ${g.qubit})`);
        break;
      case "CCX":
        stepGates.push(`new Toffoli(${g.controlQubit ?? 0}, ${(g.controlQubit ?? 0) + 1}, ${g.qubit})`);
        break;
      case "CRX":
        stepGates.push(`new Crx(${g.controlQubit ?? 0}, ${g.qubit}, ${angle.toFixed(4)})`);
        break;
      case "CRY":
        stepGates.push(`new Cry(${g.controlQubit ?? 0}, ${g.qubit}, ${angle.toFixed(4)})`);
        break;
      case "CRZ":
        stepGates.push(`new Crz(${g.controlQubit ?? 0}, ${g.qubit}, ${angle.toFixed(4)})`);
        break;
      case "M":
        stepGates.push(`new Measurement(${g.qubit})`);
        break;
    }
  }

  Array.from(stepMap.entries()).forEach(([, gates]) => {
    lines.push(`        program.addStep(new Step(${gates.join(", ")}));`);
  });

  lines.push("");
  lines.push("        SimpleQuantumExecutionEnvironment sqee = new SimpleQuantumExecutionEnvironment();");
  lines.push("        Result result = sqee.runProgram(program);");
  lines.push("        Qubit[] qubits = result.getQubits();");
  lines.push("    }");
  lines.push("}");

  return lines.join("\n");
}

function BlochSphere({ theta, phi }: { theta: number; phi: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = 75;

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(128, 128, 128, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(128, 128, 128, 0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(128, 128, 128, 0.15)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.3, r, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(128, 128, 128, 0.4)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 10);
    ctx.lineTo(cx, cy + r + 10);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - r - 10, cy);
    ctx.lineTo(cx + r + 10, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.3 * Math.cos(Math.PI / 4), cy - r * 0.3 * Math.sin(Math.PI / 4));
    ctx.stroke();

    const fontSize = 10;
    ctx.font = `${fontSize}px monospace`;
    ctx.fillStyle = "rgba(128, 128, 128, 0.8)";
    ctx.textAlign = "center";

    ctx.fillText("|0\u27E9", cx + 12, cy - r - 12);
    ctx.fillText("|1\u27E9", cx + 12, cy + r + 16);
    ctx.fillText("|+\u27E9", cx + r + 14, cy + 4);
    ctx.fillText("|-\u27E9", cx - r - 14, cy + 4);
    ctx.fillText("|+i\u27E9", cx + r * 0.3 + 16, cy - r * 0.3 - 4);
    ctx.fillText("|-i\u27E9", cx - r * 0.3 - 16, cy + r * 0.3 + 10);

    const sx = Math.sin(theta) * Math.cos(phi);
    const sy = Math.sin(theta) * Math.sin(phi);
    const sz = Math.cos(theta);

    const projX = cx + r * (sx + sy * 0.3 * Math.cos(Math.PI / 4));
    const projY = cy - r * (sz - sy * 0.3 * Math.sin(Math.PI / 4));

    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(projX, projY);
    ctx.stroke();

    const arrowLen = 8;
    const dx = projX - cx;
    const dy = projY - cy;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      const ux = dx / mag;
      const uy = dy / mag;
      const perpX = -uy;
      const perpY = ux;
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.moveTo(projX, projY);
      ctx.lineTo(projX - arrowLen * ux + arrowLen * 0.4 * perpX, projY - arrowLen * uy + arrowLen * 0.4 * perpY);
      ctx.lineTo(projX - arrowLen * ux - arrowLen * 0.4 * perpX, projY - arrowLen * uy - arrowLen * 0.4 * perpY);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(projX, projY, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [theta, phi]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={200}
      className="mx-auto"
      data-testid="canvas-bloch-sphere"
    />
  );
}

function GatePalette({
  selectedGateDef,
  onSelectGate,
}: {
  selectedGateDef: GateDefinition | null;
  onSelectGate: (g: GateDefinition) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm">Gate Palette</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1">
        <ScrollArea className="h-full">
          {CATEGORIES.map((cat) => {
            const gates = GATE_DEFINITIONS.filter((g) => g.category === cat.id);
            const isCollapsed = collapsed[cat.id];
            return (
              <div key={cat.id} className="mb-3">
                <button
                  className="flex items-center gap-1 w-full text-left text-xs font-medium text-muted-foreground mb-1.5"
                  onClick={() => toggle(cat.id)}
                  data-testid={`button-toggle-${cat.id}`}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                  {cat.label}
                </button>
                {!isCollapsed && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {gates.map((g) => (
                      <button
                        key={g.name}
                        className={`flex items-center justify-center rounded-md text-xs font-bold text-white transition-all h-9 ${
                          selectedGateDef?.name === g.name
                            ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                            : ""
                        }`}
                        style={{ backgroundColor: g.color }}
                        onClick={() => onSelectGate(g)}
                        data-testid={`button-gate-${g.name}`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CircuitGrid({
  circuit,
  selectedGateId,
  selectedGateDef,
  onPlaceGate,
  onSelectGateInstance,
  onRemoveGate,
}: {
  circuit: CircuitState;
  selectedGateId: string | null;
  selectedGateDef: GateDefinition | null;
  onPlaceGate: (qubit: number, step: number) => void;
  onSelectGateInstance: (id: string | null) => void;
  onRemoveGate: (id: string) => void;
}) {
  const CELL_SIZE = 52;
  const LABEL_WIDTH = 56;
  const WIRE_Y_OFFSET = CELL_SIZE / 2;

  const getGateAt = useCallback(
    (qubit: number, step: number) =>
      circuit.gates.find(
        (g) =>
          (g.qubit === qubit && g.step === step) ||
          (g.controlQubit === qubit && g.step === step)
      ),
    [circuit.gates]
  );

  const handleCellClick = (qubit: number, step: number) => {
    const existing = getGateAt(qubit, step);
    if (existing) {
      onSelectGateInstance(existing.id);
    } else if (selectedGateDef) {
      onPlaceGate(qubit, step);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, qubit: number, step: number) => {
    e.preventDefault();
    const existing = getGateAt(qubit, step);
    if (existing) {
      onRemoveGate(existing.id);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedGateId) {
        onRemoveGate(selectedGateId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedGateId, onRemoveGate]);

  const multiQubitGates = circuit.gates.filter(
    (g) => g.controlQubit !== undefined
  );

  return (
    <Card className="flex-1 flex flex-col h-full">
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">Circuit</CardTitle>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Qubits: {circuit.qubits}</span>
          <span className="mx-1">|</span>
          <span>Steps: {circuit.steps}</span>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1 min-h-0">
        <ScrollArea className="h-full w-full">
          <div
            className="relative select-none"
            style={{
              width: LABEL_WIDTH + circuit.steps * CELL_SIZE + 8,
              height: circuit.qubits * CELL_SIZE + 8,
            }}
          >
            {Array.from({ length: circuit.qubits }).map((_, qi) => (
              <div
                key={`wire-${qi}`}
                className="absolute bg-border"
                style={{
                  left: LABEL_WIDTH,
                  top: qi * CELL_SIZE + WIRE_Y_OFFSET,
                  width: circuit.steps * CELL_SIZE,
                  height: 1,
                }}
              />
            ))}

            {Array.from({ length: circuit.qubits }).map((_, qi) => (
              <div
                key={`label-${qi}`}
                className="absolute flex items-center justify-end pr-2 text-xs font-mono text-muted-foreground"
                style={{
                  left: 0,
                  top: qi * CELL_SIZE,
                  width: LABEL_WIDTH,
                  height: CELL_SIZE,
                }}
                data-testid={`text-qubit-label-${qi}`}
              >
                |q{qi}&#x27E9;
              </div>
            ))}

            {Array.from({ length: circuit.qubits }).map((_, qi) =>
              Array.from({ length: circuit.steps }).map((_, si) => (
                <div
                  key={`cell-${qi}-${si}`}
                  className="absolute border border-dashed border-muted-foreground/15 cursor-pointer transition-colors"
                  style={{
                    left: LABEL_WIDTH + si * CELL_SIZE,
                    top: qi * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                  }}
                  onClick={() => handleCellClick(qi, si)}
                  onContextMenu={(e) => handleContextMenu(e, qi, si)}
                  data-testid={`cell-${qi}-${si}`}
                />
              ))
            )}

            {multiQubitGates.map((g) => {
              const targetY = g.qubit * CELL_SIZE + WIRE_Y_OFFSET;
              const controlY = (g.controlQubit ?? 0) * CELL_SIZE + WIRE_Y_OFFSET;
              const topY = Math.min(targetY, controlY);
              const height = Math.abs(targetY - controlY);
              return (
                <div
                  key={`link-${g.id}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: LABEL_WIDTH + g.step * CELL_SIZE + CELL_SIZE / 2 - 1,
                    top: topY,
                    width: 2,
                    height,
                    backgroundColor: g.color,
                  }}
                />
              );
            })}

            {circuit.gates.map((g) => {
              const def = GATE_DEFINITIONS.find((d) => d.name === g.gate);
              const isMulti = def?.multiQubit;
              const isSelected = selectedGateId === g.id;

              if (isMulti && g.controlQubit !== undefined) {
                return (
                  <div key={g.id}>
                    <div
                      className={`absolute flex items-center justify-center rounded-md text-[10px] font-bold text-white cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : ""
                      }`}
                      style={{
                        left: LABEL_WIDTH + g.step * CELL_SIZE + 6,
                        top: g.qubit * CELL_SIZE + 6,
                        width: CELL_SIZE - 12,
                        height: CELL_SIZE - 12,
                        backgroundColor: g.color,
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGateInstance(g.id);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemoveGate(g.id);
                      }}
                      data-testid={`gate-${g.id}`}
                    >
                      {g.gate === "CNOT" ? "\u2295" : (def?.label ?? g.gate)}
                    </div>
                    <div
                      className="absolute rounded-full cursor-pointer"
                      style={{
                        left:
                          LABEL_WIDTH +
                          g.step * CELL_SIZE +
                          CELL_SIZE / 2 -
                          6,
                        top:
                          (g.controlQubit ?? 0) * CELL_SIZE +
                          WIRE_Y_OFFSET -
                          6,
                        width: 12,
                        height: 12,
                        backgroundColor: g.color,
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectGateInstance(g.id);
                      }}
                      data-testid={`gate-control-${g.id}`}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={g.id}
                  className={`absolute flex items-center justify-center rounded-md text-[10px] font-bold text-white cursor-pointer transition-all ${
                    isSelected
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      : ""
                  }`}
                  style={{
                    left: LABEL_WIDTH + g.step * CELL_SIZE + 6,
                    top: g.qubit * CELL_SIZE + 6,
                    width: CELL_SIZE - 12,
                    height: CELL_SIZE - 12,
                    backgroundColor: g.color,
                    zIndex: 10,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectGateInstance(g.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemoveGate(g.id);
                  }}
                  data-testid={`gate-${g.id}`}
                >
                  {g.gate === "M" ? (
                    <span className="text-[14px]">&#x2316;</span>
                  ) : (
                    (def?.label ?? g.gate)
                  )}
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PropertiesPanel({
  circuit,
  setCircuit,
  selectedGate,
  onUpdateGate,
  onRemoveGate,
  onSave,
  isSaving,
  onExport,
  onSubmitJob,
  blochTheta,
  blochPhi,
}: {
  circuit: CircuitState;
  setCircuit: React.Dispatch<React.SetStateAction<CircuitState>>;
  selectedGate: GateInstance | null;
  onUpdateGate: (id: string, updates: Partial<GateInstance>) => void;
  onRemoveGate: (id: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onExport: () => void;
  onSubmitJob: () => void;
  blochTheta: number;
  blochPhi: number;
}) {
  const def = selectedGate
    ? GATE_DEFINITIONS.find((d) => d.name === selectedGate.gate)
    : null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm">Properties</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 flex-1 flex flex-col gap-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Bloch Sphere
          </label>
          <BlochSphere theta={blochTheta} phi={blochPhi} />
          <div className="text-[10px] text-muted-foreground text-center">
            {"\u03B8"}={((blochTheta / Math.PI) * 180).toFixed(0)}{"\u00B0"} {"\u03C6"}={((blochPhi / Math.PI) * 180).toFixed(0)}{"\u00B0"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Circuit Name
          </label>
          <Input
            value={circuit.name}
            onChange={(e) =>
              setCircuit((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="My Circuit"
            data-testid="input-circuit-name"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Description
          </label>
          <Textarea
            value={circuit.description}
            onChange={(e) =>
              setCircuit((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Describe your circuit..."
            className="min-h-[60px]"
            data-testid="input-circuit-description"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="no-default-hover-elevate">
            {circuit.qubits} qubits
          </Badge>
          <Badge variant="secondary" className="no-default-hover-elevate">
            {circuit.gates.length} gates
          </Badge>
        </div>

        {selectedGate && (
          <div className="space-y-2 border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground">
              Selected Gate
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center rounded-md text-xs font-bold text-white"
                style={{
                  backgroundColor: selectedGate.color,
                  width: 28,
                  height: 28,
                }}
              >
                {selectedGate.gate}
              </div>
              <div className="text-sm">
                <div className="font-medium">{selectedGate.gate}</div>
                <div className="text-xs text-muted-foreground">
                  q{selectedGate.qubit}, step {selectedGate.step}
                  {selectedGate.controlQubit !== undefined &&
                    ` (ctrl: q${selectedGate.controlQubit})`}
                </div>
              </div>
            </div>

            {def?.hasParams && (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Angle: {((selectedGate.params?.angle ?? Math.PI) / Math.PI).toFixed(2)}
                  {"\u03C0"} rad
                </label>
                <Slider
                  min={0}
                  max={2 * Math.PI}
                  step={0.01}
                  value={[selectedGate.params?.angle ?? Math.PI]}
                  onValueChange={([val]) =>
                    onUpdateGate(selectedGate.id, {
                      params: { angle: val },
                    })
                  }
                  data-testid="slider-gate-angle"
                />
              </div>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => onRemoveGate(selectedGate.id)}
              data-testid="button-delete-gate"
            >
              <Trash2 className="w-3 h-3" />
              Delete Gate
            </Button>
          </div>
        )}

        <div className="mt-auto space-y-2 border-t pt-3">
          <Button
            className="w-full"
            onClick={onSave}
            disabled={isSaving}
            data-testid="button-save-circuit"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Circuit"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onExport}
            data-testid="button-export-qasm"
          >
            <FileCode className="w-4 h-4" />
            Export Code
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={onSubmitJob}
            data-testid="button-submit-job"
          >
            <Play className="w-4 h-4" />
            Submit Job
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Composer() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [circuit, setCircuit] = useState<CircuitState>({
    qubits: 3,
    steps: 10,
    gates: [],
    name: "Untitled Circuit",
    description: "",
  });

  const [selectedGateDef, setSelectedGateDef] = useState<GateDefinition | null>(
    null
  );
  const [selectedGateId, setSelectedGateId] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLanguage, setExportLanguage] = useState("qasm");
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [jobShots, setJobShots] = useState(1024);
  const [jobBackendId, setJobBackendId] = useState("");
  const [blochTheta, setBlochTheta] = useState(0);
  const [blochPhi, setBlochPhi] = useState(0);

  const selectedGate =
    circuit.gates.find((g) => g.id === selectedGateId) ?? null;

  useEffect(() => {
    if (!selectedGate) {
      setBlochTheta(0);
      setBlochPhi(0);
      return;
    }
    const angle = selectedGate.params?.angle ?? Math.PI;
    switch (selectedGate.gate) {
      case "H":
        setBlochTheta(Math.PI / 4);
        setBlochPhi(0);
        break;
      case "X":
        setBlochTheta(Math.PI);
        setBlochPhi(0);
        break;
      case "Y":
        setBlochTheta(Math.PI);
        setBlochPhi(Math.PI / 2);
        break;
      case "Z":
        setBlochTheta(0);
        setBlochPhi(Math.PI);
        break;
      case "RX":
      case "CRX":
        setBlochTheta(angle);
        setBlochPhi(0);
        break;
      case "RY":
      case "CRY":
        setBlochTheta(angle);
        setBlochPhi(Math.PI / 2);
        break;
      case "RZ":
      case "CRZ":
        setBlochTheta(0);
        setBlochPhi(angle);
        break;
      case "S":
        setBlochTheta(0);
        setBlochPhi(Math.PI / 2);
        break;
      case "T":
        setBlochTheta(0);
        setBlochPhi(Math.PI / 4);
        break;
      case "SX":
        setBlochTheta(Math.PI / 2);
        setBlochPhi(0);
        break;
      case "SDG":
        setBlochTheta(0);
        setBlochPhi(-Math.PI / 2);
        break;
      case "TDG":
        setBlochTheta(0);
        setBlochPhi(-Math.PI / 4);
        break;
      default:
        setBlochTheta(0);
        setBlochPhi(0);
        break;
    }
  }, [selectedGate]);

  const { data: backends } = useQuery<Backend[]>({
    queryKey: ["/api/backends"],
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const qasm = generateQASM(circuit);
      const res = await apiRequest("POST", "/api/circuits", {
        name: circuit.name,
        description: circuit.description,
        userId: user?.id,
        circuitData: { qubits: circuit.qubits, steps: circuit.steps, gates: circuit.gates },
        qasm,
        visibility: "private",
        version: 1,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      toast({ title: "Circuit saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save circuit", description: err.message, variant: "destructive" });
    },
  });

  const submitJobMutation = useMutation({
    mutationFn: async (circuitId: string) => {
      const res = await apiRequest("POST", "/api/jobs", {
        userId: user?.id,
        circuitId,
        backendId: jobBackendId,
        shots: jobShots,
        algorithmType: "raw_circuit",
        status: "queued",
        priority: 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      setJobDialogOpen(false);
      toast({ title: "Job submitted successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to submit job", description: err.message, variant: "destructive" });
    },
  });

  const handlePlaceGate = useCallback(
    (qubit: number, step: number) => {
      if (!selectedGateDef) return;

      const def = selectedGateDef;
      const newGate: GateInstance = {
        id: generateId(),
        gate: def.name,
        qubit,
        step,
        color: def.color,
      };

      if (def.multiQubit) {
        const controlQubit = qubit === 0 ? 1 : qubit - 1;
        if (controlQubit >= circuit.qubits) {
          toast({ title: "Not enough qubits for multi-qubit gate", variant: "destructive" });
          return;
        }
        newGate.controlQubit = controlQubit;
        newGate.qubit = qubit;
      }

      if (def.hasParams) {
        newGate.params = { angle: Math.PI };
      }

      setCircuit((prev) => ({ ...prev, gates: [...prev.gates, newGate] }));
    },
    [selectedGateDef, circuit.qubits, toast]
  );

  const handleRemoveGate = useCallback(
    (id: string) => {
      setCircuit((prev) => ({
        ...prev,
        gates: prev.gates.filter((g) => g.id !== id),
      }));
      if (selectedGateId === id) setSelectedGateId(null);
    },
    [selectedGateId]
  );

  const handleUpdateGate = useCallback(
    (id: string, updates: Partial<GateInstance>) => {
      setCircuit((prev) => ({
        ...prev,
        gates: prev.gates.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }));
    },
    []
  );

  const addQubit = () =>
    setCircuit((prev) => ({ ...prev, qubits: prev.qubits + 1 }));
  const removeQubit = () => {
    if (circuit.qubits <= 1) return;
    setCircuit((prev) => ({
      ...prev,
      qubits: prev.qubits - 1,
      gates: prev.gates.filter(
        (g) =>
          g.qubit < prev.qubits - 1 &&
          (g.controlQubit === undefined || g.controlQubit < prev.qubits - 1)
      ),
    }));
  };

  const handleExport = () => setExportDialogOpen(true);

  const handleSubmitJob = async () => {
    try {
      const qasm = generateQASM(circuit);
      const res = await apiRequest("POST", "/api/circuits", {
        name: circuit.name,
        description: circuit.description,
        userId: user?.id,
        circuitData: { qubits: circuit.qubits, steps: circuit.steps, gates: circuit.gates },
        qasm,
        visibility: "private",
        version: 1,
      });
      const saved = await res.json();
      setJobDialogOpen(true);
      (window as any).__lastSavedCircuitId = saved.id;
    } catch {
      toast({ title: "Save circuit first before submitting a job", variant: "destructive" });
    }
  };

  const getExportCode = () => {
    switch (exportLanguage) {
      case "qasm":
        return generateQASM(circuit);
      case "qiskit":
        return generateQiskitCode(circuit);
      case "cirq":
        return generateCirqCode(circuit);
      case "cpp":
        return generateCppCode(circuit);
      case "java":
        return generateJavaCode(circuit);
      default:
        return generateQASM(circuit);
    }
  };

  const exportCode = getExportCode();

  return (
    <div className="flex h-full gap-2 p-2" data-testid="composer-page">
      <div className="w-[250px] flex-shrink-0">
        <GatePalette
          selectedGateDef={selectedGateDef}
          onSelectGate={setSelectedGateDef}
        />
      </div>

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={addQubit}
            data-testid="button-add-qubit"
          >
            <Plus className="w-3 h-3" />
            Qubit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={removeQubit}
            disabled={circuit.qubits <= 1}
            data-testid="button-remove-qubit"
          >
            <Minus className="w-3 h-3" />
            Qubit
          </Button>
          {selectedGateDef && (
            <Badge variant="outline" className="ml-2 no-default-hover-elevate">
              Placing:{" "}
              <span style={{ color: selectedGateDef.color }} className="font-bold ml-1">
                {selectedGateDef.name}
              </span>
            </Badge>
          )}
          {selectedGateDef && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedGateDef(null)}
              data-testid="button-deselect-gate"
            >
              Clear
            </Button>
          )}
        </div>
        <CircuitGrid
          circuit={circuit}
          selectedGateId={selectedGateId}
          selectedGateDef={selectedGateDef}
          onPlaceGate={handlePlaceGate}
          onSelectGateInstance={setSelectedGateId}
          onRemoveGate={handleRemoveGate}
        />
      </div>

      <div className="w-[280px] flex-shrink-0">
        <PropertiesPanel
          circuit={circuit}
          setCircuit={setCircuit}
          selectedGate={selectedGate}
          onUpdateGate={handleUpdateGate}
          onRemoveGate={handleRemoveGate}
          onSave={() => saveMutation.mutate()}
          isSaving={saveMutation.isPending}
          onExport={handleExport}
          onSubmitJob={handleSubmitJob}
          blochTheta={blochTheta}
          blochPhi={blochPhi}
        />
      </div>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Export Circuit Code</DialogTitle>
            <DialogDescription>
              Choose a language format and copy the generated code
            </DialogDescription>
          </DialogHeader>
          <Tabs value={exportLanguage} onValueChange={setExportLanguage} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="qasm" data-testid="tab-export-qasm">OpenQASM</TabsTrigger>
              <TabsTrigger value="qiskit" data-testid="tab-export-qiskit">Qiskit</TabsTrigger>
              <TabsTrigger value="cirq" data-testid="tab-export-cirq">Cirq</TabsTrigger>
              <TabsTrigger value="cpp" data-testid="tab-export-cpp">C++</TabsTrigger>
              <TabsTrigger value="java" data-testid="tab-export-java">Java</TabsTrigger>
            </TabsList>
            <TabsContent value={exportLanguage} className="mt-3">
              <div className="relative">
                <pre
                  className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-[350px] overflow-auto"
                  data-testid="text-export-code"
                >
                  {exportCode}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 right-1"
                  onClick={() => {
                    navigator.clipboard.writeText(exportCode);
                    toast({ title: "Copied to clipboard" });
                  }}
                  data-testid="button-copy-export"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              data-testid="button-close-export"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Job</DialogTitle>
            <DialogDescription>
              Configure and submit your circuit to a quantum backend
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Backend</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={jobBackendId}
                onChange={(e) => setJobBackendId(e.target.value)}
                data-testid="select-backend"
              >
                <option value="">Select a backend...</option>
                {backends?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.qubitCount} qubits, {b.status})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Shots: {jobShots}
              </label>
              <Slider
                min={1}
                max={8192}
                step={1}
                value={[jobShots]}
                onValueChange={([val]) => setJobShots(val)}
                data-testid="slider-shots"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setJobDialogOpen(false)}
              data-testid="button-cancel-job"
            >
              Cancel
            </Button>
            <Button
              disabled={!jobBackendId || submitJobMutation.isPending}
              onClick={() => {
                const cid = (window as any).__lastSavedCircuitId;
                if (cid) submitJobMutation.mutate(cid);
              }}
              data-testid="button-confirm-submit-job"
            >
              {submitJobMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
