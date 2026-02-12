import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Heart, GitFork, Plus, ImageOff, Loader2 } from "lucide-react";

interface GalleryExperiment {
  id: string;
  userId: string;
  circuitId: string | null;
  jobId: string | null;
  snapshotId: string | null;
  title: string;
  description: string | null;
  tags: string[] | null;
  likes: number;
  forks: number;
  createdAt: string;
}

export default function GalleryPage() {
  const { toast } = useToast();
  const [shareOpen, setShareOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const { data: experiments, isLoading } = useQuery<GalleryExperiment[]>({
    queryKey: ["/api/gallery"],
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await apiRequest("POST", "/api/gallery", { title, description, tags });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Shared", description: "Experiment shared to gallery" });
      setShareOpen(false);
      setTitle("");
      setDescription("");
      setTagsInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/gallery/${id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const forkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/gallery/${id}/fork`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Forked", description: "Experiment forked to your circuits" });
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      queryClient.invalidateQueries({ queryKey: ["/api/circuits"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6" data-testid="page-gallery">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Public Gallery</h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">Explore and fork community quantum experiments</p>
        </div>
        <Button onClick={() => setShareOpen(true)} data-testid="button-share-experiment">
          <Plus className="mr-2 h-4 w-4" />
          Share Experiment
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="gallery-loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} data-testid={`skeleton-experiment-${i}`}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : experiments && experiments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="gallery-grid">
          {experiments.map((exp) => (
            <Card key={exp.id} data-testid={`card-experiment-${exp.id}`}>
              <CardHeader>
                <CardTitle className="text-lg" data-testid={`text-experiment-title-${exp.id}`}>{exp.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {exp.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-experiment-desc-${exp.id}`}>
                    {exp.description}
                  </p>
                )}
                {exp.tags && exp.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {exp.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${exp.id}-${tag}`}>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1" data-testid={`text-likes-${exp.id}`}>
                    <Heart className="h-3.5 w-3.5" /> {exp.likes}
                  </span>
                  <span className="flex items-center gap-1" data-testid={`text-forks-${exp.id}`}>
                    <GitFork className="h-3.5 w-3.5" /> {exp.forks}
                  </span>
                  <span data-testid={`text-date-${exp.id}`}>
                    {formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => likeMutation.mutate(exp.id)}
                  disabled={likeMutation.isPending}
                  data-testid={`button-like-${exp.id}`}
                >
                  <Heart className="mr-2 h-4 w-4" />
                  Like
                </Button>
                <Button
                  variant="outline"
                  onClick={() => forkMutation.mutate(exp.id)}
                  disabled={forkMutation.isPending}
                  data-testid={`button-fork-${exp.id}`}
                >
                  <GitFork className="mr-2 h-4 w-4" />
                  Fork
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16" data-testid="gallery-empty">
          <ImageOff className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground" data-testid="text-no-experiments">No experiments shared yet</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first to share a quantum experiment</p>
        </div>
      )}

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-share-experiment">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-share-title">Share Experiment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label data-testid="label-title">Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Quantum Experiment"
                data-testid="input-title"
              />
            </div>
            <div className="space-y-2">
              <Label data-testid="label-description">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your experiment..."
                data-testid="input-description"
              />
            </div>
            <div className="space-y-2">
              <Label data-testid="label-tags">Tags (comma-separated)</Label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="entanglement, bell-state, optimization"
                data-testid="input-tags"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending || !title.trim()}
              data-testid="button-submit-share"
            >
              {shareMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
