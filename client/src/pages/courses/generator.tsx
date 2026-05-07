import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Loader2, Wand2, FileUp, CheckCircle2, AlertCircle,
  Volume2, Image as ImageIcon, RefreshCw, ExternalLink, Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useGenerateCourse, useCourse } from "@/hooks/use-courses";
import { useLocation, useSearch } from "wouter";
import MarkdownContent from "@/components/markdown-content";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

export default function CourseGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const searchStr = useSearch();
  const queryClient = useQueryClient();

  // Parse URL params (from analysis page "Create Course" links)
  const params = new URLSearchParams(searchStr);

  const [courseData, setCourseData] = useState({
    title: params.get("title") || "",
    audience: "all",
    depth: "intermediate",
  });

  // Track the generated course ID for polling
  const [generatingCourseId, setGeneratingCourseId] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const generateMutation = useGenerateCourse();

  // Poll the course while generating
  const { data: generatedCourse, refetch: refetchCourse } = useCourse(
    generatingCourseId || 0,
    { refetchInterval: isPolling ? 2000 : false },
  );

  // Parse progress from course
  const genStatus = generatedCourse?.generationStatus;
  const progressData = generatedCourse?.generationProgress
    ? (() => { try { return JSON.parse(generatedCourse.generationProgress as string); } catch { return null; } })()
    : null;

  // Stop polling when done
  useEffect(() => {
    if (genStatus === "completed" || genStatus === "failed") {
      setIsPolling(false);
      if (genStatus === "completed") {
        toast({ title: "Course Generated! ✨", description: "Your AI-powered course is ready to review." });
      } else {
        toast({ title: "Generation Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
      }
    }
  }, [genStatus]);

  const handleGenerate = async () => {
    if (!courseData.title.trim()) {
      toast({ title: "Enter a topic", description: "Please provide a course title or topic.", variant: "destructive" });
      return;
    }

    try {
      const course = await generateMutation.mutateAsync(courseData);
      setGeneratingCourseId(course.id);
      setIsPolling(true);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to start generation", variant: "destructive" });
    }
  };

  const handleRetry = () => {
    setGeneratingCourseId(null);
    setIsPolling(false);
  };

  const handlePublish = async () => {
    if (!generatingCourseId) return;
    setIsPublishing(true);
    try {
      await apiRequest("PATCH", `/api/courses/${generatingCourseId}/publish`);
      await refetchCourse();
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Published! 🎉", description: "Course is now available in the library." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const isGenerating = isPolling || generateMutation.isPending;
  const isCompleted = genStatus === "completed";
  const isFailed = genStatus === "failed";
  const isPublished = generatedCourse?.status === "published";
  const modules = (generatedCourse as any)?.modules || [];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Course Builder</h1>
          <p className="text-muted-foreground">Generate comprehensive training modules powered by AI.</p>
        </div>
        {isCompleted && generatingCourseId && (
          <div className="flex gap-3">
            {!isPublished ? (
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                className="shadow-lg bg-green-600 hover:bg-green-700"
              >
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                Publish Course
              </Button>
            ) : (
              <Button variant="outline" onClick={handlePublish} disabled={isPublishing}>
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Unpublish
              </Button>
            )}
            <Button
              onClick={() => setLocation(`/courses/${generatingCourseId}`)}
              data-testid="button-view-course"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Course
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Configuration Panel */}
        <Card className="lg:col-span-4 h-fit">
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Define the scope and source for AI generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Source Materials</Label>
              <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 bg-muted/50">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                <p className="text-xs text-center text-muted-foreground">Upload PDFs, PPTs, or Transcripts</p>
                <Button variant="secondary" size="sm">Browse Files</Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Topic or Title</Label>
              <Input
                value={courseData.title}
                onChange={e => setCourseData({ ...courseData, title: e.target.value })}
                placeholder="e.g. Cybersecurity Fundamentals"
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select
                value={courseData.audience}
                onValueChange={v => setCourseData({ ...courseData, audience: v })}
                disabled={isGenerating}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">General Employees</SelectItem>
                  <SelectItem value="tech">Technical Staff</SelectItem>
                  <SelectItem value="leadership">Leadership Team</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Content Depth</Label>
              <Select
                value={courseData.depth}
                onValueChange={v => setCourseData({ ...courseData, depth: v })}
                disabled={isGenerating}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Overview (Quick)</SelectItem>
                  <SelectItem value="intermediate">Standard (Detailed)</SelectItem>
                  <SelectItem value="advanced">Specialized (Deep Dive)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || isCompleted}
              data-testid="button-generate"
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? "Generating..." : "Generate Course"}
            </Button>

            {isFailed && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRetry}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Result Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* Progress during generation */}
          {isGenerating && progressData && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Wand2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">AI is building your course...</h3>
                    <p className="text-sm text-muted-foreground">{progressData.step}</p>
                  </div>
                </div>
                <Progress value={progressData.pct || 0} className="h-2.5" />
                <p className="text-xs text-muted-foreground mt-2 text-right">{progressData.pct || 0}% complete</p>
              </CardContent>
            </Card>
          )}

          {/* Failed state */}
          {isFailed && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-6 flex items-center gap-4">
                <AlertCircle className="h-8 w-8 text-destructive shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg">Generation Failed</h3>
                  <p className="text-sm text-muted-foreground">
                    {progressData?.step || "Something went wrong during course generation. Please try again."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed: show modules */}
          {isCompleted && modules.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      {generatedCourse?.title || "Generated Course"}
                    </CardTitle>
                    <CardDescription>{generatedCourse?.description}</CardDescription>
                  </div>
                  {isPublished ? (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 px-3 py-1.5 rounded-full">
                      <Globe className="h-3 w-3" /> Published
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
                      Draft
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="modules">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="modules">Modules & Content</TabsTrigger>
                    <TabsTrigger value="objectives">Learning Objectives</TabsTrigger>
                  </TabsList>
                  <TabsContent value="modules" className="space-y-4 pt-4">
                    {modules.map((m: any, i: number) => (
                      <div key={m.id || i} className="border rounded-lg overflow-hidden bg-card">
                        <div className="p-4 border-b border-border/50 flex justify-between items-center">
                          <h4 className="font-bold flex items-center gap-2">
                            <span className="bg-primary/10 text-primary w-6 h-6 rounded text-xs flex items-center justify-center">
                              {i + 1}
                            </span>
                            {m.title}
                          </h4>
                          <div className="flex gap-2">
                            {m.audioUrl && (
                              <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full">
                                <Volume2 className="h-3 w-3" /> Audio
                              </span>
                            )}
                            {m.images && m.images.length > 0 && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-full">
                                <ImageIcon className="h-3 w-3" /> {m.images.length} img
                              </span>
                            )}
                            {m.quiz && (
                              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> Quiz
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-4 max-h-[300px] overflow-y-auto">
                          <MarkdownContent content={m.content?.slice(0, 800) + (m.content?.length > 800 ? "\n\n*...content truncated for preview...*" : "")} />
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="objectives" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      {(generatedCourse?.objectives as string[] || []).map((obj: string, i: number) => (
                        <div key={i} className="flex gap-2 items-center bg-muted/30 p-3 rounded">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm">{obj}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {!isGenerating && !isCompleted && !isFailed && (
            <div className="h-[400px] flex flex-col items-center justify-center text-center border-2 border-dashed rounded-xl bg-muted/10">
              <Wand2 className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-muted-foreground">No Course Draft Yet</h3>
              <p className="text-sm text-muted-foreground/60 max-w-xs">
                Fill out the configuration to have AI generate your course structure and content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
