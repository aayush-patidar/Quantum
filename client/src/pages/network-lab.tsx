import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NetworkExperiment, NetworkNode, NetworkChannel } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, ArrowLeft, Play, Network, Loader2 } from "lucide-react";

interface ExperimentDetail extends NetworkExperiment {
  nodes?: NetworkNode[];
  channels?: NetworkChannel[];
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
    case "running":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>{status}</Badge>;
    case "completed":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>{status}</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function getProtocolBadge(protocol: string) {
  return (
    <Badge variant="outline" data-testid={`badge-protocol-${protocol}`}>
      {protocol.replace(/_/g, " ")}
    </Badge>
  );
}

function CreateExperimentDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState("teleportation");

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/qnet/experiments", {
        name,
        description,
        protocol,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qnet/experiments"] });
      toast({ title: "Experiment created" });
      setOpen(false);
      setName("");
      setDescription("");
      setProtocol("teleportation");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create experiment", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-experiment">
          <Plus className="mr-2 h-4 w-4" />
          New Experiment
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-create-experiment">
        <DialogHeader>
          <DialogTitle>New Experiment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="exp-name">Name</Label>
            <Input
              id="exp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-experiment-name"
            />
          </div>
          <div>
            <Label htmlFor="exp-description">Description</Label>
            <Textarea
              id="exp-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-experiment-description"
            />
          </div>
          <div>
            <Label>Protocol</Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger data-testid="select-experiment-protocol">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="teleportation">Teleportation</SelectItem>
                <SelectItem value="qkd">QKD</SelectItem>
                <SelectItem value="entanglement_swapping">Entanglement Swapping</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim()}
            data-testid="button-submit-experiment"
          >
            {createMutation.isPending ? "Creating..." : "Create Experiment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddNodeDialog({ experimentId }: { experimentId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nodeType, setNodeType] = useState("sender");

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/qnet/experiments/${experimentId}/nodes`, {
        name,
        nodeType,
        properties: {},
        experimentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qnet/experiments", experimentId] });
      toast({ title: "Node added" });
      setOpen(false);
      setName("");
      setNodeType("sender");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add node", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-add-node">
          <Plus className="mr-1 h-3 w-3" />
          Add Node
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-add-node">
        <DialogHeader>
          <DialogTitle>Add Node</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="node-name">Name</Label>
            <Input
              id="node-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="input-node-name"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={nodeType} onValueChange={setNodeType}>
              <SelectTrigger data-testid="select-node-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sender">Sender</SelectItem>
                <SelectItem value="receiver">Receiver</SelectItem>
                <SelectItem value="repeater">Repeater</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !name.trim()}
            data-testid="button-submit-node"
          >
            {addMutation.isPending ? "Adding..." : "Add Node"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddChannelDialog({
  experimentId,
  nodes,
}: {
  experimentId: string;
  nodes: NetworkNode[];
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState("");
  const [targetNodeId, setTargetNodeId] = useState("");

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/qnet/experiments/${experimentId}/channels`, {
        sourceNodeId,
        targetNodeId,
        protocol: "teleportation",
        properties: {},
        experimentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qnet/experiments", experimentId] });
      toast({ title: "Channel added" });
      setOpen(false);
      setSourceNodeId("");
      setTargetNodeId("");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add channel", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="button-add-channel">
          <Plus className="mr-1 h-3 w-3" />
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-add-channel">
        <DialogHeader>
          <DialogTitle>Add Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Source Node</Label>
            <Select value={sourceNodeId} onValueChange={setSourceNodeId}>
              <SelectTrigger data-testid="select-source-node">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name} ({node.nodeType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target Node</Label>
            <Select value={targetNodeId} onValueChange={setTargetNodeId}>
              <SelectTrigger data-testid="select-target-node">
                <SelectValue placeholder="Select target" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((node) => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.name} ({node.nodeType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !sourceNodeId || !targetNodeId}
            data-testid="button-submit-channel"
          >
            {addMutation.isPending ? "Adding..." : "Add Channel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExperimentDetailView({
  experimentId,
  onBack,
}: {
  experimentId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();

  const { data: experiment, isLoading } = useQuery<ExperimentDetail>({
    queryKey: ["/api/qnet/experiments", experimentId],
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/qnet/experiments/${experimentId}/run`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qnet/experiments", experimentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/qnet/experiments"] });
      toast({ title: "Simulation completed" });
    },
    onError: (err: Error) => {
      toast({ title: "Simulation failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="experiment-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!experiment) return null;

  const nodes = experiment.nodes ?? [];
  const channels = experiment.channels ?? [];
  const results = experiment.results as Record<string, unknown> | null;

  return (
    <div className="space-y-6" data-testid="experiment-detail">
      <Button variant="ghost" onClick={onBack} data-testid="button-back-experiments">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Experiments
      </Button>

      <div>
        <h2 className="text-2xl font-bold" data-testid="text-experiment-name">{experiment.name}</h2>
        <p className="text-muted-foreground mt-1" data-testid="text-experiment-description">
          {experiment.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {getProtocolBadge(experiment.protocol)}
          {getStatusBadge(experiment.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="card-nodes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Nodes ({nodes.length})</CardTitle>
            <AddNodeDialog experimentId={experimentId} />
          </CardHeader>
          <CardContent>
            {nodes.length > 0 ? (
              <div className="space-y-2">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2 rounded border"
                    data-testid={`item-node-${node.id}`}
                  >
                    <span className="font-medium text-sm" data-testid={`text-node-name-${node.id}`}>
                      {node.name}
                    </span>
                    <Badge variant="secondary" data-testid={`badge-node-type-${node.id}`}>
                      {node.nodeType}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-nodes">
                No nodes added yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-channels">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Channels ({channels.length})</CardTitle>
            {nodes.length >= 2 && (
              <AddChannelDialog experimentId={experimentId} nodes={nodes} />
            )}
          </CardHeader>
          <CardContent>
            {channels.length > 0 ? (
              <div className="space-y-2">
                {channels.map((channel) => {
                  const source = nodes.find((n) => n.id === channel.sourceNodeId);
                  const target = nodes.find((n) => n.id === channel.targetNodeId);
                  return (
                    <div
                      key={channel.id}
                      className="flex flex-wrap items-center gap-2 p-2 rounded border"
                      data-testid={`item-channel-${channel.id}`}
                    >
                      <span className="text-sm" data-testid={`text-channel-source-${channel.id}`}>
                        {source?.name ?? channel.sourceNodeId.slice(0, 8)}
                      </span>
                      <ArrowLeft className="h-3 w-3 rotate-180" />
                      <span className="text-sm" data-testid={`text-channel-target-${channel.id}`}>
                        {target?.name ?? channel.targetNodeId.slice(0, 8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="text-no-channels">
                No channels added yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => runMutation.mutate()}
          disabled={runMutation.isPending || nodes.length === 0}
          data-testid="button-run-simulation"
        >
          {runMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {runMutation.isPending ? "Running..." : "Run Simulation"}
        </Button>
      </div>

      {results && (
        <Card data-testid="card-results">
          <CardHeader>
            <CardTitle className="text-base">Simulation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(results).map(([key, value]) => (
                <div key={key} className="flex flex-wrap items-center justify-between gap-2" data-testid={`result-${key}`}>
                  <span className="text-sm text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span className="font-mono text-sm font-medium" data-testid={`text-result-value-${key}`}>
                    {typeof value === "number" ? (value as number).toFixed(4) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NetworkLabPage() {
  const [selectedExperimentId, setSelectedExperimentId] = useState<string | null>(null);

  const { data: experiments, isLoading } = useQuery<NetworkExperiment[]>({
    queryKey: ["/api/qnet/experiments"],
  });

  if (selectedExperimentId) {
    return (
      <div className="p-6" data-testid="page-network-lab">
        <ExperimentDetailView
          experimentId={selectedExperimentId}
          onBack={() => setSelectedExperimentId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-network-lab">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Quantum Network Lab</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Simulate quantum network protocols
          </p>
        </div>
        <CreateExperimentDialog />
      </div>

      <Separator />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" data-testid={`skeleton-experiment-${i}`} />
          ))}
        </div>
      ) : experiments && experiments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiments.map((exp) => (
            <Card
              key={exp.id}
              className="hover-elevate cursor-pointer"
              onClick={() => setSelectedExperimentId(exp.id)}
              data-testid={`card-experiment-${exp.id}`}
            >
              <CardHeader>
                <CardTitle className="text-base" data-testid={`text-experiment-name-${exp.id}`}>
                  {exp.name}
                </CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-experiment-desc-${exp.id}`}>
                  {exp.description}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-1">
                  {getProtocolBadge(exp.protocol)}
                  {getStatusBadge(exp.status)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Network className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground" data-testid="text-no-experiments">
            No experiments yet. Create your first experiment to get started.
          </p>
        </div>
      )}
    </div>
  );
}