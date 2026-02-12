import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2, ChevronLeft, ChevronRight, Rocket } from "lucide-react";
import type { Backend } from "@shared/schema";

interface UseCaseStep {
  step: number;
  title: string;
}

interface UseCase {
  id: string;
  name: string;
  description: string;
  algorithmType: string;
  domain: string;
  defaultParams: Record<string, unknown>;
  steps: UseCaseStep[];
}

function getDomainColor(domain: string) {
  switch (domain) {
    case "finance":
      return "bg-amber-600 text-white no-default-hover-elevate";
    case "chemistry":
      return "bg-teal-600 text-white no-default-hover-elevate";
    case "optimization":
      return "bg-indigo-600 text-white no-default-hover-elevate";
    case "security":
      return "bg-red-600 text-white no-default-hover-elevate";
    default:
      return "";
  }
}

function FinanceForm({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="numAssets" data-testid="label-numAssets">Number of Assets</Label>
        <Input
          id="numAssets"
          type="number"
          min={1}
          value={(params.numAssets as number) ?? 4}
          onChange={(e) => onChange({ ...params, numAssets: parseInt(e.target.value) || 0 })}
          data-testid="input-numAssets"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="budget" data-testid="label-budget">Budget</Label>
        <Input
          id="budget"
          type="number"
          min={0}
          value={(params.budget as number) ?? 1000}
          onChange={(e) => onChange({ ...params, budget: parseFloat(e.target.value) || 0 })}
          data-testid="input-budget"
        />
      </div>
      <div className="space-y-2">
        <Label data-testid="label-riskTolerance">
          Risk Tolerance: {((params.riskTolerance as number) ?? 0.5).toFixed(2)}
        </Label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[(params.riskTolerance as number) ?? 0.5]}
          onValueChange={([v]) => onChange({ ...params, riskTolerance: v })}
          data-testid="slider-riskTolerance"
        />
      </div>
    </div>
  );
}

function ChemistryForm({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="molecule" data-testid="label-molecule">Molecule</Label>
        <Input
          id="molecule"
          value={(params.molecule as string) ?? "H2"}
          onChange={(e) => onChange({ ...params, molecule: e.target.value })}
          data-testid="input-molecule"
        />
      </div>
      <div className="space-y-2">
        <Label data-testid="label-basisSet">Basis Set</Label>
        <Select
          value={(params.basisSet as string) ?? "sto-3g"}
          onValueChange={(v) => onChange({ ...params, basisSet: v })}
        >
          <SelectTrigger data-testid="select-basisSet">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sto-3g" data-testid="option-sto-3g">STO-3G</SelectItem>
            <SelectItem value="6-31g" data-testid="option-6-31g">6-31G</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="bondLength" data-testid="label-bondLength">Bond Length</Label>
        <Input
          id="bondLength"
          type="number"
          step={0.01}
          value={(params.bondLength as number) ?? 0.74}
          onChange={(e) => onChange({ ...params, bondLength: parseFloat(e.target.value) || 0 })}
          data-testid="input-bondLength"
        />
      </div>
    </div>
  );
}

function OptimizationForm({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="numNodes" data-testid="label-numNodes">Number of Nodes</Label>
        <Input
          id="numNodes"
          type="number"
          min={2}
          value={(params.numNodes as number) ?? 5}
          onChange={(e) => onChange({ ...params, numNodes: parseInt(e.target.value) || 0 })}
          data-testid="input-numNodes"
        />
      </div>
      <div className="space-y-2">
        <Label data-testid="label-edgeProbability">
          Edge Probability: {((params.edgeProbability as number) ?? 0.5).toFixed(2)}
        </Label>
        <Slider
          min={0}
          max={1}
          step={0.01}
          value={[(params.edgeProbability as number) ?? 0.5]}
          onValueChange={([v]) => onChange({ ...params, edgeProbability: v })}
          data-testid="slider-edgeProbability"
        />
      </div>
    </div>
  );
}

