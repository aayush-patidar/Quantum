import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Play, CheckCircle, Loader2, XCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Job, Circuit } from "@shared/schema";

interface DashboardStats {
  totalJobs: number;
  completed: number;
  running: number;
  failed: number;
}

interface RecentJob extends Job {
  backendName?: string;
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  isLoading,
  testId,
  spinning,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  isLoading: boolean;
  testId: string;
  spinning?: boolean;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`rounded p-2 ${colorClass}`}>
          <Icon className={`h-4 w-4 text-white ${spinning ? "animate-spin" : ""}`} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" data-testid={`${testId}-skeleton`} />
        ) : (
          <p className="text-3xl font-bold" data-testid={`${testId}-value`}>{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: string) {
  switch (status) {
    case "queued":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>queued</Badge>;
    case "running":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>running</Badge>;
    case "completed":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>completed</Badge>;
    case "failed":
      return <Badge variant="destructive" data-testid={`badge-status-${status}`}>failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" data-testid={`badge-status-${status}`}>cancelled</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function getVisibilityBadge(visibility: string) {
  return (
    <Badge variant="outline" className="text-xs" data-testid={`badge-visibility-${visibility}`}>
      {visibility}
    </Badge>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery<RecentJob[]>({
    queryKey: ["/api/dashboard/recent-jobs"],
  });

  const { data: recentCircuits, isLoading: circuitsLoading } = useQuery<Circuit[]>({
    queryKey: ["/api/dashboard/recent-circuits"],
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">Quantum Computing Platform Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Jobs"
          value={stats?.totalJobs ?? 0}
          icon={Play}
          colorClass="bg-[hsl(var(--chart-1))]"
          isLoading={statsLoading}
          testId="card-stat-total"
        />
        <StatCard
          label="Completed"
          value={stats?.completed ?? 0}
          icon={CheckCircle}
          colorClass="bg-[hsl(var(--chart-3))]"
          isLoading={statsLoading}
          testId="card-stat-completed"
        />
        <StatCard
          label="Running"
          value={stats?.running ?? 0}
          icon={Loader2}
          colorClass="bg-[hsl(var(--chart-2))]"
          isLoading={statsLoading}
          testId="card-stat-running"
          spinning
        />
        <StatCard
          label="Failed"
          value={stats?.failed ?? 0}
          icon={XCircle}
          colorClass="bg-destructive"
          isLoading={statsLoading}
          testId="card-stat-failed"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2" data-testid="card-recent-jobs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-lg">Recent Jobs</CardTitle>
            <Link href="/jobs" data-testid="link-view-all-jobs" className="text-sm text-muted-foreground hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {jobsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" data-testid={`skeleton-job-row-${i}`} />
                ))}
              </div>
            ) : recentJobs && recentJobs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Algorithm</TableHead>
                    <TableHead>Backend</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentJobs.map((job) => (
                    <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`text-job-id-${job.id}`}>
                        {job.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell data-testid={`text-job-algorithm-${job.id}`}>{job.algorithmType}</TableCell>
                      <TableCell data-testid={`text-job-backend-${job.id}`}>{job.backendName ?? job.backendId.slice(0, 8)}</TableCell>
                      <TableCell>{getStatusBadge(job.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm" data-testid={`text-job-submitted-${job.id}`}>
                        {formatDistanceToNow(new Date(job.submittedAt), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground" data-testid="text-no-jobs">No jobs yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-circuits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-lg">Recent Circuits</CardTitle>
            <Link href="/circuits" data-testid="link-view-all-circuits" className="text-sm text-muted-foreground hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {circuitsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" data-testid={`skeleton-circuit-${i}`} />
                ))}
              </div>
            ) : recentCircuits && recentCircuits.length > 0 ? (
              <div className="space-y-4">
                {recentCircuits.map((circuit) => (
                  <div key={circuit.id} className="space-y-1" data-testid={`item-circuit-${circuit.id}`}>
                    <p className="font-semibold" data-testid={`text-circuit-name-${circuit.id}`}>{circuit.name}</p>
                    <div className="flex flex-wrap items-center gap-1">
                      {circuit.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${tag}`}>
                          {tag}
                        </Badge>
                      ))}
                      {getVisibilityBadge(circuit.visibility)}
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid={`text-circuit-date-${circuit.id}`}>
                      {formatDistanceToNow(new Date(circuit.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground" data-testid="text-no-circuits">No circuits yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
