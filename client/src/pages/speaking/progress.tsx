import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSpeakingProgress } from "@/hooks/use-speaking";
import { ArrowLeft, Trophy, Target, TrendingUp, BookOpen } from "lucide-react";

export default function SpeakingProgressPage() {
  const { data: progress, isLoading } = useSpeakingProgress();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">No progress data available</p>
            <Link href="/speaking/topics">
              <Button className="mt-4">Start Learning</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Link href="/speaking/topics">
        <Button variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Topics
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Your Speaking Progress</h1>
        <p className="text-muted-foreground mt-1">
          Track your improvement and celebrate your achievements
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Lessons Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <div className="text-3xl font-bold">
                {progress.completedLessons}/{progress.totalLessons}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overall Completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <div className="text-3xl font-bold">{Math.round(progress.completionPct)}%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <div className="text-3xl font-bold">{progress.avgScore}%</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div className="text-3xl font-bold">{progress.totalAttempts}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
          <CardDescription>
            You've completed {progress.completedLessons} out of {progress.totalLessons} lessons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progress.completionPct} className="h-4" />
        </CardContent>
      </Card>

      {/* Topic-wise Progress */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Progress by Topic</h2>
        <div className="grid gap-4">
          {progress.topicProgress.map((topic) => {
            const topicProgress = topic.progress || {
              totalLessons: 0,
              completedLessons: 0,
              completionPct: 0,
              avgScore: 0,
            };

            return (
              <Link key={topic.id} href={`/speaking/topics/${topic.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-3xl">{topic.icon || "📚"}</div>
                        <div>
                          <CardTitle className="text-lg">{topic.name}</CardTitle>
                          <CardDescription>
                            {topicProgress.completedLessons} / {topicProgress.totalLessons} lessons completed
                          </CardDescription>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={topicProgress.avgScore >= 70 ? "default" : "secondary"}>
                          {topicProgress.avgScore > 0 ? `${Math.round(topicProgress.avgScore)}%` : "Not started"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Progress value={topicProgress.completionPct} className="h-3" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {progress.avgScore >= 70 && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-900 dark:text-green-100">Great Job!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-green-800 dark:text-green-200">
              You're doing excellent! Your average score of {progress.avgScore}% shows great improvement
              in your English speaking skills. Keep up the fantastic work!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
