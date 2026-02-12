import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Target, ChevronDown, Lightbulb, Send, Loader2, BookOpen } from "lucide-react";

interface Lab {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  category: string;
  objectives: string[];
  initialCircuit: unknown;
  expectedResults: unknown;
  hints: string[];
  estimatedMinutes: number;
  sortOrder: number;
}

interface AttemptResult {
  passed: boolean;
  score: number;
  feedback: string;
}

function getDifficultyStyle(difficulty: string) {
  switch (difficulty) {
    case "beginner":
      return "bg-green-600 text-white no-default-hover-elevate";
    case "intermediate":
      return "bg-blue-600 text-white no-default-hover-elevate";
    case "advanced":
      return "bg-purple-600 text-white no-default-hover-elevate";
    default:
      return "";
  }
}

function LabView({
  lab,
  open,
  onClose,
}: {
  lab: Lab;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [checkedObjectives, setCheckedObjectives] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [hintsOpen, setHintsOpen] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/labs/${lab.id}/attempt`, {
        circuitData: lab.initialCircuit,
        results: {},
      });
      return res.json() as Promise<AttemptResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: data.passed ? "Lab Passed" : "Lab Not Passed",
        description: `Score: ${data.score}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function toggleObjective(idx: number) {
    setCheckedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" data-testid="dialog-lab">
        <DialogHeader>
          <DialogTitle data-testid="text-lab-dialog-title">{lab.title}</DialogTitle>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge className={getDifficultyStyle(lab.difficulty)} data-testid="badge-lab-difficulty">
              {lab.difficulty}
            </Badge>
            {lab.category && (
              <Badge variant="outline" data-testid="badge-lab-category">{lab.category}</Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2" data-testid="text-lab-desc-heading">Description</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-lab-description">
                {lab.description}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2" data-testid="text-objectives-heading">Objectives</h3>
              <div className="space-y-2">
                {lab.objectives?.map((obj, i) => (
                  <div key={i} className="flex items-start gap-2" data-testid={`objective-${i}`}>
                    <Checkbox
                      checked={checkedObjectives.has(i)}
                      onCheckedChange={() => toggleObjective(i)}
                      data-testid={`checkbox-objective-${i}`}
                    />
                    <span className="text-sm">{obj}</span>
                  </div>
                ))}
              </div>
            </div>

            {lab.hints && lab.hints.length > 0 && (
              <Collapsible open={hintsOpen} onOpenChange={setHintsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start" data-testid="button-toggle-hints">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Hints ({lab.hints.length})
                    <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${hintsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  {lab.hints.map((hint, i) => (
                    <p key={i} className="text-sm text-muted-foreground pl-6" data-testid={`text-hint-${i}`}>
                      {hint}
                    </p>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2" data-testid="text-circuit-heading">Initial Circuit</h3>
              <pre
                className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-[300px] font-mono"
                data-testid="code-initial-circuit"
              >
                {JSON.stringify(lab.initialCircuit, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {result && (
          <Card className="mt-2" data-testid="card-attempt-result">
            <CardContent className="pt-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={result.passed ? "bg-green-600 text-white no-default-hover-elevate" : "bg-red-600 text-white no-default-hover-elevate"}
                  data-testid="badge-result-status"
                >
                  {result.passed ? "Passed" : "Failed"}
                </Badge>
                <span className="text-sm font-semibold" data-testid="text-result-score">
                  Score: {result.score}
                </span>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-result-feedback">
                {result.feedback}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pt-2">
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending}
            data-testid="button-submit-attempt"
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Submit Attempt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function LabsPage() {
  const { data: labs, isLoading } = useQuery<Lab[]>({
    queryKey: ["/api/labs"],
  });
  const [filter, setFilter] = useState("all");
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);

  const filteredLabs = labs?.filter(
    (lab) => filter === "all" || lab.difficulty === filter
  );

  const difficulties = ["all", "beginner", "intermediate", "advanced"];

  return (
    <div className="p-6 space-y-6" data-testid="page-labs">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Learning Labs</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Hands-on quantum computing exercises
        </p>
      </div>

      <div className="flex flex-wrap gap-2" data-testid="filter-difficulty">
        {difficulties.map((d) => (
          <Button
            key={d}
            variant={filter === d ? "default" : "outline"}
            onClick={() => setFilter(d)}
            data-testid={`button-filter-${d}`}
          >
            {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
          </Button>
        ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="lab-grid">
          {filteredLabs?.map((lab) => (
            <Card key={lab.id} data-testid={`card-lab-${lab.id}`}>
              <CardHeader>
                <CardTitle className="text-lg" data-testid={`text-lab-title-${lab.id}`}>
                  {lab.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground" data-testid={`text-lab-desc-${lab.id}`}>
                  {lab.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className={getDifficultyStyle(lab.difficulty)} data-testid={`badge-difficulty-${lab.id}`}>
                    {lab.difficulty}
                  </Badge>
                  {lab.category && (
                    <Badge variant="outline" data-testid={`badge-category-${lab.id}`}>
                      {lab.category}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {lab.estimatedMinutes && (
                    <span className="flex items-center gap-1" data-testid={`text-time-${lab.id}`}>
                      <Clock className="w-3 h-3" />
                      {lab.estimatedMinutes} min
                    </span>
                  )}
                  {lab.objectives && (
                    <span className="flex items-center gap-1" data-testid={`text-objectives-${lab.id}`}>
                      <Target className="w-3 h-3" />
                      {lab.objectives.length} objectives
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setSelectedLab(lab)}
                  data-testid={`button-start-lab-${lab.id}`}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Start Lab
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {selectedLab && (
        <LabView
          lab={selectedLab}
          open={!!selectedLab}
          onClose={() => setSelectedLab(null)}
        />
      )}
    </div>
  );
}
