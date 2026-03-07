import { useParams, useLocation } from "wouter";
import { useCourse, useCourseModules, useCourseConceptGraph, useRegenerateCourseConceptGraph } from "@/hooks/use-courses";
import { useEnrollments, useUpdateProgress, useCreateEnrollment } from "@/hooks/use-enrollments";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, ChevronRight, PlayCircle, Volume2, XCircle, Network } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import InlineTutorContent from "@/components/tutor/inline-tutor-content";
import { useUpdateLearnerProfile } from "@/hooks/use-tutor";
import MermaidDiagram from "@/components/mermaid-diagram";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
}

interface QuizData {
  questions: QuizQuestion[];
}

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();

  const { user } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: modules = [], isLoading: modulesLoading } = useCourseModules(courseId);
  const { data: conceptGraph, isLoading: graphLoading, isError: graphError } = useCourseConceptGraph(courseId, {
    refetchInterval: 5000,
  });
  const regenerateGraph = useRegenerateCourseConceptGraph(courseId);
  const { toast } = useToast();

  const { data: enrollments = [] } = useEnrollments();
  const updateProgress = useUpdateProgress();
  const enroll = useCreateEnrollment();

  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [contentView, setContentView] = useState<"module" | "graph">("module");
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Map<number, number>>(new Map());
  const [showResult, setShowResult] = useState(false);
  const updateLearnerProfile = useUpdateLearnerProfile();

  // Find or auto-enroll
  const myEnrollment = enrollments.find(e => e.courseId === courseId && e.userId === user?.id);

  useEffect(() => {
    if (modules.length > 0 && !activeModuleId) {
      setActiveModuleId(modules[0].id);
    }
  }, [modules, activeModuleId]);

  // Parse quiz data from the active module
  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];
  const activeIndex = modules.findIndex(m => m.id === activeModuleId);

  const quizData: QuizData | null = useMemo(() => {
    if (!activeModule?.quiz) return null;
    try {
      const parsed = JSON.parse(activeModule.quiz);
      if (parsed?.questions?.length > 0) return parsed;
      return null;
    } catch {
      return null;
    }
  }, [activeModule?.quiz]);

  const currentQuestion = quizData?.questions?.[currentQuestionIdx] || null;
  const totalQuestions = quizData?.questions?.length || 0;

  const resetQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedAnswer(null);
    setAnsweredQuestions(new Map());
    setShowResult(false);
  };

  if (courseLoading || modulesLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <Skeleton className="h-12 w-[300px]" />
        <div className="flex gap-8">
          <Skeleton className="w-64 h-[500px]" />
          <Skeleton className="flex-1 h-[500px]" />
        </div>
      </div>
    );
  }

  if (!course) return <div className="p-8">Course not found.</div>;

  const handleNextClick = async () => {
    if (!showQuiz) {
      // If there's quiz data, show the quiz; otherwise skip to next module
      if (quizData) {
        setShowQuiz(true);
        resetQuiz();
      } else {
        await handleModuleComplete();
      }
      return;
    }
  };

  const handleAnswerSelect = (answerIdx: number) => {
    if (showResult) return; // Don't allow changing after result shown
    setSelectedAnswer(answerIdx);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    const newAnswered = new Map(answeredQuestions);
    newAnswered.set(currentQuestionIdx, selectedAnswer);
    setAnsweredQuestions(newAnswered);
    setShowResult(true);
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIdx < totalQuestions - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz complete — update learner profile with quiz results
      if (quizData && activeModule) {
        const allAnswers = new Map(answeredQuestions);
        allAnswers.set(currentQuestionIdx, selectedAnswer!);
        let finalCorrect = 0;
        allAnswers.forEach((aIdx: number, qIdx: number) => {
          if (quizData.questions?.[qIdx]?.correct === aIdx) finalCorrect++;
        });
        const quizScore = Math.round((finalCorrect / totalQuestions) * 100);
        updateLearnerProfile.mutate({ quizScore, moduleTitle: activeModule.title });
      }
      await handleModuleComplete();
    }
  };

  const handleModuleComplete = async () => {
    if (!myEnrollment) {
      const newE = await enroll.mutateAsync({ courseId, userId: user!.id, status: "in_progress", progressPct: 0 });
      await handleProgressUpdate(newE.id);
    } else {
      await handleProgressUpdate(myEnrollment.id);
    }
  };

  const handleProgressUpdate = async (enrollmentId: number) => {
    const nextPct = Math.round(((activeIndex + 1) / modules.length) * 100);
    const newStatus = nextPct === 100 ? "completed" : "in_progress";

    await updateProgress.mutateAsync({
      id: enrollmentId,
      data: { progressPct: nextPct, status: newStatus }
    });

    if (activeIndex < modules.length - 1) {
      setShowQuiz(false);
      resetQuiz();
      setActiveModuleId(modules[activeIndex + 1].id);
    } else {
      setShowQuiz(false);
      resetQuiz();
    }
  };

  // Calculate quiz score
  const correctCount = Array.from(answeredQuestions.entries()).filter(
    ([qIdx, aIdx]) => quizData?.questions?.[qIdx]?.correct === aIdx
  ).length;

  const handleOpenGraphInNewWindow = () => {
    if (!conceptGraph?.mermaid) {
      toast({
        variant: "destructive",
        title: "Graph not available",
        description: "Generate or load a concept graph first.",
      });
      return;
    }

    const popup = window.open("", "course-concept-graph", "width=1400,height=900");
    if (!popup) {
      toast({
        variant: "destructive",
        title: "Popup blocked",
        description: "Allow popups for this site to open the graph in a new window.",
      });
      return;
    }

    const title = course?.title ?? "Course";
    const mermaidContent = JSON.stringify(conceptGraph.mermaid);

    popup.document.open();
    popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} - Concept Graph</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; }
    .topbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #fff; position: sticky; top: 0; z-index: 10; }
    .controls { display: flex; align-items: center; gap: 8px; }
    button { border: 1px solid #cbd5e1; background: #fff; color: #0f172a; border-radius: 8px; padding: 6px 10px; font-size: 13px; cursor: pointer; }
    button:hover { background: #f1f5f9; }
    #canvasWrap { height: calc(100vh - 62px); overflow: auto; padding: 16px; }
    #canvas { transform-origin: top left; }
    #graph { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; min-width: max-content; }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
</head>
<body>
  <div class="topbar">
    <div>
      <strong>${title}</strong>
      <div style="font-size:12px;color:#475569;">Concept Graph Viewer</div>
    </div>
    <div class="controls">
      <button id="zoomOut">-</button>
      <span id="zoomValue" style="font-size:12px; min-width:52px; text-align:center;">100%</span>
      <button id="zoomIn">+</button>
      <button id="reset">Reset</button>
    </div>
  </div>
  <div id="canvasWrap">
    <div id="canvas">
      <div id="graph" class="mermaid"></div>
    </div>
  </div>
  <script>
    const graphEl = document.getElementById('graph');
    const canvas = document.getElementById('canvas');
    const zoomValue = document.getElementById('zoomValue');
    let scale = 1;
    const setScale = (next) => {
      scale = Math.max(0.4, Math.min(3, next));
      canvas.style.transform = 'scale(' + scale + ')';
      zoomValue.textContent = Math.round(scale * 100) + '%';
    };
    document.getElementById('zoomIn').addEventListener('click', () => setScale(scale + 0.15));
    document.getElementById('zoomOut').addEventListener('click', () => setScale(scale - 0.15));
    document.getElementById('reset').addEventListener('click', () => setScale(1));
    graphEl.textContent = ${mermaidContent};
    mermaid.initialize({ startOnLoad: true, securityLevel: 'loose', theme: 'default' });
  </script>
</body>
</html>`);
    popup.document.close();
  };

  return (
    <div className="h-full flex flex-col -m-4 lg:-m-8">
      {/* Header */}
      <div className="bg-background border-b border-border/50 p-4 lg:px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/courses")} className="hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight">{course.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={myEnrollment?.progressPct || 0} className="w-32 h-1.5" />
              <span className="text-xs text-muted-foreground font-medium">{myEnrollment?.progressPct || 0}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden bg-muted/10">
        {/* Sidebar */}
        <div className="w-80 border-r border-border/50 bg-background/50 flex flex-col">
          <div className="p-4 border-b border-border/50">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Course Content</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {modules.map((m, i) => {
              const isActive = m.id === activeModuleId;
              const isPast = myEnrollment ? (myEnrollment.progressPct >= Math.round(((i + 1) / modules.length) * 100)) : false;

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveModuleId(m.id);
                    setShowQuiz(false);
                    resetQuiz();
                    setContentView("module");
                  }}
                  className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all ${isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'hover:bg-muted text-foreground border border-transparent'
                    }`}
                >
                  <div className={`mt-0.5 shrink-0 ${isPast ? 'text-green-500' : (isActive ? 'text-primary' : 'text-muted-foreground')}`}>
                    {isPast ? <CheckCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold opacity-70 mb-0.5">Module {i + 1}</div>
                    <div className="text-sm font-medium leading-tight">{m.title}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className={`${contentView === "graph" ? "max-w-6xl" : "max-w-3xl"} mx-auto`}>
            {activeModule ? (
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="px-8 lg:px-12 pt-6 pb-2 border-b border-border/50 flex items-center justify-between gap-3 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Button
                      variant={contentView === "module" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setContentView("module");
                        setShowQuiz(false);
                      }}
                    >
                      Module Content
                    </Button>
                    <Button
                      variant={contentView === "graph" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setContentView("graph");
                        setShowQuiz(false);
                      }}
                    >
                      <Network className="w-4 h-4 mr-2" />
                      Course Graph
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {conceptGraph?.status === "ready"
                      ? "Graph ready"
                      : conceptGraph?.status === "generating"
                        ? "Graph is generating..."
                        : "Graph not generated yet"}
                  </div>
                </div>
                {showQuiz && quizData && currentQuestion ? (
                  <div className="p-8 lg:p-12 animate-in fade-in slide-in-from-bottom-4">
                    {/* Quiz Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                          📝 Knowledge Check
                        </h2>
                        <p className="text-muted-foreground text-sm mt-1">{activeModule.title}</p>
                      </div>
                      <div className="text-sm font-medium bg-muted px-3 py-1.5 rounded-full">
                        {currentQuestionIdx + 1} / {totalQuestions}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <Progress
                      value={((currentQuestionIdx + (showResult ? 1 : 0)) / totalQuestions) * 100}
                      className="h-1.5 mb-8"
                    />

                    {/* Question */}
                    <p className="font-medium text-lg mb-6 leading-relaxed">{currentQuestion.q}</p>

                    {/* Options */}
                    <div className="space-y-3">
                      {currentQuestion.options.map((opt, i) => {
                        let optionStyle = "hover:bg-muted/50 border-border/50";

                        if (showResult) {
                          if (i === currentQuestion.correct) {
                            optionStyle = "border-green-500 bg-green-50 dark:bg-green-950/30 ring-1 ring-green-500/50";
                          } else if (i === selectedAnswer && i !== currentQuestion.correct) {
                            optionStyle = "border-red-400 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-400/50";
                          } else {
                            optionStyle = "border-border/30 opacity-50";
                          }
                        } else if (selectedAnswer === i) {
                          optionStyle = "border-primary bg-primary/5 ring-1 ring-primary";
                        }

                        return (
                          <div
                            key={i}
                            onClick={() => handleAnswerSelect(i)}
                            className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center gap-3 ${optionStyle}`}
                          >
                            <span className="shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-bold">
                              {String.fromCharCode(65 + i)}
                            </span>
                            <span className="text-sm">{opt}</span>
                            {showResult && i === currentQuestion.correct && (
                              <CheckCircle className="w-5 h-5 text-green-500 ml-auto shrink-0" />
                            )}
                            {showResult && i === selectedAnswer && i !== currentQuestion.correct && (
                              <XCircle className="w-5 h-5 text-red-400 ml-auto shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Result feedback */}
                    {showResult && (
                      <div className={`mt-6 p-4 rounded-lg text-sm ${selectedAnswer === currentQuestion.correct
                        ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50"
                        : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                        }`}>
                        {selectedAnswer === currentQuestion.correct
                          ? "✅ Correct! Well done."
                          : `❌ Incorrect. The correct answer is: ${currentQuestion.options[currentQuestion.correct]}`
                        }
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-8 flex justify-end gap-3">
                      {!showResult ? (
                        <Button
                          onClick={handleSubmitAnswer}
                          disabled={selectedAnswer === null}
                          size="lg"
                        >
                          Check Answer
                        </Button>
                      ) : (
                        <Button onClick={handleNextQuestion} size="lg">
                          {currentQuestionIdx < totalQuestions - 1 ? (
                            <>Next Question <ChevronRight className="w-5 h-5 ml-1" /></>
                          ) : (
                            <>Complete Module <CheckCircle className="w-5 h-5 ml-1" /></>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : contentView === "graph" ? (
                  <div className="p-8 lg:p-12 animate-in fade-in">
                    <h2 className="text-3xl font-display font-bold mb-2">Course Concept Graph</h2>
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-muted-foreground">
                        Visual map of how course concepts connect across modules.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenGraphInNewWindow}
                          disabled={!conceptGraph?.mermaid}
                        >
                          Open in New Window
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            regenerateGraph.mutate(undefined, {
                              onSuccess: () => {
                                toast({
                                  title: "Regeneration started",
                                  description: "AI is building a detailed concept graph for this course.",
                                });
                              },
                              onError: (err: any) => {
                                toast({
                                  variant: "destructive",
                                  title: "Could not regenerate graph",
                                  description: err?.message ?? "Please try again.",
                                });
                              },
                            });
                          }}
                          disabled={regenerateGraph.isPending}
                        >
                          {regenerateGraph.isPending ? "Regenerating..." : "Regenerate Detailed Graph"}
                        </Button>
                      </div>
                    </div>

                    {graphLoading ? (
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-60" />
                        <Skeleton className="h-[260px] w-full" />
                      </div>
                    ) : graphError ? (
                      <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
                        Could not load the concept graph right now.
                      </div>
                    ) : conceptGraph?.mermaid ? (
                      <MermaidDiagram chart={conceptGraph.mermaid} interactive />
                    ) : (
                      <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-sm text-muted-foreground">
                        {conceptGraph?.status === "generating"
                          ? "The AI is generating the course graph. Please check back in a few moments."
                          : "No concept graph is available for this course yet."}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 lg:p-12 animate-in fade-in">
                    <h2 className="text-3xl font-display font-bold mb-6">{activeModule.title}</h2>
                    <div className="mb-8">
                      <InlineTutorContent
                        courseId={courseId}
                        moduleId={activeModuleId || modules[0]?.id || 0}
                        moduleTitle={activeModule.title}
                        content={activeModule.content}
                      />
                    </div>

                    {/* Audio Narration */}
                    {(activeModule as any).audioUrl && (
                      <div className="mt-6 p-4 bg-muted/30 rounded-xl border border-border/50 flex items-center gap-3">
                        <div className="shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                          <Volume2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium mb-1">Audio Narration</p>
                          <audio
                            controls
                            className="w-full h-8"
                            src={
                              (activeModule as any).audioUrl.startsWith("/static")
                                ? `/api${(activeModule as any).audioUrl}`
                                : (activeModule as any).audioUrl
                            }
                            preload="none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-muted/30 border-t border-border/50 p-6 flex justify-between items-center">
                  <div className="text-sm text-muted-foreground font-medium">
                    Module {activeIndex + 1} of {modules.length}
                    {showQuiz && quizData && contentView === "module" && (
                      <span className="ml-2 text-primary">
                        • Quiz: {correctCount}/{answeredQuestions.size} correct
                      </span>
                    )}
                  </div>
                  {!showQuiz && contentView === "module" && (
                    <Button
                      size="lg"
                      className="shadow-lg hover:-translate-y-0.5 transition-transform"
                      onClick={handleNextClick}
                      disabled={updateProgress.isPending}
                    >
                      {quizData ? (
                        <>Take Module Quiz <ChevronRight className="w-5 h-5 ml-2" /></>
                      ) : activeIndex === modules.length - 1 ? (
                        <><CheckCircle className="w-5 h-5 mr-2" /> Complete Course</>
                      ) : (
                        <>Next Module <ChevronRight className="w-5 h-5 ml-2" /></>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-12 text-muted-foreground">
                Select a module to start learning.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
