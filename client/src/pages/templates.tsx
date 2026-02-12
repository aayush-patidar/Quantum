import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import type { Backend } from "@shared/schema";
import { Loader2, Play, LayoutTemplate } from "lucide-react";

interface DomainTemplate {
  id: string;
  name: string;
  description: string | null;
  domain: string;
  algorithmType: string;
  circuitTemplate: unknown;
  defaultParams: Record<string, unknown> | null;
  inputSchema: unknown;
  tags: string[] | null;
  difficulty: string | null;
  createdAt: string;
}

const DOMAINS = [
  { value: "all", label: "All" },
  { value: "finance", label: "Finance" },
  { value: "chemistry", label: "Chemistry" },
  { value: "optimization", label: "Optimization" },
  { value: "security", label: "Security" },
  { value: "smart_grid", label: "Smart Grid" },
  { value: "business_analytics", label: "Business Analytics" },
];

const DOMAIN_COLORS: Record<string, string> = {
  finance: "bg-green-600 text-white",
  chemistry: "bg-blue-600 text-white",
  optimization: "bg-purple-600 text-white",
  security: "bg-red-600 text-white",
  smart_grid: "bg-yellow-600 text-white",
  business_analytics: "bg-indigo-600 text-white",
};

function getDomainBadgeClass(domain: string) {
  return DOMAIN_COLORS[domain] ?? "bg-muted text-muted-foreground";
}

export default function TemplatesPage() {
  const { toast } = useToast();
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<DomainTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [params, setParams] = useState<Record<string, string>>({});
  const [backendId, setBackendId] = useState("");
  const [shots, setShots] = useState("1024");
  const [withBaseline, setWithBaseline] = useState(false);

  const queryKey = selectedDomain === "all"
    ? ["/api/templates"]
    : ["/api/templates", `?domain=${selectedDomain}`];

  const { data: templates, isLoading } = useQuery<DomainTemplate[]>({
    queryKey: ["/api/templates", selectedDomain],
    queryFn: async () => {
      const url = selectedDomain === "all" ? "/api/templates" : `/api/templates?domain=${selectedDomain}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const { data: backends } = useQuery<Backend[]>({
    queryKey: ["/api/backends"],
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("No template selected");
      const parsedParams: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(params)) {
        const num = Number(val);
        parsedParams[key] = isNaN(num) ? val : num;
      }
      const res = await apiRequest("POST", `/api/templates/${selectedTemplate.id}/run`, {
        params: parsedParams,
        backendId,
        shots: parseInt(shots, 10),
        withBaseline,
      });
      return res.json();
    },
    onSuccess: (data: { job?: { id: string } }) => {
      toast({
        title: "Template executed",
        description: data.job ? `Job ${data.job.id.slice(0, 8)} created` : "Job submitted successfully",
      });
      setDialogOpen(false);
      setSelectedTemplate(null);
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  function openRunDialog(template: DomainTemplate) {
    setSelectedTemplate(template);
    const defaults = (template.defaultParams ?? {}) as Record<string, unknown>;
    const initial: Record<string, string> = {};
    for (const [k, v] of Object.entries(defaults)) {
      initial[k] = String(v);
    }
    setParams(initial);
    setBackendId("");
    setShots("1024");
    setWithBaseline(false);
    setDialogOpen(true);
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-templates">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Quantum Templates</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">Pre-built solutions for domain-specific problems</p>
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="filter-bar">
        {DOMAINS.map((d) => (
          <Button
            key={d.value}
            variant={selectedDomain === d.value ? "default" : "outline"}
            onClick={() => setSelectedDomain(d.value)}
            data-testid={`button-filter-${d.value}`}
            className="toggle-elevate"
          >
            {d.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="templates-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} data-testid={`skeleton-template-${i}`}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex flex-wrap gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="templates-grid">
          {templates.map((t) => (
            <Card key={t.id} data-testid={`card-template-${t.id}`}>
              <CardHeader>
                <CardTitle className="text-lg" data-testid={`text-template-name-${t.id}`}>{t.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-template-desc-${t.id}`}>
                  {t.description}
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge className={`no-default-hover-elevate no-default-active-elevate ${getDomainBadgeClass(t.domain)}`} data-testid={`badge-domain-${t.id}`}>
                    {t.domain.replace("_", " ")}
                  </Badge>
                  <Badge variant="outline" data-testid={`badge-algorithm-${t.id}`}>{t.algorithmType}</Badge>
                </div>
                {t.difficulty && (
                  <p className="text-xs text-muted-foreground" data-testid={`text-difficulty-${t.id}`}>
                    Difficulty: {t.difficulty}
                  </p>
                )}
                {t.tags && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${t.id}-${tag}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  onClick={() => openRunDialog(t)}
                  data-testid={`button-use-template-${t.id}`}
                >
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16" data-testid="templates-empty">
          <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground" data-testid="text-no-templates">No templates found</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-run-template">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle data-testid="text-dialog-template-name">{selectedTemplate.name}</DialogTitle>
                <p className="text-sm text-muted-foreground" data-testid="text-dialog-template-desc">
                  {selectedTemplate.description}
                </p>
              </DialogHeader>
              <div className="space-y-4 py-2">
                {Object.keys(params).length > 0 && (
                  <div className="space-y-3" data-testid="params-section">
                    <Label className="text-sm font-medium">Parameters</Label>
                    {Object.entries(params).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2">
                        <Label className="w-1/3 text-xs truncate" data-testid={`label-param-${key}`}>{key}</Label>
                        <Input
                          value={val}
                          onChange={(e) => setParams((p) => ({ ...p, [key]: e.target.value }))}
                          data-testid={`input-param-${key}`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label data-testid="label-backend">Backend</Label>
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

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="baseline"
                    checked={withBaseline}
                    onCheckedChange={(c) => setWithBaseline(c === true)}
                    data-testid="checkbox-baseline"
                  />
                  <Label htmlFor="baseline" className="text-sm" data-testid="label-baseline">
                    Run with Classical Baseline
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending || !backendId}
                  data-testid="button-run-template"
                >
                  {runMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
