import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Cell } from "recharts";
import { TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight, LightbulbIcon } from "lucide-react";

// Mock Data
const MOCK_COMPLETION_DATA = [
    { name: "Week 1", rate: 45 },
    { name: "Week 2", rate: 52 },
    { name: "Week 3", rate: 58 },
    { name: "Week 4", rate: 65 },
    { name: "Week 5", rate: 76 },
    { name: "Week 6", rate: 84 },
];

const MOCK_SCORE_DATA = [
    { name: "Eng", avg: 88, target: 85 },
    { name: "Sales", avg: 72, target: 85 },
    { name: "Design", avg: 92, target: 85 },
    { name: "Mktg", avg: 81, target: 85 },
];

const MOCK_AT_RISK = [
    { name: "Sarah J.", department: "Sales", issue: "Failed Objection Handling twice", course: "Advanced Sales Q3" },
    { name: "Mike T.", department: "Marketing", issue: "Stalled at 40% for 3 weeks", course: "Data Analytics Basics" },
];

export default function AnalyticsIntervention() {
    const { user } = useAuth();

    if (!user || (user.role !== "manager" && user.role !== "l_and_d")) {
        return <Redirect to="/dashboard" />;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Analytics & Intervention</h1>
                    <p className="text-muted-foreground mt-2">Monitor training effectiveness and identify learners needing support.</p>
                </div>
                <div className="flex gap-2">
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Departments</SelectItem>
                            <SelectItem value="eng">Engineering</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="design">Design</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline">Export Report</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Avg Completion Rate" value="84%" trend="+12%" positive />
                <StatCard title="Avg Exam Score" value="82%" trend="+3%" positive />
                <StatCard title="Learners At Risk" value="14" trend="-2" positive />
                <StatCard title="Total Training Hours" value="1,240" trend="+150" positive />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-border/50 shadow-md">
                    <CardHeader>
                        <CardTitle>Training Completion Velocity</CardTitle>
                        <CardDescription>Percentage of assigned courses completed over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={MOCK_COMPLETION_DATA}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-md">
                    <CardHeader>
                        <CardTitle>Exam Performance by Dept</CardTitle>
                        <CardDescription>Average scores compared to target baseline (85%).</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={MOCK_SCORE_DATA}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted))" }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                                    {MOCK_SCORE_DATA.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.avg >= entry.target ? "hsl(var(--primary))" : "hsl(var(--destructive))"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-destructive/20 shadow-md">
                    <CardHeader className="bg-destructive/5 border-b border-destructive/10">
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="w-5 h-5" /> Intervention Required
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border/50">
                            {MOCK_AT_RISK.map((learner, i) => (
                                <div key={i} className="p-5 flex flex-col sm:flex-row justify-between gap-4 hover:bg-muted/10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold">{learner.name}</h4>
                                            <Badge variant="outline" className="text-xs">{learner.department}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground"><span className="font-medium text-destructive">{learner.issue}</span> in {learner.course}</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <Button variant="secondary" size="sm">Message</Button>
                                        <Button size="sm">Assign Remedial</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 shadow-md bg-gradient-to-br from-card to-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <LightbulbIcon className="w-5 h-5" /> Adaptive Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-background rounded-xl border border-border/50 shadow-sm">
                            <h4 className="font-semibold mb-1">Sales Department Content Alert</h4>
                            <p className="text-sm text-muted-foreground">The "Objection Handling" module has a 45% failure rate on the first attempt. The AI recommends regenerating this module to include more interactive scenarios to improve comprehension.</p>
                            <Button variant="ghost" className="px-0 mt-2 h-auto text-primary">Review Module Content <ArrowRight className="w-3 h-3 ml-1" /></Button>
                        </div>
                        <div className="p-4 bg-background rounded-xl border border-border/50 shadow-sm">
                            <h4 className="font-semibold mb-1">Engineering Excellence</h4>
                            <p className="text-sm text-muted-foreground">Engineering team is completing security training 3x faster than average with 95% scores. They may be ready for the "Advanced Cybersecurity" track.</p>
                            <Button variant="ghost" className="px-0 mt-2 h-auto text-primary">View Recommended Track <ArrowRight className="w-3 h-3 ml-1" /></Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend, positive }: { title: string, value: string, trend: string, positive: boolean }) {
    return (
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm border-t-2 border-t-primary/50">
            <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
                <div className="flex items-end justify-between">
                    <h4 className="text-3xl font-display font-bold">{value}</h4>
                    <div className={`flex items-center text-sm font-medium ${positive ? 'text-green-500' : 'text-destructive'}`}>
                        {positive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                        {trend}
                    </div>
                </div>
            </CardContent>
        </Card>
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
