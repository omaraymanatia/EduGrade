import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

// This component redirects to the appropriate dashboard based on user role
export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (user.role === "professor") {
    return <Redirect to="/professor" />;
  }

  if (user.role === "student") {
    return <Redirect to="/student" />;
  }

  return <Redirect to="/auth" />;
}
