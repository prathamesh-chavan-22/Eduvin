import React, { useEffect, useRef } from "react";
import type { ExamQuestion } from "@/hooks/use-exams";

interface ExamSidebarProps {
  questions: ExamQuestion[];
  answers: (string | number | null)[];
  reviewFlags: Set<number>;
  currentQuestionIndex: number;
  onSelectQuestion: (index: number) => void;
}

type QuestionStatus = "attempted" | "not-attempted" | "marked-for-review";

function getQuestionStatus(
  index: number,
  answer: string | number | null,
  reviewFlags: Set<number>
): QuestionStatus {
  if (reviewFlags.has(index)) return "marked-for-review";
  if (answer !== null && answer !== "") return "attempted";
  return "not-attempted";
}

function getStatusBadge(status: QuestionStatus): string {
  switch (status) {
    case "attempted":
      return "●";
    case "marked-for-review":
      return "◆";
    case "not-attempted":
      return "○";
  }
}

function getStatusColor(status: QuestionStatus): string {
  switch (status) {
    case "attempted":
      return "text-green-600";
    case "marked-for-review":
      return "text-blue-600";
    case "not-attempted":
      return "text-gray-400";
  }
}

export function ExamSidebar({
  questions,
  answers,
  reviewFlags,
  currentQuestionIndex,
  onSelectQuestion,
}: ExamSidebarProps) {
  const currentItemRef = useRef<HTMLButtonElement>(null);
  const attemptedCount = answers.filter((a) => a !== null && a !== "").length;
  const reviewCount = reviewFlags.size;

  useEffect(() => {
    if (currentItemRef.current?.scrollIntoView) {
      currentItemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [currentQuestionIndex]);

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Question List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {questions.map((_, index) => {
          const status = getQuestionStatus(index, answers[index], reviewFlags);
          const isCurrent = index === currentQuestionIndex;
          const badge = getStatusBadge(status);
          const color = getStatusColor(status);

          return (
            <button
              key={index}
              ref={isCurrent ? currentItemRef : null}
              onClick={() => onSelectQuestion(index)}
              className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
                isCurrent
                  ? "bg-blue-100 text-blue-900"
                  : "bg-white text-gray-900 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`text-lg ${color}`}>{badge}</span>
                <span>Q{index + 1}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-gray-200 bg-white p-4 space-y-2">
        <div className="text-sm text-gray-600">
          <strong>{attemptedCount}/{questions.length}</strong> Attempted
        </div>
        <div className="text-sm text-gray-600">
          <strong>{reviewCount}</strong> Marked for Review
        </div>
      </div>
    </div>
  );
}
