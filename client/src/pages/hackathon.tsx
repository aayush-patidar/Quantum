import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Users,
  Trophy,
  Tag,
  Zap,
  ArrowRight,
  Eye,
  Filter,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Hackathon {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: "upcoming" | "active" | "completed";
  maxTeamSize: number;
  prizes: string[];
  difficulty: string;
  tags: string[];
}

const hackathons: Hackathon[] = [
  { id: "1", title: "Quantum Error Correction Challenge", description: "Design novel error correction codes for near-term quantum devices. Focus on surface codes and stabilizer formalism.", startDate: "2026-03-15", endDate: "2026-03-17", status: "upcoming", maxTeamSize: 4, prizes: ["$10,000", "$5,000", "$2,500"], difficulty: "Advanced", tags: ["error-correction", "surface-codes", "stabilizer"] },
  { id: "2", title: "Quantum Machine Learning Sprint", description: "Build quantum-classical hybrid models for real-world datasets. Explore variational classifiers, quantum kernels, and QNNs.", startDate: "2026-04-10", endDate: "2026-04-12", status: "upcoming", maxTeamSize: 3, prizes: ["$8,000", "$4,000", "$2,000"], difficulty: "Intermediate", tags: ["qml", "variational", "hybrid"] },
  { id: "3", title: "Quantum Chemistry Hackathon", description: "Simulate molecular ground states using VQE and other variational approaches on real quantum hardware.", startDate: "2026-02-01", endDate: "2026-02-03", status: "active", maxTeamSize: 5, prizes: ["$15,000", "$7,500", "$3,000"], difficulty: "Advanced", tags: ["chemistry", "vqe", "simulation"] },
  { id: "4", title: "Intro to Quantum Circuits", description: "A beginner-friendly hackathon focused on learning quantum circuit design. Mentors available throughout.", startDate: "2026-01-10", endDate: "2026-01-12", status: "completed", maxTeamSize: 2, prizes: ["$3,000", "$1,500", "$750"], difficulty: "Beginner", tags: ["circuits", "beginner", "tutorial"] },
  { id: "5", title: "Quantum Optimization Challenge", description: "Solve combinatorial optimization problems using QAOA and quantum annealing approaches.", startDate: "2026-05-20", endDate: "2026-05-22", status: "upcoming", maxTeamSize: 4, prizes: ["$12,000", "$6,000", "$3,000"], difficulty: "Intermediate", tags: ["optimization", "qaoa", "annealing"] },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "upcoming":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>Upcoming</Badge>;
    case "active":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid={`badge-status-${status}`}>Active</Badge>;
    case "completed":
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Completed</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>{status}</Badge>;
  }
}

function getDifficultyBadge(difficulty: string) {
  switch (difficulty) {
    case "Beginner":
      return <Badge variant="outline" data-testid={`badge-difficulty-${difficulty}`}>Beginner</Badge>;
    case "Intermediate":
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400" data-testid={`badge-difficulty-${difficulty}`}>Intermediate</Badge>;
    case "Advanced":
      return <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400" data-testid={`badge-difficulty-${difficulty}`}>Advanced</Badge>;
    default:
      return <Badge variant="outline" data-testid={`badge-difficulty-${difficulty}`}>{difficulty}</Badge>;
  }
}

export default function HackathonPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const { toast } = useToast();

  const filtered = hackathons.filter((h) => {
    if (statusFilter !== "all" && h.status !== statusFilter) return false;
    if (difficultyFilter !== "all" && h.difficulty !== difficultyFilter) return false;
    return true;
  });

  const handleAction = () => {
    toast({ title: "Coming soon", description: "This feature is not yet available." });
  };

  return (
    <div className="h-full overflow-auto" data-testid="page-hackathon">
      <div className="bg-muted/50 border-b">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-page-title">
              Quantum Hackathons
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl" data-testid="text-page-subtitle">
            Compete, collaborate, and push the boundaries of quantum computing. Join hackathons ranging from beginner-friendly to advanced research challenges.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3" data-testid="filter-bar">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-status-all">All Status</SelectItem>
              <SelectItem value="upcoming" data-testid="option-status-upcoming">Upcoming</SelectItem>
              <SelectItem value="active" data-testid="option-status-active">Active</SelectItem>
              <SelectItem value="completed" data-testid="option-status-completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-difficulty-filter">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="option-difficulty-all">All Difficulty</SelectItem>
              <SelectItem value="Beginner" data-testid="option-difficulty-beginner">Beginner</SelectItem>
              <SelectItem value="Intermediate" data-testid="option-difficulty-intermediate">Intermediate</SelectItem>
              <SelectItem value="Advanced" data-testid="option-difficulty-advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((hackathon) => (
            <Card key={hackathon.id} data-testid={`card-hackathon-${hackathon.id}`}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(hackathon.status)}
                  {getDifficultyBadge(hackathon.difficulty)}
                </div>
                <CardTitle className="text-lg" data-testid={`text-hackathon-title-${hackathon.id}`}>
                  {hackathon.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground" data-testid={`text-hackathon-desc-${hackathon.id}`}>
                  {hackathon.description}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span data-testid={`text-hackathon-dates-${hackathon.id}`}>
                    {format(new Date(hackathon.startDate), "MMM d")} - {format(new Date(hackathon.endDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span data-testid={`text-hackathon-team-${hackathon.id}`}>
                    Up to {hackathon.maxTeamSize} members
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Trophy className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div data-testid={`text-hackathon-prizes-${hackathon.id}`}>
                    <span className="font-medium">1st:</span> {hackathon.prizes[0]}
                    {" / "}
                    <span className="font-medium">2nd:</span> {hackathon.prizes[1]}
                    {" / "}
                    <span className="font-medium">3rd:</span> {hackathon.prizes[2]}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {hackathon.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs"
                      data-testid={`badge-tag-${hackathon.id}-${tag}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                {hackathon.status === "upcoming" && (
                  <Button
                    className="w-full"
                    onClick={handleAction}
                    data-testid={`button-register-${hackathon.id}`}
                  >
                    Register
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {hackathon.status === "active" && (
                  <Button
                    className="w-full"
                    variant="default"
                    onClick={handleAction}
                    data-testid={`button-join-${hackathon.id}`}
                  >
                    Join Now
                    <Zap className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {hackathon.status === "completed" && (
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleAction}
                    data-testid={`button-results-${hackathon.id}`}
                  >
                    View Results
                    <Eye className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <Zap className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground" data-testid="text-no-hackathons">
              No hackathons match your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
