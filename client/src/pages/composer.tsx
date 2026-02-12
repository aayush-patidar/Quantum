import { useState, useCallback, useEffect } from "react";
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
  { name: "RX", label: "RX", color: "#7dd3fc", category: "rotation", hasParams: true },
  { name: "RY", label: "RY", color: "#86efac", category: "rotation", hasParams: true },
  { name: "RZ", label: "RZ", color: "#c4b5fd", category: "rotation", hasParams: true },
  { name: "CNOT", label: "CX", color: "#f59e0b", category: "multi", multiQubit: true },
  { name: "CZ", label: "CZ", color: "#14b8a6", category: "multi", multiQubit: true },
  { name: "M", label: "M", color: "#6b7280", category: "measurement" },
];

const CATEGORIES = [
  { id: "single", label: "Single Qubit Gates" },
  { id: "rotation", label: "Rotation Gates" },
  { id: "multi", label: "Multi-Qubit Gates" },
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
      case "M":
        lines.push(`measure q[${g.qubit}] -> c[${g.qubit}];`);
        break;
    }
  }

  return lines.join("\n");
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
                      {g.gate === "CNOT" ? "\u2295" : g.gate}
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
                    g.gate
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
  onExportQasm,
  onSubmitJob,
}: {
  circuit: CircuitState;
  setCircuit: React.Dispatch<React.SetStateAction<CircuitState>>;
  selectedGate: GateInstance | null;
  onUpdateGate: (id: string, updates: Partial<GateInstance>) => void;
  onRemoveGate: (id: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onExportQasm: () => void;
  onSubmitJob: () => void;
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
            onClick={onExportQasm}
            data-testid="button-export-qasm"
          >
            <FileCode className="w-4 h-4" />
            Export OpenQASM
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
  const [qasmDialogOpen, setQasmDialogOpen] = useState(false);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [jobShots, setJobShots] = useState(1024);
  const [jobBackendId, setJobBackendId] = useState("");

  const selectedGate =
    circuit.gates.find((g) => g.id === selectedGateId) ?? null;

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

  const handleExportQasm = () => setQasmDialogOpen(true);

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

  const qasmText = generateQASM(circuit);

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
          onExportQasm={handleExportQasm}
          onSubmitJob={handleSubmitJob}
        />
      </div>

      <Dialog open={qasmDialogOpen} onOpenChange={setQasmDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>OpenQASM 2.0</DialogTitle>
            <DialogDescription>
              Generated QASM code for your circuit
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <pre className="bg-muted rounded-md p-3 text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
              {qasmText}
            </pre>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-1 right-1"
              onClick={() => {
                navigator.clipboard.writeText(qasmText);
                toast({ title: "Copied to clipboard" });
              }}
              data-testid="button-copy-qasm"
            >
              <Copy className="w-3 h-3" />
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setQasmDialogOpen(false)}
              data-testid="button-close-qasm"
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
