import { useExamResults } from "@/hooks/use-exams";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";

interface Props {
  paperId: number;
}

export default function ExamResultsView({ paperId }: Props) {
  const { user } = useAuth();
  const { data: results, isLoading } = useExamResults(paperId);

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!results || results.attempts.length === 0) {
    return null;
  }

  if (user?.role === "l_and_d") {
    return (
      <div className="mt-6">
        <h4 className="font-semibold mb-2">Student Results ({results.attempts.length} submissions)</h4>
        <div className="space-y-2">
          {results.attempts.slice(0, 10).map((a) => (
            <Card key={a.id} className="p-3 flex items-center justify-between">
              <div>
                <span className="font-medium">User #{a.userId}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(a.submittedAt).toLocaleDateString()}
                </span>
              </div>
              {a.score !== null && a.totalMarks !== null ? (
                <span className={`font-bold text-lg ${a.score / a.totalMarks >= 0.5 ? "text-green-600" : "text-red-600"}`}>
                  {a.score}/{a.totalMarks}
                </span>
              ) : (
                <span className="text-muted-foreground">Not evaluated</span>
              )}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const myAttempts = results.attempts.filter(a => a.userId === user?.id);
  const latestAttempt = myAttempts[0];

  if (!latestAttempt || latestAttempt.score === null) {
    return null;
  }

  const pct = Math.round((latestAttempt.score / (latestAttempt.totalMarks || 1)) * 100);
  const passed = pct >= 50;

  return (
    <div className="mt-6">
      <h4 className="font-semibold mb-2">Your Result</h4>
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
          {latestAttempt.score} / {latestAttempt.totalMarks}
        </p>
        {latestAttempt.evaluationText && (
          <p className="text-sm text-muted-foreground mt-3 italic">
            {latestAttempt.evaluationText}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Submitted: {new Date(latestAttempt.submittedAt).toLocaleString()}
        </p>
      </Card>
    </div>
  );
}
