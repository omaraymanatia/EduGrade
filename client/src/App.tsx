import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute } from "./lib/protected-route";
import ProfessorDashboard from "./pages/professor/dashboard";
import ProfessorExams from "./pages/professor/exams";
import ProfessorCreateExam from "./pages/professor/create-exam";
import ProfessorExamDetails from "./pages/professor/exam-details";
import ProfessorProfile from "./pages/professor/profile";
import StudentDashboard from "./pages/student/dashboard";
import StudentExams from "./pages/student/exams";
import StudentTakeExam from "./pages/student/take-exam";
import StudentProfile from "./pages/student/profile";

function Router() {
  return (
    <Switch>
      {/* Auth route */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Professor routes */}
      <ProtectedRoute path="/professor" component={ProfessorDashboard} />
      <ProtectedRoute path="/professor/exams" component={ProfessorExams} />
      <ProtectedRoute path="/professor/exams/create" component={ProfessorCreateExam} />
      <ProtectedRoute path="/professor/exams/:id" component={ProfessorExamDetails} />
      <ProtectedRoute path="/professor/profile" component={ProfessorProfile} />
      
      {/* Student routes */}
      <ProtectedRoute path="/student" component={StudentDashboard} />
      <ProtectedRoute path="/student/exams" component={StudentExams} />
      <ProtectedRoute path="/student/exams/:id" component={StudentTakeExam} />
      <ProtectedRoute path="/student/profile" component={StudentProfile} />
      
      {/* Redirect root to auth page */}
      <Route path="/">
        {() => {
          window.location.href = "/auth";
          return null;
        }}
      </Route>
      
      {/* Fallback to 404 */}
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
