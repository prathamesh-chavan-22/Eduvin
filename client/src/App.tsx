import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "./components/layout/main-layout";

import Login from "./pages/auth/login";
import Dashboard from "./pages/dashboard/index";
import CoursesList from "./pages/courses/index";
import CourseBuilder from "./pages/courses/builder";
import CourseGenerator from "./pages/courses/generator";
import CoursePlayer from "./pages/courses/player";
import SpeakingCoach from "./pages/speaking/index";
import TeamManagement from "./pages/team/index";

function ProtectedRoute({ component: Component, ...rest }: any) {
  return (
    <Route {...rest}>
      <MainLayout>
        <Component />
      </MainLayout>
    </Route>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
      <Route path="/login" component={Login} />
      
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/courses" component={CoursesList} />
      <ProtectedRoute path="/learning" component={CoursesList} />
      <ProtectedRoute path="/builder" component={CourseBuilder} />
      <ProtectedRoute path="/generator" component={CourseGenerator} />
      <ProtectedRoute path="/courses/:id" component={CoursePlayer} />
      <ProtectedRoute path="/speaking" component={SpeakingCoach} />
      <ProtectedRoute path="/team" component={TeamManagement} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
