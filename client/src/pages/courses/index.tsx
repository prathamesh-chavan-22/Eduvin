import { useAuth } from "@/hooks/use-auth";
import { useCourses } from "@/hooks/use-courses";
import { Link } from "wouter";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function CoursesList() {
  const { user } = useAuth();
  const { data: courses = [], isLoading } = useCourses();

  const isLnd = user?.role === "l_and_d";

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading courses...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Course Library</h1>
          <p className="text-muted-foreground mt-2">Browse available learning tracks.</p>
        </div>
        {isLnd && (
          <Button asChild className="shadow-md shadow-primary/20 hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <Link href="/generator">
              <Plus className="w-4 h-4 mr-2" /> Create Course
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {courses.map((course) => (
          <Card key={course.id} className="group border border-border/50 shadow-md hover:shadow-xl hover:border-primary/20 transition-all duration-300 rounded-2xl overflow-hidden flex flex-col">
            <div className="h-40 bg-gradient-to-br from-secondary to-muted p-6 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                <BookOpen className="w-24 h-24" />
              </div>
              <div className="flex justify-between items-start relative z-10">
                <Badge variant={course.status === 'published' ? 'default' : 'secondary'} className="shadow-sm">
                  {course.status}
                </Badge>
              </div>
              <h3 className="font-display font-bold text-xl leading-tight line-clamp-2 relative z-10 group-hover:text-primary transition-colors">
                {course.title}
              </h3>
            </div>
            
            <CardContent className="pt-6 flex-1">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {course.description}
              </p>
            </CardContent>
            
            <CardFooter className="bg-muted/20 border-t border-border/50 py-4 px-6 flex justify-between items-center">
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {course.createdAt ? formatDistanceToNow(new Date(course.createdAt), { addSuffix: true }) : 'Recently'}
              </div>
              {user?.role === 'employee' ? (
                <Button variant="ghost" size="sm" className="font-semibold text-primary hover:bg-primary/10" asChild>
                  <Link href={`/courses/${course.id}`}>Start Learning</Link>
                </Button>
              ) : (
                <Button variant="ghost" size="sm" asChild>
                   <Link href={`/courses/${course.id}`}>View Details</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
        {courses.length === 0 && (
          <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-2xl">
            <BookOpen className="w-12 h-12 text-muted-foreground opacity-50 mx-auto mb-4" />
            <h3 className="font-semibold text-lg">No courses found</h3>
            <p className="text-muted-foreground">Check back later or contact L&D.</p>
          </div>
        )}
      </div>
    </div>
  );
}
