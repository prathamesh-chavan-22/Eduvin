import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { useCourses } from "@/hooks/use-courses";
import { useEnrollments, useCreateEnrollment } from "@/hooks/use-enrollments";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2, ChevronDown, ChevronRight, Brain, BookOpen } from "lucide-react";

function EmployeeDrillDown({ userId }: { userId: number }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: [`/api/tutor/profile/${userId}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 px-4 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading profile...
      </div>
    );
  }
  if (!data) return null;

  const { profile, enrollments } = data;

  return (
    <div className="bg-muted/30 border-t border-border/30 px-4 py-4 space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Knowledge Level</p>
          <p className="font-bold capitalize">{profile.knowledgeLevel}</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Avg Quiz Score</p>
          <p className="font-bold">{profile.avgQuizScore}%</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground">Modules Completed</p>
          <p className="font-bold">{profile.totalModulesCompleted}</p>
        </div>
      </div>

      {profile.strongTopics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">Strong:</span>
          {profile.strongTopics.map((t: string) => (
            <Badge key={t} className="bg-green-500/10 text-green-700 text-xs">{t}</Badge>
          ))}
        </div>
      )}
      {profile.struggleTopics?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-muted-foreground mr-1">Needs work:</span>
          {profile.struggleTopics.map((t: string) => (
            <Badge key={t} className="bg-destructive/10 text-destructive text-xs">{t}</Badge>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {enrollments?.map((e: any) => (
          <div key={e.courseId} className="flex items-center gap-3">
            <div className="w-36 truncate text-sm" title={e.courseTitle}>{e.courseTitle}</div>
            <Progress value={e.progressPct} className="flex-1 h-2" />
            <span className="text-xs w-10 text-right">{e.progressPct}%</span>
            <Badge variant="outline" className="text-xs">{e.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TeamManagement() {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const { data: courses = [] } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const enroll = useCreateEnrollment();
  const { toast } = useToast();

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  if (!user || (user.role !== "manager" && user.role !== "l_and_d")) {
    return <Redirect to="/dashboard" />;
  }

  const team = users.filter(u => u.role === "employee");
  const publishedCourses = courses.filter(c => c.status === "published");

  const openAssignModal = (u: any) => {
    setSelectedUser(u);
    setSelectedCourseId("");
    setAssignDialogOpen(true);
  };

  const handleAssign = async () => {
    if (!selectedCourseId || !selectedUser) return;
    try {
      await enroll.mutateAsync({
        userId: selectedUser.id,
        courseId: parseInt(selectedCourseId, 10),
        status: "assigned",
        progressPct: 0
      });
      toast({ title: "Course assigned successfully!" });
      setAssignDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to assign", description: e.message });
    }
  };

  const toggleRow = (id: number) => setExpandedRow(expandedRow === id ? null : id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Team Management</h1>
        <p className="text-muted-foreground mt-2">Monitor progress and assign new learning paths. Click a row to see details.</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[300px] py-4">Employee</TableHead>
              <TableHead>Active Courses</TableHead>
              <TableHead>Avg Progress</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {team.map((employee) => {
              const empEnrollments = enrollments.filter(e => e.userId === employee.id);
              const inProgress = empEnrollments.filter(e => e.status !== "completed").length;
              const avgProgress = empEnrollments.length
                ? Math.round(empEnrollments.reduce((acc, e) => acc + e.progressPct, 0) / empEnrollments.length)
                : 0;
              const isExpanded = expandedRow === employee.id;

              return (
                <>
                  <TableRow
                    key={employee.id}
                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => toggleRow(employee.id)}
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {employee.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1">
                            {isExpanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                            {employee.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">{employee.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                        {inProgress} active
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 max-w-[200px]">
                        <Progress value={avgProgress} className="h-2 flex-1" />
                        <span className="text-xs font-medium w-8">{avgProgress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => openAssignModal(employee)} className="hover:bg-primary/10 hover:text-primary border-primary/20">
                        <PlusCircle className="w-4 h-4 mr-2" /> Assign Course
                      </Button>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${employee.id}-detail`}>
                      <TableCell colSpan={4} className="p-0">
                        <EmployeeDrillDown userId={employee.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
            {team.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                  No employees found in the system.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Assign Course</DialogTitle>
            <DialogDescription>Assign a new course to {selectedUser?.fullName}.</DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label>Select Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-full h-11 bg-muted/30">
                  <SelectValue placeholder="Choose a published course..." />
                </SelectTrigger>
                <SelectContent>
                  {publishedCourses.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                  ))}
                  {publishedCourses.length === 0 && (
                    <div className="p-2 text-sm text-muted-foreground">No published courses available</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select defaultValue="medium">
                  <SelectTrigger className="w-full bg-muted/30"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (Optional)</SelectItem>
                    <SelectItem value="medium">Medium (Standard)</SelectItem>
                    <SelectItem value="high">High (Required Compliance)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deadline (Optional)</Label>
                <Input type="date" className="w-full bg-muted/30" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={!selectedCourseId || enroll.isPending} className="shadow-lg shadow-primary/20">
              {enroll.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
