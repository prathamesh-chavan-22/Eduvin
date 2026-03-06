import { useParams, useLocation } from "wouter";
import { useCourse, useCourseModules } from "@/hooks/use-courses";
import { useEnrollments, useUpdateProgress, useCreateEnrollment } from "@/hooks/use-enrollments";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, ChevronRight, PlayCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  
  const { user } = useAuth();
  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: modules = [], isLoading: modulesLoading } = useCourseModules(courseId);
  
  const { data: enrollments = [] } = useEnrollments();
  const updateProgress = useUpdateProgress();
  const enroll = useCreateEnrollment();
  
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);

  // Find or auto-enroll
  const myEnrollment = enrollments.find(e => e.courseId === courseId && e.userId === user?.id);

  useEffect(() => {
    if (modules.length > 0 && !activeModuleId) {
      setActiveModuleId(modules[0].id);
    }
  }, [modules, activeModuleId]);

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

  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0];
  const activeIndex = modules.findIndex(m => m.id === activeModuleId);

  const handleMarkComplete = async () => {
    if (!myEnrollment) {
      // Auto enroll if not enrolled
      const newE = await enroll.mutateAsync({ courseId, userId: user!.id, status: "in_progress", progressPct: 0 });
      handleProgressUpdate(newE.id);
    } else {
      handleProgressUpdate(myEnrollment.id);
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
      setActiveModuleId(modules[activeIndex + 1].id);
    }
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
                  onClick={() => setActiveModuleId(m.id)}
                  className={`w-full text-left p-3 rounded-lg flex items-start gap-3 transition-all ${
                    isActive 
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
          <div className="max-w-3xl mx-auto">
            {activeModule ? (
              <div className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
                <div className="p-8 lg:p-12">
                  <h2 className="text-3xl font-display font-bold mb-6">{activeModule.title}</h2>
                  <div className="prose prose-slate dark:prose-invert max-w-none text-foreground/90 mb-12 whitespace-pre-wrap leading-relaxed">
                    {activeModule.content}
                  </div>
                </div>
                
                <div className="bg-muted/30 border-t border-border/50 p-6 flex justify-between items-center">
                  <div className="text-sm text-muted-foreground font-medium">
                    Module {activeIndex + 1} of {modules.length}
                  </div>
                  <Button 
                    size="lg" 
                    className="shadow-lg hover:-translate-y-0.5 transition-transform"
                    onClick={handleMarkComplete}
                    disabled={updateProgress.isPending}
                  >
                    {activeIndex === modules.length - 1 ? (
                      <><CheckCircle className="w-5 h-5 mr-2" /> Finish Course</>
                    ) : (
                      <>Complete & Continue <ChevronRight className="w-5 h-5 ml-2" /></>
                    )}
                  </Button>
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
