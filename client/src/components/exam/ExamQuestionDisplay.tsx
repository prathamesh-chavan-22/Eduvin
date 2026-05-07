import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Flag } from "lucide-react";
import type { ExamQuestion } from "@/hooks/use-exams";

interface ExamQuestionDisplayProps {
  question: ExamQuestion;
  questionIndex: number;
  totalQuestions: number;
  currentAnswer: string | number | null;
  isMarkedForReview: boolean;
  onAnswerChange: (answer: string | number) => void;
  onToggleReview: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export function ExamQuestionDisplay({
  question,
  questionIndex,
  totalQuestions,
  currentAnswer,
  isMarkedForReview,
  onAnswerChange,
  onToggleReview,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
}: ExamQuestionDisplayProps) {
  const answerValue = String(currentAnswer ?? "");

  return (
    <div className="flex-1 flex flex-col p-8 space-y-6">
      {/* Question Header */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Question {questionIndex + 1} of {totalQuestions}
        </p>
        <h3 className="text-2xl font-bold text-gray-900">{question.question}</h3>
        <p className="text-sm font-medium text-gray-700">({question.marks} marks)</p>
      </div>

      {/* Question Type Specific Rendering */}
      <div className="flex-1">
        {question.options && question.options.length > 0 ? (
          // MCQ
          <RadioGroup value={answerValue} onValueChange={onAnswerChange}>
            <div className="space-y-3">
              {question.options.map((option, idx) => {
                const optionId = `q-${questionIndex}-opt-${idx}`;
                return (
                  <div key={optionId} className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-blue-400 cursor-pointer">
                    <RadioGroupItem value={option} id={optionId} />
                    <Label htmlFor={optionId} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        ) : (
          // Text Input (Short Answer, Long Answer)
          <Input
            value={answerValue}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Type your answer"
            className="w-full h-24 p-4 text-base"
          />
        )}
      </div>

      {/* Mark for Review Toggle */}
      <Button
        variant={isMarkedForReview ? "default" : "outline"}
        onClick={onToggleReview}
        className={isMarkedForReview ? "bg-blue-100 text-blue-900" : ""}
      >
        <Flag className={`h-4 w-4 mr-2 ${isMarkedForReview ? "fill-current" : ""}`} />
        Mark for Review
      </Button>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={!canGoPrevious}>
          &lt; Prev
        </Button>
        <Button onClick={onNext} disabled={!canGoNext}>
          Next &gt;
        </Button>
      </div>
    </div>
  );
}
