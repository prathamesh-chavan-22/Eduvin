import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, BrainCircuit, Search, CheckCircle2, FileQuestion, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock Data
const MOCK_QUESTION_BANKS = [
    { id: 1, title: "AWS Solutions Architecture Qs", questions: 45, topic: "Cloud", level: "Advanced" },
    { id: 2, title: "Leadership Scenario Tests", questions: 20, topic: "Soft Skills", level: "Intermediate" },
    { id: 3, title: "Cybersecurity Basics", questions: 35, topic: "Security", level: "Beginner" },
];

const MOCK_ACTIVE_EXAMS = [
    { id: 1, title: "Security Compliance Q3", status: "Active", attempts: 142, avgScore: 88 },
    { id: 2, title: "New Manager Assessment", status: "Draft", attempts: 0, avgScore: null },
];

const MOCK_EMPLOYEE_EXAMS = [
    { id: 1, title: "Annual Security Compliance Exam", dueDate: "2026-03-15", status: "Pending", questions: 20 },
    { id: 2, title: "React Native Fundamentals", dueDate: "2026-04-01", status: "Completed", questions: 15, score: 92 },
];

export default function Assessments() {
    const { user } = useAuth();

    if (!user) return <Redirect to="/login" />;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Assessments & Question Banks</h1>
                <p className="text-muted-foreground mt-2">
                    {user.role === "employee" ? "Take assigned exams and view your assessment history." : "Manage question banks, generate exams, and track performance."}
                </p>
            </div>

            {user.role === "l_and_d" ? <LndAssessmentView /> : <EmployeeAssessmentView />}
        </div>
    );
}

