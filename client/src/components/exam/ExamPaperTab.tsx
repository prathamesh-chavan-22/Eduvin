import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGenerateExamPaper, useExamPaper } from "@/hooks/use-exams";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Download, Upload, FileText, Loader2 } from "lucide-react";
import ExamUploadDialog from "./ExamUploadDialog";
import ExamResultsView from "./ExamResultsView";
import { Link } from "wouter";
import { useUsers } from "@/hooks/use-users";
import { Card } from "@/components/ui/card";

interface Props {
  courseId: number;
}

export default function ExamPaperTab({ courseId }: Props) {
  const { user } = useAuth();
  const { data: paper, isLoading } = useExamPaper(courseId);
  const { data: users = [] } = useUsers();
  const generateMutation = useGenerateExamPaper(courseId);
  const [showUpload, setShowUpload] = useState(false);
  const [questionCount, setQuestionCount] = useState(10);
  const [questionFormat, setQuestionFormat] = useState<"mixed" | "objective" | "subjective">("mixed");
  const [liveEnabled, setLiveEnabled] = useState(true);
  const [liveDurationMinutes, setLiveDurationMinutes] = useState(30);
  const [notifyUserIds, setNotifyUserIds] = useState<number[]>([]);
  const [bloomsDistribution, setBloomsDistribution] = useState<Record<string, number>>({
    remember: 2,
    understand: 2,
    apply: 2,
    analyze: 2,
    evaluate: 1,
    create: 1,
  });

  const notificationUsers = useMemo(
    () => users.filter((u) => u.role === "manager" || u.role === "l_and_d"),
    [users]
  );

  const toggleRecipient = (id: number) => {
    setNotifyUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const updateBloom = (level: string, value: string) => {
    const numeric = Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
    setBloomsDistribution((prev) => ({ ...prev, [level]: numeric }));
  };

  const handleQuestionFormatChange = (value: string) => {
    if (value === "mixed" || value === "objective" || value === "subjective") {
      setQuestionFormat(value);
    }
  };

  const handleGenerate = () => {
    generateMutation.mutate({
      questionCount,
      questionFormat,
      liveEnabled,
      liveDurationMinutes,
      notifyUserIds,
      bloomsDistribution,
    });
  };

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!paper) {
    if (user?.role === "l_and_d") {
      return (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Exam Paper Generated</h3>
          <p className="text-muted-foreground mb-4">
            Generate an exam paper with Bloom taxonomy selection and optional live exam mode.
          </p>
          <div className="max-w-2xl mx-auto text-left space-y-4 border rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Question count</Label>
                <Input
                  type="number"
                  min={6}
                  max={30}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(6, Math.min(30, Number(e.target.value) || 10)))}
                />
              </div>
              <div className="space-y-2">
                <Label>Question format</Label>
                <Select value={questionFormat} onValueChange={handleQuestionFormatChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="objective">Objective</SelectItem>
                    <SelectItem value="subjective">Subjective</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bloom taxonomy weights</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(bloomsDistribution).map(([level, value]) => (
                  <div key={level} className="space-y-1">
                    <Label className="text-xs capitalize">{level}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={value}
                      onChange={(e) => updateBloom(level, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={liveEnabled} onCheckedChange={setLiveEnabled} />
                <Label>Enable live exam mode</Label>
              </div>
              {liveEnabled && (
                <div className="max-w-xs">
                  <Label className="text-xs">Live duration (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={180}
                    value={liveDurationMinutes}
                    onChange={(e) => setLiveDurationMinutes(Math.max(5, Math.min(180, Number(e.target.value) || 30)))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notify these users on exam submission</Label>
              <div className="space-y-1 max-h-40 overflow-auto border rounded p-2">
                {notificationUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={notifyUserIds.includes(u.id)} onCheckedChange={() => toggleRecipient(u.id)} />
                    <span>{u.fullName} ({u.role})</span>
                  </label>
                ))}
                {notificationUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">No manager/L&D users available.</p>
                )}
              </div>
            </div>

            <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
              {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Exam Paper
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="text-center py-8 text-muted-foreground">
        No exam paper available for this course yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Exam Paper Generated</h3>
          <p className="text-sm text-muted-foreground">
            {paper.questions.length} questions | {paper.totalMarks} total marks
            {paper.questionFormat ? ` | ${paper.questionFormat}` : ""}
            {paper.liveEnabled ? ` | live ${paper.liveDurationMinutes || 30}m` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`/api/exam-papers/${paper.id}/pdf`} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <Download className="mr-1 h-4 w-4" /> Download PDF
            </Button>
          </a>
          {user?.role === "employee" && (
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="mr-1 h-4 w-4" /> Upload Answer
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {paper.questions.map((q, idx) => (
          <div key={idx} className="p-4 border rounded">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">Question {idx + 1}</span>
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                {q.marks} marks
              </span>
              <span className="text-xs text-muted-foreground capitalize">[{q.type}]</span>
              {q.bloomLevel && (
                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">
                  {q.bloomLevel}
                </span>
              )}
            </div>
            <p className="text-sm">{q.question}</p>
            {q.options && q.options.length > 0 && (
              <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                {q.options.map((option, optionIndex) => (
                  <li key={optionIndex}>{option}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {user?.role === "employee" && paper.liveEnabled && (
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-md">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-xl font-bold text-primary">Live Exam Session Ready</h4>
              <p className="text-sm text-muted-foreground max-w-md">
                This course has an interactive live exam. Once started, you'll enter a full-screen mode with a timer.
                Ensure you have a stable connection.
              </p>
            </div>
            <Link href={`/exams/${paper.id}`}>
              <Button size="lg" className="px-8 font-semibold shadow-lg hover:scale-105 transition-transform">
                Start Live Exam
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {showUpload && (
        <ExamUploadDialog
          paperId={paper.id}
          totalMarks={paper.totalMarks}
          onClose={() => setShowUpload(false)}
        />
      )}

      <ExamResultsView paperId={paper.id} />
    </div>
  );
}
