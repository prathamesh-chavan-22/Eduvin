import React from "react";
import { useRoute } from "wouter";
import { ExamSession } from "@/components/exam/ExamSession";

export default function ExamSessionPage() {
  const [, params] = useRoute("/exams/:id");
  const paperId = params ? parseInt(params.id) : null;

  if (!paperId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Invalid Exam Paper ID</p>
      </div>
    );
  }

  return <ExamSession paperId={paperId} />;
}
