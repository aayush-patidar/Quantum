import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import type { Backend } from "@shared/schema";
import { Loader2, Send, Code2 } from "lucide-react";

const FRAMEWORK_EXAMPLES: Record<string, string> = {
  qiskit: `from qiskit import QuantumCircuit\nqc = QuantumCircuit(2, 2)\nqc.h(0)\nqc.cx(0, 1)\nqc.measure_all()`,
  pennylane: `import pennylane as qml\n@qml.qnode(dev)\ndef circuit():\n    qml.Hadamard(0)\n    qml.CNOT([0,1])\n    return qml.expval(qml.PauliZ(0))`,
  cirq: `import cirq\nqubits = cirq.LineQubit.range(2)\ncircuit = cirq.Circuit()\ncircuit.append(cirq.H(qubits[0]))\ncircuit.append(cirq.CNOT(qubits[0], qubits[1]))`,
  openqasm: `OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[2];\ncreg c[2];\nh q[0];\ncx q[0],q[1];`,
};

const FRAMEWORKS = [
  { value: "qiskit", label: "Qiskit" },
  { value: "pennylane", label: "PennyLane" },
  { value: "cirq", label: "Cirq" },
  { value: "openqasm", label: "OpenQASM" },
];

const ALGORITHM_TYPES = [
  { value: "raw_circuit", label: "Raw Circuit" },
  { value: "vqe", label: "VQE" },
  { value: "qaoa", label: "QAOA" },
  { value: "qml", label: "QML" },
];

export default function CodeSubmitPage() {
  const { toast } = useToast();
  const [framework, setFramework] = useState("qiskit");
  const [code, setCode] = useState(FRAMEWORK_EXAMPLES.qiskit);
  const [backendId, setBackendId] = useState("");
  const [shots, setShots] = useState("1024");
  const [algorithmType, setAlgorithmType] = useState("raw_circuit");

  const { data: backends, isLoading: backendsLoading } = useQuery<Backend[]>({
    queryKey: ["/api/backends"],
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/programs/submit", {
        code,
        framework,
        backendId,
        shots: parseInt(shots, 10),
        algorithmType,
      });
      return res.json();
    },
    onSuccess: (data: { job?: { id: string } }) => {
      toast({
        title: "Job submitted",
        description: data.job ? `Job ID: ${data.job.id.slice(0, 8)}` : "Program submitted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    },
  });

  function handleFrameworkChange(value: string) {
    setFramework(value);
    setCode(FRAMEWORK_EXAMPLES[value] ?? "");
  }

  const creditsEstimate = (parseInt(shots, 10) || 0) * 0.001;

  return (
    <div className="p-6 space-y-6" data-testid="page-code-submit">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Code Submission</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">Submit quantum programs in your preferred framework</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4" data-testid="section-editor">
          <Tabs value={framework} onValueChange={handleFrameworkChange}>
            <TabsList data-testid="tabs-framework">
              {FRAMEWORKS.map((f) => (
                <TabsTrigger key={f.value} value={f.value} data-testid={`tab-${f.value}`}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="font-mono text-sm min-h-[400px] resize-y"
            placeholder={FRAMEWORK_EXAMPLES[framework]}
            data-testid="textarea-code"
          />
        </div>

        <div className="space-y-4" data-testid="section-config">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg" data-testid="text-config-title">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label data-testid="label-backend">Backend</Label>
                {backendsLoading ? (
                  <Skeleton className="h-9 w-full" data-testid="skeleton-backend" />
                ) : (
                  <Select value={backendId} onValueChange={setBackendId}>
                    <SelectTrigger data-testid="select-backend">
                      <SelectValue placeholder="Select backend" />
                    </SelectTrigger>
                    <SelectContent>
                      {backends?.map((b) => (
                        <SelectItem key={b.id} value={b.id} data-testid={`option-backend-${b.id}`}>
                          {b.name} ({b.provider})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label data-testid="label-shots">Shots</Label>
                <Input
                  type="number"
                  value={shots}
                  onChange={(e) => setShots(e.target.value)}
                  data-testid="input-shots"
                />
              </div>

              <div className="space-y-2">
                <Label data-testid="label-algorithm-type">Algorithm Type</Label>
                <Select value={algorithmType} onValueChange={setAlgorithmType}>
                  <SelectTrigger data-testid="select-algorithm-type">
                    <SelectValue placeholder="Select algorithm type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALGORITHM_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value} data-testid={`option-algorithm-${a.value}`}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || !backendId || !code.trim()}
                data-testid="button-submit-job"
              >
                {submitMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Submit Job
              </Button>

              <div className="text-center" data-testid="section-credits">
                <p className="text-sm text-muted-foreground" data-testid="text-credits-estimate">
                  Estimated cost: <span className="font-medium">{creditsEstimate.toFixed(3)} credits</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
