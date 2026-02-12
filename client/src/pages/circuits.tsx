import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CircuitBoard, Plus, Search, Trash2, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Circuit } from "@shared/schema";

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-9" />
      </CardFooter>
    </Card>
  );
}

function getVisibilityBadgeVariant(visibility: string) {
  switch (visibility) {
    case "private":
      return "outline" as const;
    case "team":
      return "secondary" as const;
    case "public":
      return "default" as const;
    default:
      return "outline" as const;
  }
}

export default function CircuitsPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<Circuit | null>(null);

  const { data: circuits, isLoading, isError, error } = useQuery<Circuit[]>({
    queryKey: ["/api/circuits"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/circuits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
      setDeleteTarget(null);
    },
  });

  const filteredCircuits = circuits?.filter((circuit) => {
    const matchesSearch =
      !searchQuery ||
      circuit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      circuit.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility =
      visibilityFilter === "all" || circuit.visibility === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  if (isError) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive" data-testid="text-error">
              Failed to load circuits: {error?.message || "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Circuits</h1>
        <Button
          onClick={() => navigate("/composer")}
          data-testid="button-new-circuit"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Circuit
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search circuits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-visibility">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="public">Public</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredCircuits && filteredCircuits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCircuits.map((circuit) => (
            <Card key={circuit.id} data-testid={`card-circuit-${circuit.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-lg leading-tight" data-testid={`text-circuit-name-${circuit.id}`}>
                    {circuit.name}
                  </h3>
                  <Badge
                    variant={getVisibilityBadgeVariant(circuit.visibility)}
                    className="no-default-hover-elevate shrink-0"
                    data-testid={`badge-visibility-${circuit.id}`}
                  >
                    {circuit.visibility}
                  </Badge>
                </div>
                {circuit.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-circuit-desc-${circuit.id}`}>
                    {circuit.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="pb-3">
                {circuit.tags && circuit.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {circuit.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs no-default-hover-elevate">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                  <span data-testid={`text-circuit-version-${circuit.id}`}>v{circuit.version}</span>
                  <span>·</span>
                  <span data-testid={`text-circuit-date-${circuit.id}`}>
                    {formatDistanceToNow(new Date(circuit.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/composer?circuitId=${circuit.id}`)}
                  data-testid={`button-open-composer-${circuit.id}`}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open in Composer
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => setDeleteTarget(circuit)}
                  data-testid={`button-delete-circuit-${circuit.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <CircuitBoard className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold" data-testid="text-empty-title">No circuits yet</h3>
          <p className="text-sm text-muted-foreground">Get started by creating your first quantum circuit.</p>
          <Button onClick={() => navigate("/composer")} data-testid="button-create-first">
            <Plus className="mr-2 h-4 w-4" />
            Create your first circuit
          </Button>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Circuit</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
