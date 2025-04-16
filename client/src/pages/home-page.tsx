import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useEffect } from "react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user && !isLoading) {
      switch (user.role) {
        case "professor":
          window.location.href = "/professor";
          break;
        case "student":
          window.location.href = "/student";
          break;
        case "admin":
          window.location.href = "/admin";
          break;
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <span className="ml-2 text-xl font-medium text-gray-700">Loading...</span>
      </div>
    );
  }

  // This should not happen because the protected route would redirect to auth
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="ml-2 text-lg">Redirecting to your dashboard...</span>
    </div>
  );
}
