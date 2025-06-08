import {
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect,
} from "react";
import {
  useMutation,
  useQuery,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Extend schema to enforce allowed roles
const extendedUserSchema = insertUserSchema.extend({
  role: insertUserSchema.shape.role.refine(
    (role) => role === "student" || role === "professor",
    { message: "Role must be either 'student' or 'professor'" }
  ),
});

type RegisterData = typeof extendedUserSchema._type;
type LoginData = { email: string; password: string };

type AuthContextType = {
  user: Omit<User, "password"> | null;
  setUser: (user: Omit<User, "password"> | null) => void;
  loginMutation: UseMutationResult<Omit<User, "password">, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<
    Omit<User, "password">,
    Error,
    RegisterData
  >;
};

// ✅ Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ✅ Auth Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);

  // ✅ Auto-login check on mount
  const { data: meData, error: meError } = useQuery({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) throw new Error("Not authenticated");
      const json = await res.json();
      return json.data.user as Omit<User, "password">;
    },
    staleTime: Infinity,
    retry: false,
  });
  // Set user state based on query result
  useEffect(() => {
    if (meData) {
      setUser(meData);
    } else if (meError) {
      setUser(null);
    }
  }, [meData, meError]);

  // ✅ Login Mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const json = await res.json();
      return json.data.user as Omit<User, "password">;
    },
    onSuccess: (user) => {
      setUser(user);
      setLocation(user.role === "professor" ? "/professor" : "/student");

      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ✅ Register Mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", data);
      const json = await res.json();
      return json.data.user as Omit<User, "password">;
    },
    onSuccess: (user) => {
      setUser(user);
      setLocation(user.role === "professor" ? "/professor" : "/student");

      toast({
        title: "Registration successful",
        description: `Welcome, ${user.firstName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ✅ Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      setUser(null);
      setLocation("/auth");

      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Auth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
