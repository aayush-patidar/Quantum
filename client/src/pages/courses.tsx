import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Course, CourseLesson } from "@shared/schema";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BookOpen, Plus, ChevronDown, ChevronRight, ArrowLeft, CheckCircle, GraduationCap } from "lucide-react";

interface CourseWithLessons extends Course {
  lessons?: CourseLesson[];
}

interface EnrollmentCheck {
  enrolled: boolean;
  enrollment?: { progress: number; completedLessons: string[] | null };
}

function getDifficultyVariant(difficulty: string) {
  switch (difficulty) {
    case "beginner":
      return <Badge variant="secondary" data-testid={`badge-difficulty-${difficulty}`}>{difficulty}</Badge>;
    case "intermediate":
      return <Badge className="bg-blue-600 text-white no-default-hover-elevate" data-testid={`badge-difficulty-${difficulty}`}>{difficulty}</Badge>;
    case "advanced":
      return <Badge className="bg-orange-600 text-white no-default-hover-elevate" data-testid={`badge-difficulty-${difficulty}`}>{difficulty}</Badge>;
    default:
      return <Badge variant="secondary" data-testid={`badge-difficulty-${difficulty}`}>{difficulty}</Badge>;
  }
}

function CourseDetail({
  courseId,
  onBack,
}: {
  courseId: string;
  onBack: () => void;
}) {
  const { toast } = useToast();
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  const { data: course, isLoading: courseLoading } = useQuery<CourseWithLessons>({
    queryKey: ["/api/courses", courseId],
  });

  const { data: enrollment } = useQuery<EnrollmentCheck>({
    queryKey: ["/api/courses", courseId, "enroll"],
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/courses/${courseId}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "enroll"] });
      toast({ title: "Enrolled successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
    },
  });

  const progressMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const currentCompleted = enrollment?.enrollment?.completedLessons ?? [];
      const newCompleted = currentCompleted.includes(lessonId)
        ? currentCompleted
        : [...currentCompleted, lessonId];
      const totalLessons = course?.lessons?.length ?? 1;
      const progress = Math.round((newCompleted.length / totalLessons) * 100);
      await apiRequest("PATCH", `/api/courses/${courseId}/progress`, {
        progress,
        completedLessons: newCompleted,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId, "enroll"] });
      toast({ title: "Progress updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  if (courseLoading) {
    return (
      <div className="space-y-4" data-testid="course-detail-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!course) return null;

  const completedLessons = enrollment?.enrollment?.completedLessons ?? [];
  const progressValue = enrollment?.enrollment?.progress ?? 0;
  const sortedLessons = [...(course.lessons ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return (
    <div className="space-y-6" data-testid="course-detail">
      <Button variant="ghost" onClick={onBack} data-testid="button-back-courses">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Courses
      </Button>

      <div>
        <h2 className="text-2xl font-bold" data-testid="text-course-title">{course.title}</h2>
        <p className="text-muted-foreground mt-1" data-testid="text-course-description">
          {course.description}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {getDifficultyVariant(course.difficulty)}
          {course.category && (
            <Badge variant="outline" data-testid="badge-course-category">{course.category}</Badge>
          )}
          {course.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" data-testid={`badge-tag-${tag}`}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {enrollment?.enrolled ? (
        <Card data-testid="card-progress">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressValue} className="h-2" data-testid="progress-bar" />
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-progress-value">
              {progressValue}% complete
            </p>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending} data-testid="button-enroll-detail">
          {enrollMutation.isPending ? "Enrolling..." : "Enroll in this Course"}
        </Button>
      )}

      <div className="space-y-2">
        <h3 className="text-lg font-semibold" data-testid="text-lessons-heading">
          Lessons ({sortedLessons.length})
        </h3>
        {sortedLessons.map((lesson) => {
          const isCompleted = completedLessons.includes(lesson.id);
          const isExpanded = expandedLesson === lesson.id;
          return (
            <Collapsible
              key={lesson.id}
              open={isExpanded}
              onOpenChange={() => setExpandedLesson(isExpanded ? null : lesson.id)}
            >
              <Card data-testid={`card-lesson-${lesson.id}`}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 cursor-pointer">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-medium" data-testid={`text-lesson-title-${lesson.id}`}>
                        {lesson.sortOrder != null ? `${lesson.sortOrder}. ` : ""}
                        {lesson.title}
                      </span>
                    </div>
                    {enrollment?.enrolled && !isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          progressMutation.mutate(lesson.id);
                        }}
                        disabled={progressMutation.isPending}
                        data-testid={`button-complete-lesson-${lesson.id}`}
                      >
                        Mark Complete
                      </Button>
                    )}
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`text-lesson-content-${lesson.id}`}>
                      {lesson.content ?? "No content available."}
                    </p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
        {sortedLessons.length === 0 && (
          <p className="text-muted-foreground text-sm" data-testid="text-no-lessons">No lessons yet.</p>
        )}
      </div>
    </div>
  );
}

function CreateCourseDialog({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      await apiRequest("POST", "/api/courses", {
        title,
        description,
        difficulty,
        category,
        tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course created" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDifficulty("beginner");
      setCategory("");
      setTagsInput("");
      onCreated();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create course", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-course">
          <Plus className="mr-2 h-4 w-4" />
          Create Course
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-create-course">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="course-title">Title</Label>
            <Input
              id="course-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-course-title"
            />
          </div>
          <div>
            <Label htmlFor="course-description">Description</Label>
            <Textarea
              id="course-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-course-description"
            />
          </div>
          <div>
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger data-testid="select-course-difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="course-category">Category</Label>
            <Input
              id="course-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              data-testid="input-course-category"
            />
          </div>
          <div>
            <Label htmlFor="course-tags">Tags (comma-separated)</Label>
            <Input
              id="course-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="quantum, circuits, algorithms"
              data-testid="input-course-tags"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !title.trim()}
            data-testid="button-submit-course"
          >
            {createMutation.isPending ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddLessonDialog({ courseId }: { courseId: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sortOrder, setSortOrder] = useState("1");

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/courses/${courseId}/lessons`, {
        title,
        content,
        sortOrder: parseInt(sortOrder, 10) || 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Lesson added" });
      setOpen(false);
      setTitle("");
      setContent("");
      setSortOrder("1");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to add lesson", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid={`button-add-lesson-${courseId}`}>
          <Plus className="mr-1 h-3 w-3" />
          Add Lesson
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-add-lesson">
        <DialogHeader>
          <DialogTitle>Add Lesson</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-lesson-title"
            />
          </div>
          <div>
            <Label htmlFor="lesson-content">Content</Label>
            <Textarea
              id="lesson-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              data-testid="input-lesson-content"
            />
          </div>
          <div>
            <Label htmlFor="lesson-sort-order">Sort Order</Label>
            <Input
              id="lesson-sort-order"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              data-testid="input-lesson-sort-order"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => addMutation.mutate()}
            disabled={addMutation.isPending || !title.trim()}
            data-testid="button-submit-lesson"
          >
            {addMutation.isPending ? "Adding..." : "Add Lesson"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  const queryKeyBase = "/api/courses";
  const queryKey =
    difficultyFilter === "all"
      ? [queryKeyBase]
      : [`${queryKeyBase}?difficulty=${difficultyFilter}`];

  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey,
  });

  const { data: enrolledCourses, isLoading: enrolledLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses?enrolled=true"],
  });

  const myCourses = useMemo(() => {
    if (!courses || !user) return [];
    return courses.filter((c) => c.instructorId === user.id);
  }, [courses, user]);

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("POST", `/api/courses/${courseId}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Enrolled successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Enrollment failed", description: err.message, variant: "destructive" });
    },
  });

  if (selectedCourseId) {
    return (
      <div className="p-6" data-testid="page-courses">
        <CourseDetail
          courseId={selectedCourseId}
          onBack={() => setSelectedCourseId(null)}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-courses">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Quantum Courses</h1>
        <p className="text-muted-foreground" data-testid="text-page-subtitle">
          Structured learning paths for quantum computing
        </p>
      </div>

      <Tabs defaultValue="browse" data-testid="tabs-courses">
        <TabsList data-testid="tabs-list-courses">
          <TabsTrigger value="browse" data-testid="tab-browse">Browse Courses</TabsTrigger>
          <TabsTrigger value="enrolled" data-testid="tab-enrolled">My Courses</TabsTrigger>
          <TabsTrigger value="teach" data-testid="tab-teach">Teach</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            {["all", "beginner", "intermediate", "advanced"].map((level) => (
              <Button
                key={level}
                size="sm"
                variant={difficultyFilter === level ? "default" : "outline"}
                onClick={() => setDifficultyFilter(level)}
                data-testid={`button-filter-${level}`}
                className="toggle-elevate"
              >
                {level === "all" ? "All" : level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48" data-testid={`skeleton-course-${i}`} />
              ))}
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-course-${course.id}`}
                  onClick={() => setSelectedCourseId(course.id)}
                >
                  <CardHeader className="space-y-1">
                    <CardTitle className="text-base" data-testid={`text-course-title-${course.id}`}>
                      {course.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-course-desc-${course.id}`}>
                      {course.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-1">
                      {getDifficultyVariant(course.difficulty)}
                      {course.category && (
                        <Badge variant="outline" data-testid={`badge-category-${course.id}`}>
                          {course.category}
                        </Badge>
                      )}
                      {course.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" data-testid={`badge-tag-${course.id}-${tag}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground" data-testid={`text-lesson-count-${course.id}`}>
                      <BookOpen className="inline h-3 w-3 mr-1" />
                      Course
                    </span>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        enrollMutation.mutate(course.id);
                      }}
                      disabled={enrollMutation.isPending}
                      data-testid={`button-enroll-${course.id}`}
                    >
                      Enroll
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-courses">No courses available.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="enrolled" className="mt-4">
          {enrolledLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32" data-testid={`skeleton-enrolled-${i}`} />
              ))}
            </div>
          ) : enrolledCourses && enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledCourses.map((course) => (
                <Card
                  key={course.id}
                  className="hover-elevate cursor-pointer"
                  data-testid={`card-enrolled-${course.id}`}
                  onClick={() => setSelectedCourseId(course.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-base" data-testid={`text-enrolled-title-${course.id}`}>
                      {course.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-1 mb-2">
                      {getDifficultyVariant(course.difficulty)}
                    </div>
                    <Progress value={0} className="h-2" data-testid={`progress-enrolled-${course.id}`} />
                    <p className="text-xs text-muted-foreground mt-1" data-testid={`text-enrolled-progress-${course.id}`}>
                      In Progress
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-enrolled">
                You haven't enrolled in any courses yet.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="teach" className="space-y-4 mt-4">
          <CreateCourseDialog onCreated={() => {}} />

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" data-testid={`skeleton-my-course-${i}`} />
              ))}
            </div>
          ) : myCourses.length > 0 ? (
            <div className="space-y-3">
              {myCourses.map((course) => (
                <Card key={course.id} data-testid={`card-my-course-${course.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                    <div>
                      <CardTitle className="text-base" data-testid={`text-my-course-title-${course.id}`}>
                        {course.title}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {getDifficultyVariant(course.difficulty)}
                        <Badge variant={course.isPublished ? "default" : "secondary"} data-testid={`badge-published-${course.id}`}>
                          {course.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    </div>
                    <AddLessonDialog courseId={course.id} />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-teaching">
                You haven't created any courses yet.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}