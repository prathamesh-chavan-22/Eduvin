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
import MyLearning from "./pages/learning/index";
import CourseGenerator from "./pages/courses/generator";
import CoursePlayer from "./pages/courses/player";
import SpeakingTopics from "./pages/speaking/topics";
import TopicLessons from "./pages/speaking/lessons";
import SpeakingPractice from "./pages/speaking/practice";
import SpeakingProgress from "./pages/speaking/progress";
import TeamManagement from "./pages/team/index";
import Analysis from "./pages/analysis/index";
import Assessments from "./pages/assessments/index";
import Analytics from "./pages/analytics/index";
import Settings from "./pages/settings/index";
import Notifications from "./pages/notifications/index";
import AudioUploadPage from "./pages/audio/index";
import MindmapViewerPage from "./pages/audio/[id]";
import ExamSessionPage from "./pages/exams/session";

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
      <ProtectedRoute path="/analysis" component={Analysis} />
      <ProtectedRoute path="/assessments" component={Assessments} />
      <ProtectedRoute path="/analytics" component={Analytics} />
      <ProtectedRoute path="/settings" component={Settings} />
      <ProtectedRoute path="/notifications" component={Notifications} />
      <ProtectedRoute path="/courses" component={CoursesList} />
      <ProtectedRoute path="/learning" component={MyLearning} />
      <ProtectedRoute path="/generator" component={CourseGenerator} />
      <ProtectedRoute path="/courses/:id" component={CoursePlayer} />
      <ProtectedRoute path="/speaking" component={() => <Redirect to="/speaking/topics" />} />
      <ProtectedRoute path="/speaking/topics" component={SpeakingTopics} />
      <ProtectedRoute path="/speaking/topics/:id" component={TopicLessons} />
      <ProtectedRoute path="/speaking/practice/:id" component={SpeakingPractice} />
      <ProtectedRoute path="/speaking/progress" component={SpeakingProgress} />
      <ProtectedRoute path="/team" component={TeamManagement} />
      <ProtectedRoute path="/audio" component={AudioUploadPage} />
      <ProtectedRoute path="/audio/:id" component={MindmapViewerPage} />
      <Route path="/exams/:id" component={ExamSessionPage} />

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