function LndAssessmentView() {
    const { toast } = useToast();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateBank = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            toast({ title: "Question Bank Generated", description: "AI has produced 15 new situational questions." });
        }, 2000);
    };

    return (
        <Tabs defaultValue="banks" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="banks">Question Banks</TabsTrigger>
                <TabsTrigger value="exams">Active Exams</TabsTrigger>
            </TabsList>

            <TabsContent value="banks" className="space-y-6">
                <div className="grid lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 h-fit shadow-md border-border/50">
                        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                            <CardTitle className="flex items-center gap-2">
                                <BrainCircuit className="w-5 h-5 text-primary" />
                                AI Bank Generator
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label>Topic Source</Label>
                                <Input placeholder="e.g. Sales Objection Handling" />
                            </div>
                            <div className="space-y-2">
                                <Label>Bloom's Taxonomy Level</Label>
                                <Select defaultValue="application">
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="knowledge">Knowledge (Recall)</SelectItem>
                                        <SelectItem value="comprehension">Comprehension (Understand)</SelectItem>
                                        <SelectItem value="application">Application (Use)</SelectItem>
                                        <SelectItem value="analysis">Analysis (Examine)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Number of Questions</Label>
                                <Input type="number" defaultValue={15} />
                            </div>
                            <Button onClick={handleGenerateBank} disabled={isGenerating} className="w-full shadow-lg shadow-primary/20 mt-2">
                                {isGenerating ? <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin mr-2" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
                                Generate Questions
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <div className="relative w-72">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input placeholder="Search banks..." className="pl-9 h-10 bg-muted/30" />
                            </div>
                            <Button variant="outline"><Plus className="w-4 h-4 mr-2" /> New Bank</Button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {MOCK_QUESTION_BANKS.map(bank => (
                                <Card key={bank.id} className="hover:border-primary/50 transition-colors cursor-pointer group shadow-sm">
                                    <CardContent className="p-5 flex flex-col h-full gap-4">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="secondary" className="bg-muted/50">{bank.topic}</Badge>
                                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{bank.level}</span>
                                        </div>
                                        <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors leading-tight flex-1">
                                            {bank.title}
                                        </h3>
                                        <div className="flex justify-between items-center pt-2 border-t border-border/50">
                                            <div className="flex items-center text-sm text-muted-foreground">
                                                <FileQuestion className="w-4 h-4 mr-1.5" />
                                                {bank.questions} Questions
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-8">Edit <ArrowRight className="w-3 h-3 ml-1" /></Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="exams">
                <Card className="border-border/50 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between bg-muted/30 border-b border-border/50">
                        <div>
                            <CardTitle>Manage Exams</CardTitle>
                            <CardDescription>Combine question banks to create formal assessments.</CardDescription>
                        </div>
                        <Button size="sm"><Plus className="w-4 h-4 mr-2" /> Create Exam</Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {MOCK_ACTIVE_EXAMS.map(exam => (
                                <div key={exam.id} className="p-4 flex items-center justify-between hover:bg-muted/20">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-2 h-2 rounded-full ${exam.status === 'Active' ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                                        <div>
                                            <h4 className="font-semibold">{exam.title}</h4>
                                            <p className="text-sm text-muted-foreground">{exam.attempts} total attempts • Avg Score: {exam.avgScore ? `${exam.avgScore}%` : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm">View Analytics</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

function EmployeeAssessmentView() {
    const [takingExam, setTakingExam] = useState<number | null>(null);

    if (takingExam) {
        return (
            <Card className="max-w-3xl mx-auto shadow-xl border-primary/20">
                <CardHeader className="bg-primary/5 border-b border-primary/10">
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-display flex items-center gap-2">
                            <GraduationCap className="w-6 h-6 text-primary" />
                            Annual Security Compliance Exam
                        </CardTitle>
                        <Badge variant="outline" className="font-mono text-sm">29:45</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-4">
                        <div className="flex justify-between text-sm font-medium text-muted-foreground">
                            <span>Question 1 of 20</span>
                        </div>
                        <h3 className="text-xl font-medium leading-relaxed">
                            You receive an email from the "IT Department" asking you to click a link and verify your password due to a system upgrade. There are several spelling errors in the email body. What should you do?
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {[
                            "Click the link and carefully enter your credentials.",
                            "Reply to the email to ask if it's legitimate.",
                            "Ignore it but do not report it.",
                            "Report the email as phising using the Phish Alert button and delete it."
                        ].map((opt, i) => (
                            <div key={i} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors active:bg-muted">
                                <div className="w-5 h-5 rounded-full border border-primary flex items-center justify-center">
                                    {i === 3 && <div className="w-3 h-3 rounded-full bg-primary" />}
                                </div>
                                <Label className="cursor-pointer text-base font-normal flex-1">{opt}</Label>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between pt-6 border-t border-border/50">
                        <Button variant="outline" disabled>Previous</Button>
                        <Button onClick={() => setTakingExam(null)}>Next Question <ArrowRight className="w-4 h-4 ml-2" /></Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <h3 className="font-display font-semibold text-xl">Pending Assessments</h3>
                {MOCK_EMPLOYEE_EXAMS.filter(e => e.status === 'Pending').map(exam => (
                    <Card key={exam.id} className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <Badge variant="secondary" className="bg-primary/10 text-primary">{exam.questions} Questions</Badge>
                                <span className="text-sm font-medium text-destructive">Due: {new Date(exam.dueDate).toLocaleDateString()}</span>
                            </div>
                            <h4 className="text-lg font-bold font-display mb-4">{exam.title}</h4>
                            <Button onClick={() => setTakingExam(exam.id)} className="w-full shadow-sm">Start Assessment</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="space-y-4">
                <h3 className="font-display font-semibold text-xl">Completed</h3>
                {MOCK_EMPLOYEE_EXAMS.filter(e => e.status === 'Completed').map(exam => (
                    <Card key={exam.id} className="opacity-80 shadow-sm border-border/50">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <Badge variant="outline" className="text-muted-foreground">{new Date(exam.dueDate).toLocaleDateString()}</Badge>
                                <div className="flex items-center text-green-600 font-bold bg-green-500/10 px-2 py-0.5 rounded text-sm">
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> {exam.score}%
                                </div>
                            </div>
                            <h4 className="text-lg font-bold font-display mb-4 text-foreground/80">{exam.title}</h4>
                            <Button variant="secondary" className="w-full" size="sm">Review Answers</Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function ArrowRight({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
        </svg>
    );
}
