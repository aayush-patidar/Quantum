import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  Eye,
} from "lucide-react";
import type { Job } from "@shared/schema";

const STATUS_TABS = ["all", "queued", "running", "completed", "failed"] as const;

const ALGORITHM_OPTIONS = ["all", "raw_circuit", "vqe", "qaoa", "qml"] as const;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "queued":
      return (
        <Badge variant="secondary" className="no-default-hover-elevate">
          <Clock className="mr-1 h-3 w-3" />
          Queued
        </Badge>
      );
    case "running":
      return (
        <Badge className="bg-blue-500 text-white border-blue-500 no-default-hover-elevate">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Running
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-green-600 text-white border-green-600 no-default-hover-elevate">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="no-default-hover-elevate">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="outline" className="no-default-hover-elevate">
          Cancelled
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="no-default-hover-elevate">
          {status}
        </Badge>
      );
  }
}

function AlgorithmBadge({ algorithm }: { algorithm: string }) {
  const labels: Record<string, string> = {
    raw_circuit: "Raw Circuit",
    vqe: "VQE",
    qaoa: "QAOA",
    qml: "QML",
  };
  return (
    <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs">
      {labels[algorithm] || algorithm}
    </Badge>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-12" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
          <TableCell><Skeleton className="h-9 w-24" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function JobsPage() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [algorithmFilter, setAlgorithmFilter] = useState("all");

  const { data: jobs, isLoading, isError, error } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const filteredJobs = jobs?.filter((job) => {
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    const matchesAlgorithm = algorithmFilter === "all" || job.algorithmType === algorithmFilter;
    return matchesStatus && matchesAlgorithm;
  });

  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive" data-testid="text-error">
              Failed to load jobs: {error?.message || "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Quantum Jobs</h1>
        <p className="text-sm text-muted-foreground mt-1">Track your quantum computation jobs</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList data-testid="tabs-status-filter">
            <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
            <TabsTrigger value="queued" data-testid="tab-queued">Queued</TabsTrigger>
            <TabsTrigger value="running" data-testid="tab-running">Running</TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
            <TabsTrigger value="failed" data-testid="tab-failed">Failed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={algorithmFilter} onValueChange={setAlgorithmFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-algorithm">
            <SelectValue placeholder="Algorithm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Algorithms</SelectItem>
            <SelectItem value="raw_circuit">Raw Circuit</SelectItem>
            <SelectItem value="vqe">VQE</SelectItem>
            <SelectItem value="qaoa">QAOA</SelectItem>
            <SelectItem value="qml">QML</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Circuit</TableHead>
              <TableHead>Backend</TableHead>
              <TableHead>Algorithm</TableHead>
              <TableHead>Shots</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SkeletonRows />
          </TableBody>
        </Table>
      ) : filteredJobs && filteredJobs.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job ID</TableHead>
              <TableHead>Circuit</TableHead>
              <TableHead>Backend</TableHead>
              <TableHead>Algorithm</TableHead>
              <TableHead>Shots</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                <TableCell>
                  <span className="font-mono text-sm" data-testid={`text-job-id-${job.id}`}>
                    {job.id.slice(0, 8)}
                  </span>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    className="font-mono text-sm underline"
                    onClick={() => navigate(`/composer?circuitId=${job.circuitId}`)}
                    data-testid={`link-circuit-${job.id}`}
                  >
                    {job.circuitId.slice(0, 8)}
                  </Button>
                </TableCell>
                <TableCell data-testid={`text-backend-${job.id}`}>
                  {job.backendId.slice(0, 8)}
                </TableCell>
                <TableCell>
                  <AlgorithmBadge algorithm={job.algorithmType} />
                </TableCell>
                <TableCell data-testid={`text-shots-${job.id}`}>
                  {job.shots.toLocaleString()}
                </TableCell>
                <TableCell data-testid={`badge-status-${job.id}`}>
                  <StatusBadge status={job.status} />
                </TableCell>
                <TableCell data-testid={`text-submitted-${job.id}`}>
                  {formatDistanceToNow(new Date(job.submittedAt), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  {job.status === "completed" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/results?jobId=${job.id}`)}
                      data-testid={`button-view-results-${job.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Play className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold" data-testid="text-empty-title">No jobs submitted yet</h3>
          <p className="text-sm text-muted-foreground">Submit your first quantum computation job from the composer.</p>
          <Button onClick={() => navigate("/composer")} data-testid="button-go-to-composer">
            Go to Composer
          </Button>
        </div>
      )}
    </div>
  );
}
