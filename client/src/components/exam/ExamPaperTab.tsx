import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useGenerateExamPaper, useExamPaper } from "@/hooks/use-exams";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Upload, FileText, Loader2 } from "lucide-react";
import ExamUploadDialog from "./ExamUploadDialog";
import ExamResultsView from "./ExamResultsView";

interface Props {
  courseId: number;
}

export default function ExamPaperTab({ courseId }: Props) {
  const { user } = useAuth();
  const { data: paper, isLoading } = useExamPaper(courseId);
  const generateMutation = useGenerateExamPaper(courseId);
  const [showUpload, setShowUpload] = useState(false);

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
            Generate an exam paper from this course's content.
          </p>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Exam Paper
          </Button>
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
            </div>
            <p className="text-sm">{q.question}</p>
          </div>
        ))}
      </div>

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
