import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { ReactNode } from "react";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => ReactNode;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Redirect if user is accessing the wrong dashboard
  if (path.startsWith("/professor") && user.role !== "professor") {
    return (
      <Route path={path}>
        <Redirect to="/student" />
      </Route>
    );
  }

  if (path.startsWith("/student") && user.role !== "student") {
    return (
      <Route path={path}>
        <Redirect to="/professor" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
