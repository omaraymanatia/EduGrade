import { createContext, ReactNode, useContext, useState } from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { insertUserSchema, User } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<Omit<User, "password"> | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      const json = await res.json();
      return json.data.user;
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

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/register", data);
      const json = await res.json();
      return json.data.user;
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
