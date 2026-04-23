import React, { useState, useEffect, useCallback } from "react";
import { useStartLiveExam, useSubmitLiveExam, type LiveExamStart, type LiveExamSubmission } from "@/hooks/use-exams";
import { useToast } from "@/hooks/use-toast";
import { ExamFullScreenContainer } from "./ExamFullScreenContainer";
import { ExamTopBar } from "./ExamTopBar";
import { ExamSidebar } from "./ExamSidebar";
import { ExamQuestionDisplay } from "./ExamQuestionDisplay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useExamTimer } from "./useExamTimer";

interface ExamSessionProps {
  paperId: number;
}

export function ExamSession({ paperId }: ExamSessionProps) {
  const { toast } = useToast();
  const startLiveExam = useStartLiveExam(paperId);
  const submitLiveExam = useSubmitLiveExam(paperId);

  const [session, setSession] = useState<LiveExamStart | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string | number | null>>(new Map());
  const [reviewFlags, setReviewFlags] = useState<Set<number>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<LiveExamSubmission | null>(null);

  const handleTimerExpire = useCallback(() => {
    if (!session || submitted) return;
    handleSubmit();
  }, [session, submitted]);

  const { remainingSeconds } = useExamTimer(
    session ? session.durationMinutes * 60 : 0,
    handleTimerExpire
  );

  const canStart = !session && !startLiveExam.isPending;

  const begin = async () => {
    try {
      const data = await startLiveExam.mutateAsync();
      setSession(data);
      setCurrentQuestionIndex(0);
      setAnswers(new Map());
      setReviewFlags(new Set());
      setSubmitted(false);
      setSubmissionResult(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Unable to start live exam",
        description: error?.message || "Please try again.",
      });
    }
  };

  const handleExit = () => {
    if (
      window.confirm(
        "Are you sure? Your exam will be submitted with current answers."
      )
    ) {
      handleSubmit();
    }
  };

  const updateAnswer = (index: number, value: string | number) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(index, value);
      return next;
    });
  };

  const toggleReviewFlag = (index: number) => {
    setReviewFlags((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectQuestion = (index: number) => {
    if (index >= 0 && index < (session?.questions.length || 0)) {
      setCurrentQuestionIndex(index);
    }
  };

  const goNext = () => {
    if (currentQuestionIndex < (session?.questions.length || 0) - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const goPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!session || submitLiveExam.isPending || submitted) return;

    const unansweredCount = session.questions.filter(
      (_, i) => !answers.has(i) || answers.get(i) === null
    ).length;

    if (unansweredCount > 0) {
      toast({
        variant: "default",
        title: "Warning",
        description: `${unansweredCount} question(s) not attempted`,
      });
    }

    try {
      const answersArray = Array.from({ length: session.questions.length }, (_, i) =>
        answers.get(i) ?? null
      );
      const result = await submitLiveExam.mutateAsync(answersArray);
      setSubmitted(true);
      setSubmissionResult(result);
      toast({
        title: "Exam submitted",
        description: `Score: ${result.score}/${result.totalMarks}`,
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

  if (submitted && submissionResult) {
    const pct = Math.round((submissionResult.score / submissionResult.totalMarks) * 100);
    const passed = pct >= 50;

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Exam Results</h2>
        <Card className="p-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            {passed ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 text-red-600" />
            )}
            <span className={`text-4xl font-bold ${passed ? "text-green-600" : "text-red-600"}`}>
              {pct}%
            </span>
          </div>
          <p className="text-lg font-medium">
            {submissionResult.score} / {submissionResult.totalMarks}
          </p>
          {submissionResult.summary && (
            <p className="text-sm text-muted-foreground mt-3 italic">
              {submissionResult.summary}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Submitted: {new Date(submissionResult.submittedAt).toLocaleString()}
          </p>
        </Card>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const currentAnswer = answers.get(currentQuestionIndex) ?? null;
  const isMarkedForReview = reviewFlags.has(currentQuestionIndex);
  const answersList = Array.from({ length: session.questions.length }, (_, i) =>
    answers.get(i) ?? null
  );

  return (
    <ExamFullScreenContainer onExitAttempt={handleExit}>
      <div className="h-screen flex flex-col">
        <ExamTopBar
          examTitle={`Exam (Paper ${session.paperId})`}
          remainingSeconds={remainingSeconds}
          totalSeconds={session.durationMinutes * 60}
          attemptedCount={Array.from(answers.values()).filter((v) => v !== null).length}
          totalQuestions={session.questions.length}
          onExit={handleExit}
          onSubmit={handleSubmit}
          isSubmitting={submitLiveExam.isPending}
        />

        <div className="flex-1 flex overflow-hidden pt-16">
          <ExamSidebar
            questions={session.questions}
            answers={answersList}
            reviewFlags={reviewFlags}
            currentQuestionIndex={currentQuestionIndex}
            onSelectQuestion={selectQuestion}
          />

          <ExamQuestionDisplay
            question={currentQuestion}
            questionIndex={currentQuestionIndex}
            totalQuestions={session.questions.length}
            currentAnswer={currentAnswer}
            isMarkedForReview={isMarkedForReview}
            onAnswerChange={(answer) => updateAnswer(currentQuestionIndex, answer)}
            onToggleReview={() => toggleReviewFlag(currentQuestionIndex)}
            onPrevious={goPrevious}
            onNext={goNext}
            canGoPrevious={currentQuestionIndex > 0}
            canGoNext={currentQuestionIndex < session.questions.length - 1}
          />
        </div>
      </div>
    </ExamFullScreenContainer>
  );
}
