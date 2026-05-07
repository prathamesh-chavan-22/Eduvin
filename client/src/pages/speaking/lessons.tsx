import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpeakingTopic } from "@/hooks/use-speaking";
import { ArrowLeft, CheckCircle2, Circle, Star, Trophy, Lock } from "lucide-react";

export default function TopicLessonsPage() {
  const params = useParams();
  const topicId = params.id ? parseInt(params.id) : null;
  const { data: topic, isLoading } = useSpeakingTopic(topicId);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">Topic not found</p>
            <Link href="/speaking/topics">
              <Button className="mt-4">Back to Topics</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = topic.progress || {
    totalLessons: 0,
    completedLessons: 0,
    completionPct: 0,
    avgScore: 0,
  };

  // Group lessons by difficulty level
  const lessonsByLevel = (topic.lessons || []).reduce((acc, lesson) => {
    const level = lesson.difficultyLevel;
    if (!acc[level]) acc[level] = [];
    acc[level].push(lesson);
    return acc;
  }, {} as Record<number, typeof topic.lessons>);

  const difficultyLabels: Record<number, string> = {
    1: "Beginner",
    2: "Elementary",
    3: "Intermediate",
    4: "Upper Intermediate",
    5: "Advanced",
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Link href="/speaking/topics">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topics
        </Button>
      </Link>

      {/* Topic Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="text-5xl">{topic.icon || "📚"}</div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{topic.name}</CardTitle>
              <CardDescription className="mt-2">{topic.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">
                  {progress.completedLessons} / {progress.totalLessons} complete
                </span>
              </div>
              <Progress value={progress.completionPct} className="h-3" />
            </div>

            <div className="flex gap-4">
              <Badge variant={progress.avgScore >= 70 ? "default" : "secondary"} className="px-4 py-2">
                <Trophy className="mr-2 h-4 w-4" />
                Average Score: {Math.round(progress.avgScore)}%
              </Badge>
              <Badge variant="outline" className="px-4 py-2">
                {progress.totalLessons} Lessons
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons by Difficulty Level */}
      {Object.entries(lessonsByLevel)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([level, lessons]) => {
          const levelNum = parseInt(level);
          const completedInLevel = lessons.filter((l) => l.progress?.completed).length;
          const levelProgress = (completedInLevel / lessons.length) * 100;

          return (
            <div key={level} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {[...Array(levelNum)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                  ))}
                </div>
                <h2 className="text-xl font-semibold">{difficultyLabels[levelNum]}</h2>
                <Badge variant="outline">
                  {completedInLevel}/{lessons.length} complete
                </Badge>
              </div>

              <div className="grid gap-4">
                {lessons.map((lesson, idx) => {
                  const isCompleted = lesson.progress?.completed || false;
                  const attempts = lesson.progress?.attempts || 0;
                  const bestScore = lesson.progress?.bestScore || 0;

                  return (
                    <Card key={lesson.id} className={isCompleted ? "border-green-500/50" : ""}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {isCompleted ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                              <CardTitle className="text-lg">{lesson.title}</CardTitle>
                            </div>
                            <CardDescription>{lesson.description}</CardDescription>
                          </div>
                          <Link href={`/speaking/practice/${lesson.id}`}>
                            <Button>
                              {attempts > 0 ? "Practice Again" : "Start Lesson"}
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>

                      {lesson.progress && (
                        <CardContent>
                          <div className="flex gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Attempts:</span>{" "}
                              <span className="font-medium">{attempts}</span>
                            </div>
                            {bestScore > 0 && (
                              <div>
                                <span className="text-muted-foreground">Best Score:</span>{" "}
                                <Badge
                                  variant={bestScore >= 70 ? "default" : "secondary"}
                                  className="ml-1"
                                >
                                  {Math.round(bestScore)}%
                                </Badge>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

      {(!topic.lessons || topic.lessons.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Circle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No lessons available yet</p>
            <p className="text-sm text-muted-foreground">
              Lessons for this topic are coming soon
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
