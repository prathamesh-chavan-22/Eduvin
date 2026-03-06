import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UploadCloud, CheckCircle2, AlertTriangle, TrendingUp, Users, Target, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Mock data for the MVP
const MOCK_SKILL_GAPS = [
    { department: "Engineering", skill: "AWS Cloud Architecture", currentLevel: 45, targetLevel: 80, usersAffected: 12 },
    { department: "Sales", skill: "Objection Handling", currentLevel: 60, targetLevel: 90, usersAffected: 8 },
    { department: "Design", skill: "Accessibility Standards", currentLevel: 30, targetLevel: 75, usersAffected: 5 },
    { department: "Marketing", skill: "Data Analytics", currentLevel: 55, targetLevel: 85, usersAffected: 7 },
];

const MOCK_RECOMMENDATIONS = [
    { title: "Cloud Practitioner Certification Path", target: "Engineering", match: 95, status: "pending" },
    { title: "Advanced Sales Techniques Q3", target: "Sales", match: 88, status: "pending" },
    { title: "Inclusive UI Masterclass", target: "Design", match: 92, status: "approved" },
];

export default function WorkforceAnalysis() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [isUploading, setIsUploading] = useState(false);
    const [hasData, setHasData] = useState(false);
    const [recommendations, setRecommendations] = useState(MOCK_RECOMMENDATIONS);

    if (!user || user.role !== "l_and_d") {
        return <Redirect to="/dashboard" />;
    }

    const handleUpload = () => {
        setIsUploading(true);
        // Simulate upload and processing time
        setTimeout(() => {
            setIsUploading(false);
            setHasData(true);
            toast({
                title: "Analysis Complete",
                description: "Successfully processed 142 employee records and performance reviews."
            });
        }, 2500);
    };

    const handleApprove = (index: number) => {
        const newRecs = [...recommendations];
        newRecs[index].status = "approved";
        setRecommendations(newRecs);
        toast({ title: "Training Plan Approved", description: `Course generator tasked with creating path for ${newRecs[index].target}.` });
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Workforce Analysis & Planning</h1>
                <p className="text-muted-foreground mt-2">Identify skill gaps and generate intelligent training recommendations.</p>
            </div>

            {!hasData ? (
                <Card className="border-2 border-dashed border-border/50 bg-muted/10">
                    <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <UploadCloud className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-display font-bold mb-2">Upload Workforce Data</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-8">
                            Import recent performance reviews, assessment scores, and manager feedback CSVs to analyze current skill levels across the organization.
                        </p>
                        <Button size="lg" onClick={handleUpload} disabled={isUploading} className="shadow-lg shadow-primary/20 h-12 px-8 text-base">
                            {isUploading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                                    Analyzing Data...
                                </span>
                            ) : (
                                "Select CSV Files to Analyze"
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Main Analysis Column */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card className="bg-primary text-primary-foreground border-none shadow-lg">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-primary-foreground/80 font-medium mb-1">Critical Gaps</p>
                                            <h4 className="text-4xl font-display font-bold">4</h4>
                                        </div>
                                        <AlertTriangle className="w-6 h-6 text-primary-foreground/50" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-border/50">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-muted-foreground font-medium mb-1">Avg Organization Score</p>
                                            <h4 className="text-3xl font-display font-bold">68%</h4>
                                        </div>
                                        <TrendingUp className="w-6 h-6 text-muted-foreground/30" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="shadow-sm border-border/50">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-muted-foreground font-medium mb-1">Employees Analyzed</p>
                                            <h4 className="text-3xl font-display font-bold">142</h4>
                                        </div>
                                        <Users className="w-6 h-6 text-muted-foreground/30" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-border/50 shadow-md rounded-xl overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
                                <CardTitle className="font-display">Department Skill Gaps</CardTitle>
                                <CardDescription>Metrics based on recent performance and competency evaluations.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[200px]">Department</TableHead>
                                            <TableHead>Identified Skill Deficit</TableHead>
                                            <TableHead>Current vs Target</TableHead>
                                            <TableHead className="text-right">Impact</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {MOCK_SKILL_GAPS.map((gap, i) => (
                                            <TableRow key={i} className="hover:bg-muted/10">
                                                <TableCell className="font-medium">{gap.department}</TableCell>
                                                <TableCell>{gap.skill}</TableCell>
                                                <TableCell>
                                                    <div className="space-y-1.5 w-[200px]">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-muted-foreground">{gap.currentLevel}%</span>
                                                            <span className="font-medium text-primary">Goal: {gap.targetLevel}%</span>
                                                        </div>
                                                        <Progress value={gap.currentLevel} className="h-2 bg-muted/50" />
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="secondary" className="font-normal">{gap.usersAffected} employees</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recommendations Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <h3 className="text-xl font-display font-bold flex items-center gap-2">
                            <Target className="w-5 h-5 text-primary" />
                            AI Recommendations
                        </h3>

                        <div className="space-y-4">
                            {recommendations.map((rec, i) => (
                                <Card key={i} className={`border border-border/50 shadow-sm transition-all ${rec.status === 'approved' ? 'bg-muted/30 opacity-70' : 'hover:shadow-md hover:border-primary/30'}`}>
                                    <CardContent className="p-5 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <Badge className={rec.status === 'approved' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/20' : 'bg-primary/20 text-primary hover:bg-primary/20'}>
                                                {rec.match}% Match
                                            </Badge>
                                            {rec.status === 'approved' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                                        </div>

                                        <div>
                                            <h4 className="font-semibold text-foreground leading-tight mb-1">{rec.title}</h4>
                                            <p className="text-sm text-muted-foreground">Target: {rec.target}</p>
                                        </div>

                                        {rec.status === 'pending' ? (
                                            <Button onClick={() => handleApprove(i)} className="w-full mt-2 shadow-sm" variant="outline">
                                                Approve & Generate
                                            </Button>
                                        ) : (
                                            <Button variant="ghost" className="w-full mt-2 text-primary text-sm hover:bg-primary/5" size="sm">
                                                View in Builder <ArrowRight className="w-4 h-4 ml-1" />
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
