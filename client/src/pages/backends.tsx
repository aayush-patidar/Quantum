import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Cpu, ListOrdered, Activity, Wifi } from "lucide-react";
import type { Backend } from "@shared/schema";

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "online":
      return (
        <Badge className="bg-green-600 text-white border-green-600 no-default-hover-elevate" data-testid="badge-status-online">
          <span className="mr-1.5 h-2 w-2 rounded-full bg-green-300 inline-block" />
          Online
        </Badge>
      );
    case "offline":
      return (
        <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-status-offline">
          Offline
        </Badge>
      );
    case "maintenance":
      return (
        <Badge className="bg-yellow-500 text-white border-yellow-500 no-default-hover-elevate" data-testid="badge-status-maintenance">
          Maintenance
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

function ProviderBadge({ provider }: { provider: string }) {
  switch (provider) {
    case "ibm":
      return (
        <Badge className="bg-blue-600 text-white border-blue-600 no-default-hover-elevate" data-testid="badge-provider-ibm">
          IBM
        </Badge>
      );
    case "local_simulator":
      return (
        <Badge className="bg-purple-600 text-white border-purple-600 no-default-hover-elevate" data-testid="badge-provider-local">
          Local Simulator
        </Badge>
      );
    case "pennylane":
      return (
        <Badge className="bg-teal-600 text-white border-teal-600 no-default-hover-elevate" data-testid="badge-provider-pennylane">
          PennyLane
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="no-default-hover-elevate">
          {provider}
        </Badge>
      );
  }
}

function TypeBadge({ backendType }: { backendType: string }) {
  return (
    <Badge variant="outline" className="no-default-hover-elevate" data-testid={`badge-type-${backendType}`}>
      {backendType === "real_device" ? "Real Device" : "Simulator"}
    </Badge>
  );
}

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="skeleton-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2 flex-wrap mt-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-9 w-full" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function BackendCard({ backend }: { backend: Backend }) {
  const [, navigate] = useLocation();
  const properties = backend.properties as Record<string, any> | null;

  return (
    <Card data-testid={`card-backend-${backend.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold" data-testid={`text-backend-name-${backend.id}`}>
            {backend.name}
          </h3>
          <StatusBadge status={backend.status} />
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          <ProviderBadge provider={backend.provider} />
          <TypeBadge backendType={backend.backendType} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`text-qubits-${backend.id}`}>
            <Cpu className="h-4 w-4" />
            <span>{backend.qubitCount} Qubits</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`text-queue-${backend.id}`}>
            <ListOrdered className="h-4 w-4" />
            <span>Queue: {backend.queueDepth}</span>
          </div>
        </div>

        {properties && (
          <div className="space-y-2">
            {properties.gateSet && (
              <div data-testid={`section-gates-${backend.id}`}>
                <p className="text-xs text-muted-foreground mb-1">Gate Set</p>
                <div className="flex gap-1 flex-wrap">
                  {(properties.gateSet as string[]).map((gate: string) => (
                    <Badge key={gate} variant="secondary" className="text-xs no-default-hover-elevate" data-testid={`badge-gate-${gate}-${backend.id}`}>
                      {gate}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {properties.connectivity && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`text-connectivity-${backend.id}`}>
                <Wifi className="h-4 w-4" />
                <span>{properties.connectivity}</span>
              </div>
            )}
            {properties.errorRate !== undefined && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid={`text-error-rate-${backend.id}`}>
                <Activity className="h-4 w-4" />
                <span>Error Rate: {(properties.errorRate * 100).toFixed(2)}%</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => navigate(`/composer?backendId=${backend.id}`)}
          disabled={backend.status !== "online"}
          data-testid={`button-select-backend-${backend.id}`}
        >
          Select for Job
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function BackendsPage() {
  const { data: backends, isLoading, isError, error } = useQuery<Backend[]>({
    queryKey: ["/api/backends"],
  });

  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive" data-testid="text-error">
              Failed to load backends: {error?.message || "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-backends">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Quantum Backends</h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-page-subtitle">
          Available quantum computing resources
        </p>
      </div>

      {isLoading ? (
        <SkeletonCards />
      ) : backends && backends.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-backends">
          {backends.map((backend) => (
            <BackendCard key={backend.id} backend={backend} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 space-y-4" data-testid="section-empty">
          <Server className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold" data-testid="text-empty-title">No backends available</h3>
          <p className="text-sm text-muted-foreground">No quantum computing backends are currently configured.</p>
        </div>
      )}
    </div>
  );
}
