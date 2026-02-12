import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ExperimentSnapshot } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, RotateCcw, Camera } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function CreateSnapshotDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/snapshots", { jobId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/snapshots"] });
      toast({ title: "Snapshot created" });
      setOpen(false);
      setJobId("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create snapshot", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-snapshot">
          <Plus className="mr-2 h-4 w-4" />
          Create Snapshot
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-create-snapshot">
        <DialogHeader>
          <DialogTitle>Create Snapshot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="snapshot-job-id">Job ID</Label>
            <Input
              id="snapshot-job-id"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Enter job ID"
              data-testid="input-snapshot-job-id"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !jobId.trim()}
            data-testid="button-submit-snapshot"
          >
            {createMutation.isPending ? "Creating..." : "Create Snapshot"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RerunDialog({ snapshotId }: { snapshotId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [backendId, setBackendId] = useState("");

  const rerunMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (backendId.trim()) {
        payload.backendId = backendId.trim();
      }
      await apiRequest("POST", `/api/snapshots/${snapshotId}/rerun`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/snapshots"] });
      toast({ title: "Rerun submitted" });
      setOpen(false);
      setBackendId("");
    },
    onError: (err: Error) => {
      toast({ title: "Rerun failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-rerun-${snapshotId}`}>
          <RotateCcw className="mr-1 h-3 w-3" />
          Rerun
        </Button>
      </DialogTrigger>
      <DialogContent data-testid={`dialog-rerun-${snapshotId}`}>
        <DialogHeader>
          <DialogTitle>Rerun Snapshot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="rerun-backend">Backend ID (optional)</Label>
            <Input
              id="rerun-backend"
              value={backendId}
              onChange={(e) => setBackendId(e.target.value)}
              placeholder="Leave empty for same backend"
              data-testid="input-rerun-backend"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => rerunMutation.mutate()}
            disabled={rerunMutation.isPending}
            data-testid="button-submit-rerun"
          >
            {rerunMutation.isPending ? "Submitting..." : "Rerun Experiment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SnapshotsPage() {
  const { data: snapshots, isLoading } = useQuery<ExperimentSnapshot[]>({
    queryKey: ["/api/snapshots"],
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-snapshots">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Experiment Snapshots</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Reproducible quantum experiment records
          </p>
        </div>
        <CreateSnapshotDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" data-testid={`skeleton-snapshot-${i}`} />
          ))}
        </div>
      ) : snapshots && snapshots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map((snapshot) => {
            const algoConfig = snapshot.algorithmConfig as Record<string, unknown> | null;
            const sdkVersions = snapshot.sdkVersions as Record<string, string> | null;
            return (
              <Card key={snapshot.id} data-testid={`card-snapshot-${snapshot.id}`}>
                <CardHeader className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1">
                    {snapshot.framework && (
                      <Badge variant="secondary" data-testid={`badge-framework-${snapshot.id}`}>
                        {snapshot.framework}
                      </Badge>
                    )}
                    {algoConfig && (
                      <Badge variant="outline" data-testid={`badge-algo-config-${snapshot.id}`}>
                        {Object.keys(algoConfig).length > 0
                          ? Object.entries(algoConfig)
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")
                          : "config"}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground" data-testid={`text-job-id-${snapshot.id}`}>
                      Job: {snapshot.jobId.slice(0, 12)}...
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-circuit-id-${snapshot.id}`}>
                      Circuit: {snapshot.circuitId.slice(0, 12)}...
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sdkVersions && Object.keys(sdkVersions).length > 0 && (
                    <div data-testid={`sdk-versions-${snapshot.id}`}>
                      <p className="text-xs font-medium text-muted-foreground mb-1">SDK Versions</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(sdkVersions).map(([sdk, version]) => (
                          <Badge key={sdk} variant="secondary" className="text-xs" data-testid={`badge-sdk-${snapshot.id}-${sdk}`}>
                            {sdk}: {version}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {snapshot.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-notes-${snapshot.id}`}>
                      {snapshot.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground" data-testid={`text-created-${snapshot.id}`}>
                    {formatDistanceToNow(new Date(snapshot.createdAt), { addSuffix: true })}
                  </p>
                </CardContent>
                <CardFooter>
                  <RerunDialog snapshotId={snapshot.id} />
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Camera className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground" data-testid="text-no-snapshots">
            No snapshots yet. Create your first snapshot from a job.
          </p>
        </div>
      )}
    </div>
  );
}