import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpen,
  Clock,
  GraduationCap,
  Atom,
  CircuitBoard,
  Brain,
  ShieldCheck,
  Cpu,
  Layers,
} from "lucide-react";

interface Course {
  id: string;
  title: string;
  description: string;
  lessons: number;
  level: "beginner" | "intermediate" | "advanced";
  hours: number;
  progress: number;
  icon: typeof BookOpen;
}

const courses: Course[] = [
  {
    id: "fundamentals",
    title: "Quantum Computing Fundamentals",
    description: "Master the core principles of quantum mechanics and quantum computing. Learn about qubits, superposition, entanglement, and quantum measurement from the ground up.",
    lessons: 12,
    level: "beginner",
    hours: 8,
    progress: 0,
    icon: Atom,
  },
  {
    id: "circuit-design",
    title: "Circuit Design Masterclass",
    description: "Deep dive into quantum circuit design patterns, gate decomposition, circuit optimization techniques, and transpilation for different hardware topologies.",
    lessons: 16,
    level: "intermediate",
    hours: 12,
    progress: 0,
    icon: CircuitBoard,
  },
  {
    id: "algorithms",
    title: "Quantum Algorithms Deep Dive",
    description: "Explore advanced quantum algorithms including Shor's factoring, Grover's search, quantum phase estimation, QFT, and their computational complexity advantages.",
    lessons: 20,
    level: "advanced",
    hours: 16,
    progress: 0,
    icon: Brain,
  },
  {
    id: "error-correction",
    title: "Quantum Error Correction",
    description: "Study quantum error correction codes, fault-tolerant quantum computing, surface codes, stabilizer formalism, and noise mitigation strategies for NISQ devices.",
    lessons: 14,
    level: "advanced",
    hours: 10,
    progress: 0,
    icon: ShieldCheck,
  },
  {
    id: "qml",
    title: "Quantum Machine Learning",
    description: "Learn quantum-enhanced machine learning techniques including variational classifiers, quantum kernels, quantum neural networks, and hybrid quantum-classical models.",
    lessons: 18,
    level: "intermediate",
    hours: 14,
    progress: 0,
    icon: GraduationCap,
  },
  {
    id: "hardware",
    title: "Hardware & Architecture",
    description: "Understand quantum hardware technologies including superconducting qubits, trapped ions, neutral atoms, photonic systems, and their engineering trade-offs.",
    lessons: 10,
    level: "beginner",
    hours: 6,
    progress: 0,
    icon: Cpu,
  },
];

const levelFilters = ["all", "beginner", "intermediate", "advanced"] as const;

function getLevelBadge(level: string) {
  switch (level) {
    case "beginner":
      return <Badge className="bg-green-600 text-white no-default-hover-elevate" data-testid={`badge-level-${level}`}>Beginner</Badge>;
    case "intermediate":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-level-${level}`}>Intermediate</Badge>;
    case "advanced":
      return <Badge className="bg-purple-600 text-white no-default-hover-elevate" data-testid={`badge-level-${level}`}>Advanced</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-level-${level}`}>{level}</Badge>;
  }
}

export default function EducationPage() {
  const [filter, setFilter] = useState<typeof levelFilters[number]>("all");

  const filteredCourses = filter === "all"
    ? courses
    : courses.filter((c) => c.level === filter);

  return (
    <div className="p-6 space-y-6" data-testid="page-education">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Education</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">Learn quantum computing from beginner to advanced</p>
      </div>

      <div className="flex flex-wrap items-center gap-2" data-testid="filter-level">
        {levelFilters.map((level) => (
          <Button
            key={level}
            variant={filter === level ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(level)}
            className="toggle-elevate"
            data-testid={`button-filter-${level}`}
          >
            {level === "all" ? (
              <>
                <Layers className="w-4 h-4 mr-1" />
                All Courses
              </>
            ) : (
              level.charAt(0).toUpperCase() + level.slice(1)
            )}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-courses">
        {filteredCourses.map((course) => {
          const Icon = course.icon;
          return (
            <Card key={course.id} data-testid={`card-course-${course.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-md bg-muted p-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  {getLevelBadge(course.level)}
                </div>
                <CardTitle className="text-lg mt-2" data-testid={`text-course-title-${course.id}`}>
                  {course.title}
                </CardTitle>
                <CardDescription data-testid={`text-course-description-${course.id}`}>
                  {course.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1" data-testid={`text-course-lessons-${course.id}`}>
                    <BookOpen className="w-4 h-4" />
                    {course.lessons} lessons
                  </span>
                  <span className="flex items-center gap-1" data-testid={`text-course-hours-${course.id}`}>
                    <Clock className="w-4 h-4" />
                    {course.hours} hours
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span data-testid={`text-course-progress-${course.id}`}>{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} data-testid={`progress-course-${course.id}`} />
                </div>
                <Button className="w-full" data-testid={`button-start-course-${course.id}`}>
                  Start Course
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}