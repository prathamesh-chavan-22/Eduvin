import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { useEnrollments } from "@/hooks/use-enrollments";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default function MyLearning() {
  const { user } = useAuth();
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useEnrollments();

  const isLoading = coursesLoading || enrollmentsLoading;

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading your courses...</div>;
  }

  // Filter enrollments for current user
  const userEnrollments = enrollments.filter((e: any) => e.userId === user?.id);
  
  // Get enrolled course IDs
  const enrolledCourseIds = new Set(userEnrollments.map((e: any) => e.courseId));
  
  // Filter courses to only show enrolled ones
  const enrolledCourses = courses.filter((c: any) => enrolledCourseIds.has(c.id));

  // Group courses by status
  const inProgress = userEnrollments.filter((e: any) => e.status === "in_progress" || e.status === "assigned");
  const completed = userEnrollments.filter((e: any) => e.status === "completed");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">My Learning</h1>
        <p className="text-muted-foreground mt-2">Courses you are assigned or currently undertaking.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <p className="text-sm font-medium text-muted-foreground">Assigned Courses</p>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{enrolledCourses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Total courses assigned</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <p className="text-sm font-medium text-muted-foreground">In Progress</p>
            <div className="w-10 h-10 rounded-full bg-blue/10 flex items-center justify-center text-blue-500">
              <Clock className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{inProgress.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently undertaking</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <p className="text-sm font-medium text-muted-foreground">Completed</p>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{completed.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully finished</p>
          </CardContent>
        </Card>
      </div>

      {/* In Progress Section */}
      <div>
        <h2 className="text-xl font-display font-bold mb-4">Continue Learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {inProgress.map((enrollment: any) => {
            const course = courses.find((c: any) => c.id === enrollment.courseId);
            if (!course) return null;
            return (
              <Card key={enrollment.id} className="group border border-border/50 shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col">
                <div className="h-40 bg-gradient-to-br from-primary/80 to-secondary p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                    <BookOpen className="w-24 h-24" />
                  </div>
                  <div className="flex justify-between items-start relative z-10">
                    <Badge variant="secondary" className="bg-white/90 text-primary backdrop-blur">
                      In Progress
                    </Badge>
                  </div>
                  <h3 className="font-display font-bold text-xl leading-tight line-clamp-2 relative z-10 text-white group-hover:text-white/90 transition-colors">
                    {course.title}
                  </h3>
                </div>
                <CardContent className="pt-6 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {course.description || "No description provided."}
                  </p>
                </CardContent>
                <CardFooter className="bg-muted/20 border-t border-border/50 py-6 px-6 flex flex-col gap-4">
                  <div>
                    <div className="flex justify-between text-xs font-medium mb-2">
                      <span>Progress</span>
                      <span className="text-primary">{enrollment.progressPct}%</span>
                    </div>
                    <Progress value={enrollment.progressPct} className="h-2 bg-muted" />
                  </div>
                  <Button variant="ghost" size="sm" className="w-full font-semibold text-primary hover:bg-primary/10" asChild>
                    <Link href={`/courses/${course.id}`}>Continue</Link>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
          {inProgress.length === 0 && (
            <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-2xl">
              <Clock className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
              <h3 className="font-semibold text-lg">No courses in progress</h3>
              <p className="text-muted-foreground">Start a course to see it here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Not Started Section */}
      {userEnrollments.length > inProgress.length && (
        <div>
          <h2 className="text-xl font-display font-bold mb-4">Not Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {userEnrollments
              .filter((e: any) => e.status === "not_started")
              .map((enrollment: any) => {
                const course = courses.find((c: any) => c.id === enrollment.courseId);
                if (!course) return null;
                return (
                  <Card key={enrollment.id} className="group border border-border/50 shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col">
                    <div className="h-40 bg-gradient-to-br from-secondary to-muted p-6 flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                        <BookOpen className="w-24 h-24" />
                      </div>
                      <div className="flex justify-between items-start relative z-10">
                        <Badge variant="outline" className="border-muted-foreground/30">
                          Not Started
                        </Badge>
                      </div>
                      <h3 className="font-display font-bold text-xl leading-tight line-clamp-2 relative z-10 group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                    </div>
                    <CardContent className="pt-6 flex-1">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {course.description || "No description provided."}
                      </p>
                    </CardContent>
                    <CardFooter className="bg-muted/20 border-t border-border/50 py-4 px-6">
                      <Button variant="ghost" size="sm" className="w-full font-semibold text-primary hover:bg-primary/10" asChild>
                        <Link href={`/courses/${course.id}`}>Start</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* Completed Section */}
      {completed.length > 0 && (
        <div>
          <h2 className="text-xl font-display font-bold mb-4">Completed ({completed.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {completed.map((enrollment: any) => {
              const course = courses.find((c: any) => c.id === enrollment.courseId);
              if (!course) return null;
              return (
                <Card key={enrollment.id} className="group border border-border/50 shadow-md hover:shadow-xl hover:border-green-500/20 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col opacity-75">
                  <div className="h-40 bg-gradient-to-br from-green-500/40 to-green-500/20 p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                      <CheckCircle className="w-24 h-24 text-green-500" />
                    </div>
                    <div className="flex justify-between items-start relative z-10">
                      <Badge variant="secondary" className="bg-green-500/90 text-white backdrop-blur">
                        Completed
                      </Badge>
                    </div>
                    <h3 className="font-display font-bold text-xl leading-tight line-clamp-2 relative z-10 group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                  </div>
                  <CardContent className="pt-6 flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {course.description || "No description provided."}
                    </p>
                  </CardContent>
                  <CardFooter className="bg-muted/20 border-t border-border/50 py-4 px-6">
                    <Button variant="ghost" size="sm" className="w-full font-semibold text-muted-foreground" asChild>
                      <Link href={`/courses/${course.id}`}>Review</Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {enrolledCourses.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-2xl">
          <BookOpen className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
          <h3 className="font-semibold text-lg">No courses assigned yet</h3>
          <p className="text-muted-foreground">Your manager will assign courses when they're ready.</p>
        </div>
      )}
    </div>
  );
}
