import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ExamTopBarProps {
  examTitle: string;
  remainingSeconds: number;
  totalSeconds: number;
  attemptedCount: number;
  totalQuestions: number;
  onExit: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ExamTopBar({
  examTitle,
  remainingSeconds,
  totalSeconds,
  attemptedCount,
  totalQuestions,
  onExit,
  onSubmit,
  isSubmitting,
}: ExamTopBarProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isTimeWarning = remainingSeconds < 300 && remainingSeconds > 0;
  const isTimeExpired = remainingSeconds === 0;

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-50 shadow-sm">
      {/* Left Section: Title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{examTitle}</h2>
        <div className="text-sm text-gray-600">
          {attemptedCount}/{totalQuestions} Attempted
        </div>
      </div>

      {/* Center Section: Timer */}
      <div className={`font-mono text-lg font-bold ${isTimeWarning ? "text-red-600" : "text-gray-900"}`}>
        {timerLabel}
      </div>

      {/* Right Section: Action Buttons */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onExit} disabled={isSubmitting}>
          Exit
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || isTimeExpired}
          className={isTimeWarning ? "animate-pulse" : ""}
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Exam
        </Button>
      </div>
    </div>
  );
}
