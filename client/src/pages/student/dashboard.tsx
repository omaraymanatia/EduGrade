import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Search } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { StudentExam } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
// Exam key validation schema
const examKeySchema = z.object({
  examKey: z.string().min(1, "Exam key is required"),
});

// Add a function to format date with time
const formatDateWithTime = (date: Date | string | null): string => {
  if (!date) return "-";
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function StudentDashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { user } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);

  // Form for exam key
  const form = useForm<z.infer<typeof examKeySchema>>({
    resolver: zodResolver(examKeySchema),
    defaultValues: {
      examKey: "",
    },
  });

  // Define a type that includes examTitle
  type StudentExamWithTitle = StudentExam & { examTitle: string };

  // Fetch student exams - update endpoint to use stud-exams
  const { data: studentExams, isLoading } = useQuery({
    queryKey: ["/api/stud-exams"], // Updated endpoint
  });

  // Mutation to verify exam key
  const verifyExamKeyMutation = useMutation({
    mutationFn: async (data: { examKey: string }) => {
      setIsVerifying(true);
      const res = await apiRequest("POST", "/api/verify-exam-key", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      // Redirect to take exam page
      navigate(`/student/exams/${data.examId}`);
      form.reset();
    },
    onError: (error: Error) => {
      setIsVerifying(false);
      toast({
        title: "Invalid exam key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle exam key submission
  const onSubmit = (data: z.infer<typeof examKeySchema>) => {
    verifyExamKeyMutation.mutate(data);
  };

  // Get recent exams (last 3)
  const recentExams = Array.isArray(studentExams)
    ? studentExams.slice(0, 3)
    : [];

  // Calculate stats - only keeping completed exams count
  const completedExams = Array.isArray(studentExams)
    ? studentExams.filter((exam) => exam.status === "completed").length
    : 0;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <h3 className="text-gray-700 text-2xl font-medium">Dashboard</h3>

        {/* Stats Cards - Reduced width border */}
        <div className="mt-4">
          <Card className="border-[1px]">
            {" "}
            {/* Reduced border width from default 2px to 1px */}
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Completed Exams
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-700">
                      {completedExams}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Access Exam Section */}
        <div className="mt-8">
          <Card>
            <CardContent className="p-6">
              <h4 className="text-lg font-medium text-gray-800 mb-4">
                Access an Exam
              </h4>
              <p className="text-gray-600 mb-4">
                Enter the exam ID provided by your professor to access the exam.
              </p>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <FormField
                      control={form.control}
                      name="examKey"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                              <Input
                                className="pl-8"
                                placeholder="Enter exam ID (e.g. DST-45X9-789A)"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={verifyExamKeyMutation.isPending}
                    >
                      {verifyExamKeyMutation.isPending
                        ? "Verifying..."
                        : "Access Exam"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Recent Exams */}
        <div className="mt-8">
          <h4 className="text-gray-700 text-xl font-medium mb-4">
            Recent Exams
          </h4>

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : recentExams.length > 0 ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <Link href={`/student/exams/${exam.examId}`}>
                          <div className="cursor-pointer">
                            <div className="font-medium hover:underline">
                              Exam #{exam.examId}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {exam.examTitle || ""}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {exam.startedAt
                          ? formatDateWithTime(exam.startedAt)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {exam.submittedAt
                          ? formatDateWithTime(exam.submittedAt)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {exam.score !== null ? `${exam.score}%` : "-"}
                      </TableCell>
                      <TableCell>
                        {exam.status === "completed" ? (
                          <Badge
                            variant={
                              exam.score && exam.score >= 70
                                ? "default"
                                : "destructive"
                            }
                          >
                            {exam.score && exam.score >= 70
                              ? "Passed"
                              : "Failed"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">In Progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center py-10">
                <p className="text-muted-foreground">
                  You haven't taken any exams yet. Use the form above to access
                  an exam with the ID provided by your professor.
                </p>
              </CardContent>
            </Card>
          )}

          {Array.isArray(studentExams) && studentExams.length > 3 && (
            <div className="mt-4 text-center">
              <Button variant="outline" asChild>
                <Link href="/student/exams">View All Exams</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
