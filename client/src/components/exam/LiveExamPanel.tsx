import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useStartLiveExam, useSubmitLiveExam, type LiveExamStart } from "@/hooks/use-exams";
import { useToast } from "@/hooks/use-toast";

interface Props {
  paperId: number;
}

export default function LiveExamPanel({ paperId }: Props) {
  const { toast } = useToast();
  const startLiveExam = useStartLiveExam(paperId);
  const submitLiveExam = useSubmitLiveExam(paperId);
  const [session, setSession] = useState<LiveExamStart | null>(null);
  const [answers, setAnswers] = useState<(string | number | null)[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submissionSummary, setSubmissionSummary] = useState("");

  const canStart = !session && !startLiveExam.isPending;

  useEffect(() => {
    if (!session || submitted) return;
    if (remainingSeconds <= 0) {
      handleSubmit();
      return;
    }
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => prev - 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [remainingSeconds, session, submitted]);

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, [remainingSeconds]);

  const begin = async () => {
    try {
      const data = await startLiveExam.mutateAsync();
      setSession(data);
      setAnswers(new Array(data.questions.length).fill(null));
      setRemainingSeconds(data.durationMinutes * 60);
      setSubmitted(false);
      setSubmissionSummary("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Unable to start live exam",
        description: error?.message || "Please try again.",
      });
    }
  };

  const updateAnswer = (index: number, value: string | number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!session || submitLiveExam.isPending || submitted) return;
    try {
      const result = await submitLiveExam.mutateAsync(answers);
      setSubmitted(true);
      setSubmissionSummary(
        `Submitted. Score: ${result.score}/${result.totalMarks}. ${result.summary}`
      );
      toast({
        title: "Live exam submitted",
        description: `${result.score}/${result.totalMarks}`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error?.message || "Please retry.",
      });
    }
  };

  if (!session) {
    return (
      <Card className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Live mode is enabled for this exam. Start when you're ready; timer starts immediately.
        </p>
        <Button onClick={begin} disabled={!canStart}>
          {startLiveExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Start Live Exam
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Live Exam In Progress</h4>
        <span className="font-mono text-sm">{timerLabel}</span>
      </div>

      {session.questions.map((question, idx) => (
        <div key={idx} className="border rounded p-3 space-y-2">
          <p className="font-medium">
            Q{idx + 1}. {question.question} ({question.marks} marks)
          </p>
          {question.options && question.options.length > 0 ? (
            <RadioGroup
              value={typeof answers[idx] === "string" ? String(answers[idx]) : ""}
              onValueChange={(value) => updateAnswer(idx, value)}
            >
              {question.options.map((option, optionIdx) => {
                const optionId = `q-${idx}-opt-${optionIdx}`;
                return (
                  <div key={optionId} className="flex items-center gap-2">
                    <RadioGroupItem id={optionId} value={option} />
                    <Label htmlFor={optionId}>{option}</Label>
                  </div>
                );
              })}
            </RadioGroup>
          ) : (
            <Input
              value={typeof answers[idx] === "string" ? String(answers[idx]) : ""}
              onChange={(e) => updateAnswer(idx, e.target.value)}
              placeholder="Type your answer"
            />
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={begin} disabled={startLiveExam.isPending || submitLiveExam.isPending}>
          Restart
        </Button>
        <Button onClick={handleSubmit} disabled={submitLiveExam.isPending || submitted}>
          {submitLiveExam.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Live Exam
        </Button>
      </div>

      {submissionSummary && <p className="text-sm text-muted-foreground">{submissionSummary}</p>}
    </Card>
  );
}
