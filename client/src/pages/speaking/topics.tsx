import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpeakingTopics, useSpeakingRecommendations } from "@/hooks/use-speaking";
import { CheckCircle2, Circle, BookOpen, Trophy } from "lucide-react";

export default function SpeakingTopicsPage() {
  const { data: topics, isLoading } = useSpeakingTopics();
  const { data: recommendations } = useSpeakingRecommendations();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Speaking Practice</h1>
          <p className="text-muted-foreground mt-1">
            Choose a topic to practice your English speaking skills
          </p>
        </div>
        <Link href="/speaking/progress">
          <Button variant="outline">
            <Trophy className="mr-2 h-4 w-4" />
            View Progress
          </Button>
        </Link>
      </div>

      {/* Recommendations Section */}
      {recommendations?.continueLesson || recommendations?.nextLesson ? (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Recommended for You
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations?.continueLesson && (
              <Link href={`/speaking/practice/${recommendations.continueLesson.id}`}>
                <Button className="w-full justify-start" variant="default">
                  <Circle className="mr-2 h-4 w-4" />
                  Continue: {recommendations.continueLesson.title}
                </Button>
              </Link>
            )}
            {recommendations?.nextLesson && (
              <Link href={`/speaking/practice/${recommendations.nextLesson.id}`}>
                <Button className="w-full justify-start" variant="outline">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Next Lesson: {recommendations.nextLesson.title}
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics?.map((topic) => {
          const progress = topic.progress || {
            totalLessons: 0,
            completedLessons: 0,
            completionPct: 0,
            avgScore: 0,
          };

          return (
            <Link key={topic.id} href={`/speaking/topics/${topic.id}`}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-4xl mb-2">{topic.icon || "📚"}</div>
                      <CardTitle className="text-xl">{topic.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {topic.description}
                      </CardDescription>
                    </div>
                    {progress.completionPct === 100 && (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {progress.completedLessons} / {progress.totalLessons} lessons
                      </span>
                    </div>
                    <Progress value={progress.completionPct} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant={progress.avgScore >= 70 ? "default" : "secondary"}>
                      {progress.avgScore > 0 ? `Avg: ${Math.round(progress.avgScore)}%` : "Not started"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {progress.totalLessons} lessons
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {topics?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No topics available yet</p>
            <p className="text-sm text-muted-foreground">
              Topics will appear here once they are added
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
