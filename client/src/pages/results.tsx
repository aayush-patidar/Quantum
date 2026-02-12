import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { ArrowLeft, ChevronDown, BarChart3, FileText } from "lucide-react";
import type { Job, JobResult } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-600 text-white border-green-600 no-default-hover-elevate">
          Completed
        </Badge>
      );
    case "failed":
      return <Badge variant="destructive" className="no-default-hover-elevate">Failed</Badge>;
    default:
      return <Badge variant="secondary" className="no-default-hover-elevate">{status}</Badge>;
  }
}

function AlgorithmLabel({ type }: { type: string }) {
  const labels: Record<string, string> = {
    raw_circuit: "Raw Circuit",
    vqe: "VQE",
    qaoa: "QAOA",
    qml: "QML",
  };
  return <>{labels[type] || type}</>;
}

function JobSelectionView() {
  const [, navigate] = useLocation();
  const { data: jobs, isLoading, isError, error } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const completedJobs = jobs?.filter((job) => job.status === "completed") || [];

  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive" data-testid="text-error">
            Failed to load jobs: {error?.message || "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="skeleton-jobs">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (completedJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="section-empty-jobs">
        <BarChart3 className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold" data-testid="text-empty-title">No completed jobs</h3>
        <p className="text-sm text-muted-foreground">Complete a quantum job to see results here.</p>
        <Button onClick={() => navigate("/composer")} data-testid="button-go-to-composer">
          Go to Composer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="list-completed-jobs">
      {completedJobs.map((job) => (
        <Card
          key={job.id}
          className="hover-elevate cursor-pointer"
          onClick={() => navigate(`/results?jobId=${job.id}`)}
          data-testid={`card-job-${job.id}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm font-medium" data-testid={`text-job-id-${job.id}`}>
                  {job.id.slice(0, 8)}
                </span>
                <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs" data-testid={`badge-algorithm-${job.id}`}>
                  <AlgorithmLabel type={job.algorithmType} />
                </Badge>
                <span className="text-sm text-muted-foreground" data-testid={`text-backend-${job.id}`}>
                  Backend: {job.backendId.slice(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground" data-testid={`text-shots-${job.id}`}>
                  {job.shots.toLocaleString()} shots
                </span>
                <span className="text-sm text-muted-foreground" data-testid={`text-date-${job.id}`}>
                  {formatDistanceToNow(new Date(job.submittedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ResultDetailView({ jobId }: { jobId: string }) {
  const [, navigate] = useLocation();

  const { data: result, isLoading: resultLoading, isError: resultError } = useQuery<JobResult>({
    queryKey: ["/api/results", jobId],
  });

  const { data: job, isLoading: jobLoading } = useQuery<Job>({
    queryKey: ["/api/jobs", jobId],
  });

  const isLoading = resultLoading || jobLoading;

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="skeleton-result">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resultError || !result) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/results")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Results
        </Button>
        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="section-no-result">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold" data-testid="text-no-result">No results available for this job</h3>
          <p className="text-sm text-muted-foreground">The job may still be processing or no results were generated.</p>
        </div>
      </div>
    );
  }

  const measurements = result.measurements as Record<string, number>;
  const expectationValues = result.expectationValues as Record<string, number> | null;
  const convergenceData = result.convergenceData as Array<{ iteration: number; energy: number }> | null;
  const metadata = result.metadata as Record<string, any> | null;

  const chartData = Object.entries(measurements)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([state, count]) => ({ state, count }));

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/results")} data-testid="button-back">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Results
      </Button>

      {job && (
        <Card data-testid="card-job-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Job:</span>
                <span className="font-mono text-sm font-medium" data-testid="text-detail-job-id">
                  {job.id.slice(0, 8)}
                </span>
              </div>
              <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs" data-testid="badge-detail-algorithm">
                <AlgorithmLabel type={job.algorithmType} />
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Backend:</span>
                <span className="text-sm" data-testid="text-detail-backend">{job.backendId.slice(0, 8)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Shots:</span>
                <span className="text-sm" data-testid="text-detail-shots">{job.shots.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Exec Time:</span>
                <span className="text-sm" data-testid="text-detail-exec-time">{result.executionTime.toFixed(2)}s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Submitted:</span>
                <span className="text-sm" data-testid="text-detail-date">
                  {formatDistanceToNow(new Date(job.submittedAt), { addSuffix: true })}
                </span>
              </div>
              <StatusBadge status={job.status} />
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-measurement-histogram">
        <CardHeader>
          <CardTitle className="text-lg" data-testid="text-histogram-title">Measurement Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72" data-testid="chart-histogram">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="state" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {expectationValues && Object.keys(expectationValues).length > 0 && (
        <Card data-testid="card-expectation-values">
          <CardHeader>
            <CardTitle className="text-lg" data-testid="text-ev-title">Expectation Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(expectationValues).map(([key, value]) => (
                <Card key={key} data-testid={`card-ev-${key}`}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{key}</p>
                    <p className="text-lg font-mono font-semibold" data-testid={`text-ev-value-${key}`}>
                      {typeof value === "number" ? value.toFixed(4) : String(value)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {convergenceData && convergenceData.length > 0 && (
        <Card data-testid="card-convergence">
          <CardHeader>
            <CardTitle className="text-lg" data-testid="text-convergence-title">Energy Convergence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64" data-testid="chart-convergence">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={convergenceData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="iteration" tick={{ fontSize: 12 }} label={{ value: "Iteration", position: "insideBottom", offset: -5, fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} label={{ value: "Energy", angle: -90, position: "insideLeft", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {metadata && Object.keys(metadata).length > 0 && (
        <Collapsible data-testid="section-metadata">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg" data-testid="text-metadata-title">Metadata</CardTitle>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <pre className="text-sm font-mono bg-muted p-3 rounded-md overflow-auto" data-testid="text-metadata-content">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  );
}

export default function ResultsPage() {
  useLocation();
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("jobId");

  return (
    <div className="p-6 space-y-6" data-testid="page-results">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Results & Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
          View quantum computation results and visualizations
        </p>
      </div>

      {jobId ? (
        <ResultDetailView jobId={jobId} />
      ) : (
        <JobSelectionView />
      )}
    </div>
  );
}
