import { useAuth } from "@/hooks/use-auth";
import { useUsers } from "@/hooks/use-users";
import { useCourses } from "@/hooks/use-courses";
import { useEnrollments, useCreateEnrollment } from "@/hooks/use-enrollments";
import { useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2 } from "lucide-react";

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Team Management</h1>
        <p className="text-muted-foreground mt-2">Monitor progress and assign new learning paths.</p>
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

              return (
                <TableRow key={employee.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {employee.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{employee.fullName}</div>
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
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => openAssignModal(employee)} className="hover:bg-primary/10 hover:text-primary border-primary/20">
                      <PlusCircle className="w-4 h-4 mr-2" /> Assign Course
                    </Button>
                  </TableCell>
                </TableRow>
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
            <DialogDescription>
              Assign a new course to {selectedUser?.fullName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label>Select Course</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-full">
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
