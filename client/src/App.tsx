import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import ProfessorDashboard from "@/pages/professor-dashboard";
import StudentDashboard from "@/pages/student-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import CreateExam from "@/pages/create-exam";
import UploadExamImage from "@/pages/upload-exam-image";
import TakeExam from "@/pages/take-exam";
import AboutPage from "@/pages/about-page";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/professor" component={ProfessorDashboard} requiredRole="professor" />
      <ProtectedRoute path="/student" component={StudentDashboard} requiredRole="student" />
      <ProtectedRoute path="/create-exam" component={CreateExam} requiredRole="professor" />
      <ProtectedRoute path="/upload-exam-image" component={UploadExamImage} requiredRole="professor" />
      <ProtectedRoute path="/take-exam/:examId" component={TakeExam} requiredRole="student" />
      <Route path="/about" component={AboutPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
