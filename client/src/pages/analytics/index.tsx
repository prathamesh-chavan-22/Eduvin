import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Cell } from "recharts";
import { TrendingUp, Users, AlertCircle, ArrowUpRight, ArrowDownRight, LightbulbIcon, Loader2 } from "lucide-react";

export default function AnalyticsIntervention() {
    const { user } = useAuth();

    if (!user || (user.role !== "manager" && user.role !== "l_and_d")) {
        return <Redirect to="/dashboard" />;
    }

    const { data, isLoading } = useQuery<any>({
        queryKey: ["/api/analytics/dashboard"],
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const completionTrend = data?.completionTrend ?? [];
    const scoreByUser = data?.scoreByUser ?? [];
    const atRisk = data?.atRisk ?? [];

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Analytics & Intervention</h1>
                    <p className="text-muted-foreground mt-2">Monitor training effectiveness and identify learners needing support.</p>
                </div>
                <Button variant="outline">Export Report</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Avg Completion Rate"
                    value={`${data?.completionRate ?? 0}%`}
                    trend={`${data?.completedCount ?? 0}/${data?.totalEnrollments ?? 0} completed`}
                    positive={(data?.completionRate ?? 0) >= 50}
                />
                <StatCard
                    title="Avg Quiz Score"
                    value={`${data?.avgQuizScore ?? 0}%`}
                    trend={data?.avgQuizScore >= 75 ? "Above target" : "Below target"}
                    positive={(data?.avgQuizScore ?? 0) >= 75}
                />
                <StatCard
                    title="Learners At Risk"
                    value={String(data?.atRiskCount ?? 0)}
                    trend={data?.atRiskCount > 0 ? "Need attention" : "All on track"}
                    positive={(data?.atRiskCount ?? 1) === 0}
                />
                <StatCard
                    title="Total Enrollments"
                    value={String(data?.totalEnrollments ?? 0)}
                    trend="All time"
                    positive
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-border/50 shadow-md">
                    <CardHeader>
                        <CardTitle>Training Completion Velocity</CardTitle>
                        <CardDescription>Percentage of assigned courses completed over time.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={completionTrend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-md">
                    <CardHeader>
                        <CardTitle>Quiz Performance by Learner</CardTitle>
                        <CardDescription>Average quiz scores compared to 75% target baseline.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={scoreByUser}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))" }} domain={[0, 100]} />
                                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                                    {scoreByUser.map((entry: any, index: number) => (
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
                        {atRisk.length === 0 ? (
                            <div className="p-6 text-center text-muted-foreground">
                                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
                                All learners are on track!
                            </div>
                        ) : (
                            <div className="divide-y divide-border/50">
                                {atRisk.map((learner: any, i: number) => (
                                    <div key={i} className="p-5 flex flex-col sm:flex-row justify-between gap-4 hover:bg-muted/10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold">{learner.name}</h4>
                                                <Badge variant="outline" className="text-xs">{learner.email}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                <span className="font-medium text-destructive">Progress: {learner.progress}%</span>
                                                {" · "}Quiz avg: {learner.quiz_score}%
                                            </p>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            <Button size="sm">Assign Remedial</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                            <h4 className="font-semibold mb-1">At-Risk Learner Support</h4>
                            <p className="text-sm text-muted-foreground">
                                Learners with quiz scores below 50% or progress below 30% are flagged. Consider scheduling 1-on-1 coaching or reassigning simpler prerequisites.
                            </p>
                        </div>
                        <div className="p-4 bg-background rounded-xl border border-border/50 shadow-sm">
                            <h4 className="font-semibold mb-1">Top Performer Recognition</h4>
                            <p className="text-sm text-muted-foreground">
                                Learners with quiz averages above 85% are ready for advanced content. Consider assigning them as peer mentors or enrolling them in next-level courses.
                            </p>
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