function DefaultForm({
  params,
  onChange,
}: {
  params: Record<string, unknown>;
  onChange: (p: Record<string, unknown>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label data-testid="label-jsonParams">Parameters (JSON)</Label>
      <Textarea
        value={JSON.stringify(params, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {}
        }}
        className="font-mono text-sm min-h-[120px]"
        data-testid="input-jsonParams"
      />
    </div>
  );
}

function WizardDialog({
  useCase,
  open,
  onClose,
}: {
  useCase: UseCase;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const steps = useCase.steps ?? [];
  const totalSteps = steps.length + 1;
  const [currentStep, setCurrentStep] = useState(0);
  const [params, setParams] = useState<Record<string, unknown>>(
    (useCase.defaultParams as Record<string, unknown>) ?? {}
  );
  const [selectedBackend, setSelectedBackend] = useState("");

  const { data: backends } = useQuery<Backend[]>({
    queryKey: ["/api/backends"],
    enabled: open,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/usecases/${useCase.id}/run`, {
        params,
        backendId: selectedBackend,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Use case submitted", description: "Your quantum job has been queued." });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const isFinalStep = currentStep === totalSteps - 1;

  function renderStepContent() {
    if (isFinalStep) {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label data-testid="label-backend">Select Backend</Label>
            <Select value={selectedBackend} onValueChange={setSelectedBackend}>
              <SelectTrigger data-testid="select-backend">
                <SelectValue placeholder="Choose a backend" />
              </SelectTrigger>
              <SelectContent>
                {backends?.map((b) => (
                  <SelectItem key={b.id} value={b.id} data-testid={`option-backend-${b.id}`}>
                    {b.name} ({b.qubitCount} qubits)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    switch (useCase.domain) {
      case "finance":
        return <FinanceForm params={params} onChange={setParams} />;
      case "chemistry":
        return <ChemistryForm params={params} onChange={setParams} />;
      case "optimization":
        return <OptimizationForm params={params} onChange={setParams} />;
      default:
        return <DefaultForm params={params} onChange={setParams} />;
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-wizard">
        <DialogHeader>
          <DialogTitle data-testid="text-wizard-title">{useCase.name}</DialogTitle>
          <p className="text-sm text-muted-foreground" data-testid="text-wizard-step">
            Step {currentStep + 1} of {totalSteps}
            {!isFinalStep && steps[currentStep] ? ` - ${steps[currentStep].title}` : " - Run"}
          </p>
        </DialogHeader>
        <div className="py-4" data-testid="wizard-step-content">
          {renderStepContent()}
        </div>
        <DialogFooter className="flex flex-row items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 0}
            data-testid="button-wizard-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          {isFinalStep ? (
            <Button
              onClick={() => runMutation.mutate()}
              disabled={runMutation.isPending || !selectedBackend}
              data-testid="button-wizard-run"
            >
              {runMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Rocket className="w-4 h-4 mr-1" />
              )}
              Run
            </Button>
          ) : (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              data-testid="button-wizard-next"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function UseCasesPage() {
  const { data: useCases, isLoading } = useQuery<UseCase[]>({
    queryKey: ["/api/usecases"],
  });
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);

  return (
    <div className="p-6 space-y-6" data-testid="page-use-cases">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Quantum Use Cases</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Guided workflows for common quantum computing problems
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="skeleton-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} data-testid={`skeleton-card-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex flex-wrap gap-2 pt-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="usecase-grid">
          {useCases?.map((uc) => (
            <Card
              key={uc.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedUseCase(uc)}
              data-testid={`card-usecase-${uc.id}`}
            >
              <CardHeader>
                <CardTitle className="text-lg" data-testid={`text-usecase-name-${uc.id}`}>
                  {uc.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3" data-testid={`text-usecase-desc-${uc.id}`}>
                  {uc.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" data-testid={`badge-algorithm-${uc.id}`}>
                    {uc.algorithmType}
                  </Badge>
                  <Badge className={getDomainColor(uc.domain)} data-testid={`badge-domain-${uc.id}`}>
                    {uc.domain}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" data-testid={`button-start-usecase-${uc.id}`}>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Start Wizard
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedUseCase && (
        <WizardDialog
          useCase={selectedUseCase}
          open={!!selectedUseCase}
          onClose={() => setSelectedUseCase(null)}
        />
      )}
    </div>
  );
}
