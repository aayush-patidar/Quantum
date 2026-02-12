import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Square, Trash2, ExternalLink, Loader2, Monitor } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Workspace } from "@shared/schema";

function getStatusStyle(status: string) {
  switch (status) {
    case "creating":
      return "bg-yellow-600 text-white no-default-hover-elevate";
    case "running":
      return "bg-green-600 text-white no-default-hover-elevate";
    case "stopped":
      return "bg-muted-foreground text-white no-default-hover-elevate";
    case "expired":
    case "error":
      return "bg-red-600 text-white no-default-hover-elevate";
    default:
      return "";
  }
}

export default function WorkspacesPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("");

  const { data: workspaces, isLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/workspaces", { name, framework });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Workspace created", description: `"${name}" is being provisioned.` });
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      setCreateOpen(false);
      setName("");
      setFramework("");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/workspaces/${id}/stop`);
    },
    onSuccess: () => {
      toast({ title: "Workspace stopped" });
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/workspaces/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Workspace terminated" });
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-workspaces">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Development Workspaces</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Ephemeral quantum development environments
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-workspace">
          <Plus className="w-4 h-4 mr-2" />
          Create Workspace
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="skeleton-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} data-testid={`skeleton-card-${i}`}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : workspaces && workspaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="workspace-grid">
          {workspaces.map((ws) => (
            <Card key={ws.id} data-testid={`card-workspace-${ws.id}`}>
              <CardHeader>
                <CardTitle className="text-lg" data-testid={`text-workspace-name-${ws.id}`}>
                  {ws.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {ws.framework && (
                    <Badge variant="secondary" data-testid={`badge-framework-${ws.id}`}>
                      {ws.framework}
                    </Badge>
                  )}
                  <Badge className={getStatusStyle(ws.status)} data-testid={`badge-status-${ws.id}`}>
                    {ws.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p data-testid={`text-created-${ws.id}`}>
                    Created {formatDistanceToNow(new Date(ws.createdAt), { addSuffix: true })}
                  </p>
                  {ws.expiresAt && (
                    <p data-testid={`text-expires-${ws.id}`}>
                      Expires {format(new Date(ws.expiresAt), "PPp")}
                    </p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    toast({
                      title: "Simulated",
                      description: "Workspace environment is simulated",
                    })
                  }
                  disabled={ws.status !== "running"}
                  data-testid={`button-open-${ws.id}`}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Open
                </Button>
                <Button
                  variant="outline"
                  onClick={() => stopMutation.mutate(ws.id)}
                  disabled={stopMutation.isPending || ws.status !== "running"}
                  data-testid={`button-stop-${ws.id}`}
                >
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => terminateMutation.mutate(ws.id)}
                  disabled={terminateMutation.isPending}
                  data-testid={`button-terminate-${ws.id}`}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Terminate
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16" data-testid="empty-state">
          <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground" data-testid="text-empty-state">
            No workspaces yet. Create one to get started.
          </p>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="dialog-create-workspace">
          <DialogHeader>
            <DialogTitle data-testid="text-create-title">Create Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name" data-testid="label-name">Name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Workspace"
                data-testid="input-workspace-name"
              />
            </div>
            <div className="space-y-2">
              <Label data-testid="label-framework">Framework</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger data-testid="select-framework">
                  <SelectValue placeholder="Select framework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Qiskit" data-testid="option-qiskit">Qiskit</SelectItem>
                  <SelectItem value="PennyLane" data-testid="option-pennylane">PennyLane</SelectItem>
                  <SelectItem value="Cirq" data-testid="option-cirq">Cirq</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !name || !framework}
              data-testid="button-confirm-create"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
