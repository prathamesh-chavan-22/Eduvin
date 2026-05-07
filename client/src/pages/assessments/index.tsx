import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, FileQuestion, GraduationCap, Loader2, Trophy, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuizQuestion {
    q: string;
    options: string[];
    correct: number;
}

interface AvailableAssessment {
    moduleId: number;
    moduleTitle: string;
    courseId: number;
    courseTitle: string;
    questionCount: number;
    questions: QuizQuestion[];
}

interface AssessmentHistory {
    id: number;
    moduleId: number;
    moduleTitle: string;
    courseTitle: string;
    score: number;
    submittedAt: string;
}

export default function Assessments() {
    const { user } = useAuth();
    if (!user) return <Redirect to="/login" />;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Assessments</h1>
                <p className="text-muted-foreground mt-2">
                    {user.role === "employee"
                        ? "Take quizzes from your enrolled course modules and track your scores."
                        : "View employee assessment activity and quiz performance."}
                </p>
            </div>
            <EmployeeAssessmentView />
        </div>
    );
}

function EmployeeAssessmentView() {
    const { toast } = useToast();
    const [activeAssessment, setActiveAssessment] = useState<AvailableAssessment | null>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [result, setResult] = useState<any>(null);

    const { data: available = [], isLoading: loadingAvail } = useQuery<AvailableAssessment[]>({
        queryKey: ["/api/assessments/available"],
    });

    const { data: history = [], isLoading: loadingHistory } = useQuery<AssessmentHistory[]>({
        queryKey: ["/api/assessments/history"],
    });

    const submitMutation = useMutation({
        mutationFn: async (data: { moduleId: number; answers: number[] }) => {
            const res = await apiRequest("POST", "/api/assessments/submit", data);
            return res.json();
        },
        onSuccess: (data) => {
            setResult(data);
            queryClient.invalidateQueries({ queryKey: ["/api/assessments/available"] });
            queryClient.invalidateQueries({ queryKey: ["/api/assessments/history"] });
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        },
        onError: () => {
            toast({ variant: "destructive", title: "Failed to submit assessment." });
        },
    });

    const startAssessment = (assessment: AvailableAssessment) => {
        setActiveAssessment(assessment);
        setAnswers(new Array(assessment.questions.length).fill(-1));
        setCurrentQ(0);
        setResult(null);
    };

    const selectAnswer = (optionIdx: number) => {
        const updated = [...answers];
        updated[currentQ] = optionIdx;
        setAnswers(updated);
    };

    const handleSubmit = () => {
        if (!activeAssessment) return;
        submitMutation.mutate({ moduleId: activeAssessment.moduleId, answers });
    };

    const resetQuiz = () => {
        setActiveAssessment(null);
        setAnswers([]);
        setCurrentQ(0);
        setResult(null);
    };

    // Result screen
    if (result) {
        const pct = result.score;
        const passed = pct >= 70;
        return (
            <Card className="max-w-2xl mx-auto shadow-xl border-primary/20">
                <CardContent className="p-10 text-center space-y-6">
                    <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${passed ? "bg-green-500/10" : "bg-destructive/10"}`}>
                        {passed
                            ? <Trophy className="w-10 h-10 text-green-500" />
                            : <RotateCcw className="w-10 h-10 text-destructive" />}
                    </div>
                    <div>
                        <h2 className="text-3xl font-display font-bold">{pct}%</h2>
                        <p className="text-muted-foreground mt-1">{result.correct} out of {result.total} correct</p>
                        <p className="font-semibold mt-1">{result.moduleTitle}</p>
                    </div>
                    <Badge className={passed ? "bg-green-500" : "bg-destructive"} >
                        {passed ? "Passed ✓" : "Needs Improvement"}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                        {passed
                            ? "Great work! Your score has been recorded and your learner profile updated."
                            : "Don't worry — review the module content and try other assessments to improve your score."}
                    </p>
                    <Button onClick={resetQuiz}>Back to Assessments</Button>
                </CardContent>
            </Card>
        );
    }

    // Active quiz
    if (activeAssessment) {
        const q = activeAssessment.questions[currentQ];
        const isLast = currentQ === activeAssessment.questions.length - 1;
        const selectedAnswer = answers[currentQ];

        return (
            <Card className="max-w-3xl mx-auto shadow-xl border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-display flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-primary" />
                            {activeAssessment.moduleTitle}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-sm">
                            {currentQ + 1} / {activeAssessment.questions.length}
                        </Badge>
                    </div>
                    <Progress value={((currentQ + 1) / activeAssessment.questions.length) * 100} className="mt-3 h-1.5" />
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <h3 className="text-xl font-medium leading-relaxed">{q.q}</h3>
                    <div className="space-y-3">
                        {q.options.map((opt, i) => (
                            <div
                                key={i}
                                onClick={() => selectAnswer(i)}
                                className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors
                                    ${selectedAnswer === i
                                        ? "border-primary bg-primary/10"
                                        : "hover:bg-muted/50"}`}
                            >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                                    ${selectedAnswer === i ? "border-primary" : "border-muted-foreground"}`}>
                                    {selectedAnswer === i && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                </div>
                                <span className="text-base font-normal flex-1">{opt}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between pt-4 border-t border-border/50">
                        <Button variant="outline" onClick={() => setCurrentQ(q => q - 1)} disabled={currentQ === 0}>
                            Previous
                        </Button>
                        {isLast ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={submitMutation.isPending || answers.some(a => a === -1)}
                                className="shadow-lg shadow-primary/20"
                            >
                                {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Submit Assessment
                            </Button>
                        ) : (
                            <Button onClick={() => setCurrentQ(q => q + 1)} disabled={selectedAnswer === -1}>
                                Next Question →
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Overview
    return (
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h3 className="font-display font-semibold text-xl">Available Quizzes</h3>
                {loadingAvail ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : available.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="p-8 text-center text-muted-foreground">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            You've completed all available quizzes!
                        </CardContent>
                    </Card>
                ) : (
                    available.map(assessment => (
                        <Card key={assessment.moduleId} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">{assessment.courseTitle}</p>
                                        <h4 className="text-lg font-bold font-display">{assessment.moduleTitle}</h4>
                                    </div>
                                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                                        <FileQuestion className="w-3 h-3 mr-1" />
                                        {assessment.questionCount} Qs
                                    </Badge>
                                </div>
                                <Button onClick={() => startAssessment(assessment)} className="w-full shadow-sm">
                                    Start Quiz
                                </Button>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="space-y-4">
                <h3 className="font-display font-semibold text-xl">Completed</h3>
                {loadingHistory ? (
                    <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : history.length === 0 ? (
                    <Card className="border-dashed opacity-60">
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No assessments completed yet. Take your first quiz!
                        </CardContent>
                    </Card>
                ) : (
                    history.map(item => (
                        <Card key={item.id} className="opacity-80 shadow-sm border-border/50">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground">{item.courseTitle}</p>
                                        <h4 className="text-base font-bold font-display text-foreground/80">{item.moduleTitle}</h4>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {new Date(item.submittedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`flex items-center font-bold px-2 py-0.5 rounded text-sm
                                        ${item.score >= 70 ? "text-green-600 bg-green-500/10" : "text-destructive bg-destructive/10"}`}>
                                        <CheckCircle2 className="w-4 h-4 mr-1" /> {item.score}%
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
