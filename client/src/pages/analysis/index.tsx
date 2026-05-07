import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  UploadCloud, FileText, Users, BookOpen, Lightbulb, Clock,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, ExternalLink, Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAnalyses, useAnalysis, useUploadAnalysis } from "@/hooks/use-analysis";
import { useEnrollments } from "@/hooks/use-enrollments";
import type { AnalysisResult } from "@shared/schema";

export default function WorkforceAnalysis() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedAnalysisId, setSelectedAnalysisId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);

  const { data: analyses, isLoading: isLoadingList } = useAnalyses();
  const { data: analysisDetail } = useAnalysis(selectedAnalysisId);
  const uploadMutation = useUploadAnalysis();

  if (!user || user.role !== "l_and_d") {
    return <Redirect to="/dashboard" />;
  }

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid File", description: "Please upload a CSV file.", variant: "destructive" });
      return;
    }
    uploadMutation.mutate(file, {
      onSuccess: (data) => {
        setSelectedAnalysisId(data.id);
        toast({ title: "Upload Started", description: "Your CSV is being analyzed by AI." });
      },
      onError: (err) => {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
      },
    });
  }, [uploadMutation, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isProcessing = analysisDetail?.status === "processing";
  const isCompleted = analysisDetail?.status === "completed";
  const isFailed = analysisDetail?.status === "failed";

  const skillsCount = analysisDetail?.results?.reduce(
    (acc, r) => acc + (r.recommendedSkills as string[] || []).length, 0
  ) ?? 0;
  const matchedCoursesCount = analysisDetail?.results?.reduce(
    (acc, r) => acc + (r.matchedCourseIds as number[] || []).length, 0
  ) ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Workforce Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Upload employee data with manager remarks for AI-powered training recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main content */}
        <div className="lg:col-span-8 space-y-6">
          {/* Upload area */}
          <Card
            className={`border-2 border-dashed transition-colors ${isDragging
              ? "border-primary bg-primary/5"
              : "border-border/50 bg-muted/10"
              }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold mb-1">Upload CSV File</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                Drag and drop a CSV with employee data and manager remarks,
                or click to browse. The AI will auto-detect column mappings.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="shadow-lg shadow-primary/20"
              >
                {uploadMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  "Select CSV File"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Processing state */}
          {selectedAnalysisId && isProcessing && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="flex items-center gap-4 py-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div>
                  <h4 className="font-semibold">Analyzing employee data...</h4>
                  <p className="text-sm text-muted-foreground">
                    Mistral AI is processing {analysisDetail?.totalEmployees ?? "..."} employee records.
                    This may take a minute.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Failed state */}
          {selectedAnalysisId && isFailed && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="flex items-center gap-4 py-6">
                <AlertCircle className="w-8 h-8 text-destructive" />
                <div>
                  <h4 className="font-semibold text-destructive">Analysis Failed</h4>
                  <p className="text-sm text-muted-foreground">
                    Could not process the CSV. Check that it contains employee names and manager remarks columns.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {selectedAnalysisId && isCompleted && analysisDetail && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary text-primary-foreground border-none shadow-lg">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-primary-foreground/80 font-medium mb-1">Employees Analyzed</p>
                        <h4 className="text-4xl font-display font-bold">{analysisDetail.totalEmployees}</h4>
                      </div>
                      <Users className="w-6 h-6 text-primary-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Skills Identified</p>
                        <h4 className="text-3xl font-display font-bold">{skillsCount}</h4>
                      </div>
                      <Lightbulb className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border/50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Courses Matched</p>
                        <h4 className="text-3xl font-display font-bold">{matchedCoursesCount}</h4>
                      </div>
                      <BookOpen className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Results table */}
              <Card className="border-border/50 shadow-md rounded-xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                  <CardTitle className="font-display">Employee Analysis Results</CardTitle>
                  <CardDescription>
                    AI-powered training recommendations based on manager remarks.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[180px]">Employee</TableHead>
                        <TableHead className="w-[120px]">Department</TableHead>
                        <TableHead>AI Summary</TableHead>
                        <TableHead className="w-[140px]">Recommendations</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisDetail.results?.map((r: AnalysisResult) => (
                        <ResultRow
                          key={r.id}
                          result={r}
                          expanded={expandedRows.has(r.id)}
                          onToggle={() => toggleRow(r.id)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* History sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Past Analyses
          </h3>

          {isLoadingList && (
            <p className="text-sm text-muted-foreground">Loading...</p>
          )}

          {analyses && analyses.length === 0 && (
            <p className="text-sm text-muted-foreground">No analyses yet. Upload a CSV to get started.</p>
          )}

          <div className="space-y-2">
            {analyses?.map((a) => (
              <Card
                key={a.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedAnalysisId === a.id ? "border-primary shadow-md" : "border-border/50"
                  }`}
                onClick={() => setSelectedAnalysisId(a.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{a.filename}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.totalEmployees} employees
                        {a.createdAt && ` · ${new Date(a.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <Badge className="bg-green-500/20 text-green-700 hover:bg-green-500/20 shrink-0">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Done
      </Badge>
    );
  }
  if (status === "processing") {
    return (
      <Badge className="bg-blue-500/20 text-blue-700 hover:bg-blue-500/20 shrink-0">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        Processing
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="shrink-0">
      <AlertCircle className="w-3 h-3 mr-1" />
      Failed
    </Badge>
  );
}

function ResultRow({
  result,
  expanded,
  onToggle,
}: {
  result: AnalysisResult;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const skills = (result.recommendedSkills as string[]) || [];
  const matchedIds = (result.matchedCourseIds as number[]) || [];
  const trainings = (result.suggestedTrainings as { title: string; description: string; reason: string }[]) || [];
  const totalRecs = matchedIds.length + trainings.length;

  const [assigningCourseId, setAssigningCourseId] = useState<number | null>(null);
  const [assignedCourseIds, setAssignedCourseIds] = useState<Set<number>>(new Set());
  
  // Fetch all enrollments to check which courses are already assigned
  const { data: enrollments = [] } = useEnrollments();
  
  // Update assigned courses based on existing enrollments
  // Currently using userId: 1 (hardcoded in assignment logic)
  useEffect(() => {
    const userId = 1; // This matches the hardcoded userId in handleAssignCourse
    const alreadyAssigned = enrollments
      .filter(e => e.userId === userId && matchedIds.includes(e.courseId))
      .map(e => e.courseId);
    setAssignedCourseIds(new Set(alreadyAssigned));
  }, [enrollments, matchedIds]);

  const handleAssignCourse = async (courseId: number) => {
    setAssigningCourseId(courseId);
    try {
      // Create enrollment for this employee - use a generic user ID since we only have names
      // In production, you'd look up the user by name/email
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          userId: 1, // Default to admin for now - would be employee lookup in production
          status: "in_progress",
          progressPct: 0,
        }),
      });
      if (!res.ok) throw new Error("Failed to assign course");
      setAssignedCourseIds(prev => new Set(Array.from(prev).concat(courseId)));
      toast({
        title: "Course Assigned ✅",
        description: `Course #${courseId} assigned for ${result.employeeName}.`,
      });
    } catch (e: any) {
      toast({ title: "Assignment Failed", description: e.message, variant: "destructive" });
    } finally {
      setAssigningCourseId(null);
    }
  };

  return (
    <>
      <TableRow className="hover:bg-muted/10 cursor-pointer" onClick={onToggle}>
        <TableCell className="font-medium">{result.employeeName}</TableCell>
        <TableCell className="text-muted-foreground">{result.department || "—"}</TableCell>
        <TableCell className="text-sm">{result.aiSummary || "—"}</TableCell>
        <TableCell>
          <Badge variant="secondary">{totalRecs} courses</Badge>
        </TableCell>
        <TableCell>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/20 p-4">
            <div className="space-y-4">
              {/* Manager Remarks */}
              {result.managerRemarks && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Manager Remarks</p>
                  <p className="text-sm">{result.managerRemarks}</p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Recommended Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Courses */}
              {matchedIds.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Matched Existing Courses</p>
                  <div className="space-y-2">
                    {matchedIds.map((id) => (
                      <div key={id} className="flex items-center gap-2 bg-background rounded-lg p-2.5 border border-border/50">
                        <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a
                          href={`/courses/${id}`}
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline flex-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Course #{id}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {assignedCourseIds.has(id) ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Assigned
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="text-xs h-7 px-3"
                            disabled={assigningCourseId === id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAssignCourse(id);
                            }}
                          >
                            {assigningCourseId === id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            Assign
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Trainings */}
              {trainings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Suggested New Trainings</p>
                  <div className="space-y-2">
                    {trainings.map((t, i) => (
                      <div key={i} className="bg-background rounded-lg p-3 border border-border/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{t.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                            <p className="text-xs text-primary mt-1">Reason: {t.reason}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/generator?title=${encodeURIComponent(t.title)}`);
                            }}
                          >
                            <Wand2 className="w-3 h-3 mr-1" />
                            Generate Course
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

