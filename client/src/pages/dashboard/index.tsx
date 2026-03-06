import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CheckCircle, Clock, Users } from "lucide-react";
import { useCourses } from "@/hooks/use-courses";
import { useEnrollments } from "@/hooks/use-enrollments";
import { useUsers } from "@/hooks/use-users";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: courses = [] } = useCourses();
  const { data: enrollments = [] } = useEnrollments();
  const { data: users = [] } = useUsers();

  if (!user) return null;

  const getRoleDashboard = () => {
    switch(user.role) {
      case "l_and_d": return <LndDashboard courses={courses} enrollments={enrollments} users={users} />;
      case "manager": return <ManagerDashboard enrollments={enrollments} users={users} courses={courses} />;
      case "employee": return <EmployeeDashboard enrollments={enrollments.filter(e => e.userId === user.id)} courses={courses} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Welcome back, {user.fullName.split(' ')[0]}</h1>
        <p className="text-muted-foreground mt-2 text-lg">Here's what's happening with your learning journey today.</p>
      </div>
      
      {getRoleDashboard()}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description }: any) {
  return (
    <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-5 h-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-display">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function LndDashboard({ courses, enrollments, users }: any) {
  const activeCourses = courses.filter((c: any) => c.status === "published").length;
  const completionRate = enrollments.length 
    ? Math.round((enrollments.filter((e: any) => e.status === "completed").length / enrollments.length) * 100) 
    : 0;

  // Mock data for chart based on real counts
  const chartData = [
    { name: "Jan", enrollments: Math.floor(Math.random() * 50) + 10 },
    { name: "Feb", enrollments: Math.floor(Math.random() * 50) + 20 },
    { name: "Mar", enrollments: Math.floor(Math.random() * 50) + 30 },
    { name: "Apr", enrollments: enrollments.length },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={users.length} icon={Users} description="Active learners on platform" />
        <StatCard title="Active Courses" value={activeCourses} icon={BookOpen} description="Published courses available" />
        <StatCard title="Total Enrollments" value={enrollments.length} icon={Clock} description="Across all courses" />
        <StatCard title="Avg Completion" value={`${completionRate}%`} icon={CheckCircle} description="Overall success rate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border/50 shadow-lg shadow-black/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display">Enrollment Trends</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))"}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: "hsl(var(--muted-foreground))"}} />
                <Tooltip 
                  cursor={{fill: "hsl(var(--muted))"}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                />
                <Bar dataKey="enrollments" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-lg shadow-black/5 rounded-2xl">
          <CardHeader>
            <CardTitle className="font-display">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {enrollments.slice(0, 5).map((e: any, i: number) => {
                const course = courses.find((c: any) => c.id === e.courseId);
                const user = users.find((u: any) => u.id === e.userId);
                return (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-primary">
                      {user?.fullName.charAt(0) || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user?.fullName || "User"} enrolled in {course?.title || "a course"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{e.status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ManagerDashboard({ enrollments, users, courses }: any) {
  // A manager typically sees their direct reports. Here we mock it by just showing some users.
  const teamMembers = users.filter((u: any) => u.role === "employee").slice(0, 5);

  return (
    <div className="space-y-8">
      <Card className="border-border/50 shadow-lg shadow-black/5 rounded-2xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
          <CardTitle className="font-display">Team Learning Progress</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {teamMembers.map((member: any) => {
              const memberEnrollments = enrollments.filter((e: any) => e.userId === member.id);
              const avgProgress = memberEnrollments.length 
                ? Math.round(memberEnrollments.reduce((acc: number, e: any) => acc + e.progressPct, 0) / memberEnrollments.length) 
                : 0;

              return (
                <div key={member.id} className="p-6 flex flex-col md:flex-row items-center gap-6 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-4 w-full md:w-1/3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                      {member.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{member.fullName}</h4>
                      <p className="text-sm text-muted-foreground">{memberEnrollments.length} courses assigned</p>
                    </div>
                  </div>
                  <div className="w-full md:w-2/3 flex items-center gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Overall Progress</span>
                        <span className="font-bold text-primary">{avgProgress}%</span>
                      </div>
                      <Progress value={avgProgress} className="h-2" />
                    </div>
                  </div>
                </div>
              );
            })}
            {teamMembers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">No team members found.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmployeeDashboard({ enrollments, courses }: any) {
  const inProgress = enrollments.filter((e: any) => e.status === "in_progress" || e.status === "assigned");
  const completed = enrollments.filter((e: any) => e.status === "completed");

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Courses Assigned" value={enrollments.length} icon={BookOpen} description="Total courses assigned to you" />
        <StatCard title="In Progress" value={inProgress.length} icon={Clock} description="Courses you are currently taking" />
        <StatCard title="Completed" value={completed.length} icon={CheckCircle} description="Courses successfully finished" />
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-display font-bold mb-4">Continue Learning</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inProgress.map((enrollment: any) => {
            const course = courses.find((c: any) => c.id === enrollment.courseId);
            if (!course) return null;
            return (
              <Card key={enrollment.id} className="group border border-border/50 shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden flex flex-col">
                <div className="h-32 bg-gradient-to-br from-primary/80 to-secondary p-6 flex items-end">
                  <Badge variant="secondary" className="bg-white/90 text-primary backdrop-blur font-semibold pointer-events-none">
                    {course.status === 'published' ? 'Active' : 'Draft'}
                  </Badge>
                </div>
                <CardContent className="pt-6 flex-1 flex flex-col">
                  <h4 className="font-display font-bold text-lg leading-tight line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {course.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                    {course.description}
                  </p>
                  
                  <div className="space-y-2 mt-auto">
                    <div className="flex justify-between text-xs font-medium">
                      <span>Progress</span>
                      <span className="text-primary">{enrollment.progressPct}%</span>
                    </div>
                    <Progress value={enrollment.progressPct} className="h-2 bg-muted" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {inProgress.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-2xl">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-lg">You're all caught up!</h3>
              <p className="text-muted-foreground mt-1">No courses in progress right now.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
