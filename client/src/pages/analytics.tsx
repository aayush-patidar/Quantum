import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Job, Backend } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CheckCircle, Server, Coins } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DashboardStats {
  totalJobs: number;
  completed: number;
  running: number;
  failed: number;
}

const STATUS_COLORS: Record<string, string> = {
  queued: "hsl(var(--chart-1))",
  running: "hsl(var(--chart-2))",
  completed: "hsl(var(--chart-3))",
  failed: "hsl(var(--chart-4))",
  cancelled: "hsl(var(--chart-5))",
};

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery<Job[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: backends, isLoading: backendsLoading } = useQuery<Backend[]>({
    queryKey: ["/api/backends"],
  });

  const successRate = useMemo(() => {
    if (!stats || stats.totalJobs === 0) return 0;
    return Math.round((stats.completed / stats.totalJobs) * 100);
  }, [stats]);

  const activeBackendsCount = useMemo(() => {
    if (!backends) return 0;
    return backends.filter((b) => b.status === "online").length;
  }, [backends]);

  const totalCredits = useMemo(() => {
    if (!jobs) return 0;
    return jobs.reduce((sum, j) => sum + (j.creditsUsed ?? 0), 0);
  }, [jobs]);

  const statusChartData = useMemo(() => {
    if (!jobs) return [];
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.status] = (counts[j.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const algorithmChartData = useMemo(() => {
    if (!jobs) return [];
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.algorithmType] = (counts[j.algorithmType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const backendChartData = useMemo(() => {
    if (!jobs || !backends) return [];
    const backendMap = new Map(backends.map((b) => [b.id, b.provider]));
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      const provider = backendMap.get(j.backendId) ?? "unknown";
      counts[provider] = (counts[provider] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs, backends]);

  const jobsOverTimeData = useMemo(() => {
    if (!jobs) return [];
    const now = new Date();
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = 0;
    }
    jobs.forEach((j) => {
      const key = new Date(j.submittedAt).toISOString().split("T")[0];
      if (key in days) {
        days[key]++;
      }
    });
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5),
      count,
    }));
  }, [jobs]);

  const isLoading = statsLoading || jobsLoading || backendsLoading;

  return (
    <div className="p-6 space-y-6" data-testid="page-analytics">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Analytics</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Platform performance and usage insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total-jobs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">Total Jobs</p>
            <div className="rounded p-2 bg-[hsl(var(--chart-1))]">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" data-testid="skeleton-stat-total" />
            ) : (
              <p className="text-3xl font-bold" data-testid="text-stat-total-jobs">
                {stats?.totalJobs ?? 0}
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-success-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">Success Rate</p>
            <div className="rounded p-2 bg-[hsl(var(--chart-3))]">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" data-testid="skeleton-stat-rate" />
            ) : (
              <p className="text-3xl font-bold" data-testid="text-stat-success-rate">
                {successRate}%
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-active-backends">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">Active Backends</p>
            <div className="rounded p-2 bg-[hsl(var(--chart-2))]">
              <Server className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" data-testid="skeleton-stat-backends" />
            ) : (
              <p className="text-3xl font-bold" data-testid="text-stat-active-backends">
                {activeBackendsCount}
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-stat-credits">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <p className="text-sm text-muted-foreground">Total Credits Used</p>
            <div className="rounded p-2 bg-[hsl(var(--chart-4))]">
              <Coins className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" data-testid="skeleton-stat-credits" />
            ) : (
              <p className="text-3xl font-bold" data-testid="text-stat-credits">
                {totalCredits.toFixed(1)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-chart-status">
          <CardHeader>
            <CardTitle className="text-lg">Jobs by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-chart-status" />
            ) : statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusChartData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? CHART_COLORS[0]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8" data-testid="text-no-status-data">
                No job data available
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-algorithm">
          <CardHeader>
            <CardTitle className="text-lg">Jobs by Algorithm</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-chart-algorithm" />
            ) : algorithmChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={algorithmChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))">
                    {algorithmChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8" data-testid="text-no-algorithm-data">
                No job data available
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-backend">
          <CardHeader>
            <CardTitle className="text-lg">Backend Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-chart-backend" />
            ) : backendChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={backendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--chart-2))">
                    {backendChartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8" data-testid="text-no-backend-data">
                No backend data available
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-chart-over-time">
          <CardHeader>
            <CardTitle className="text-lg">Jobs Over Time (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" data-testid="skeleton-chart-time" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={jobsOverTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}