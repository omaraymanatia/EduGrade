import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { StudentExam as BaseStudentExam } from "@shared/schema";

// Extend StudentExam to include examTitle if it's not present in the base type
type StudentExam = BaseStudentExam & {
  examTitle?: string;
};
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { Column } from "@/components/ui/data-table";

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

export default function StudentExams() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, navigate] = useLocation();

  // Fetch exams taken by this student - update endpoint to use stud-exams
  const { data: studentExams = [], isLoading } = useQuery<StudentExam[]>({
    queryKey: ["/api/stud-exams"], // Updated endpoint
    queryFn: async () => {
      const res = await fetch("/api/stud-exams");
      if (!res.ok) throw new Error("Failed to fetch exams");
      return res.json();
    },
  });

  // Filter exams based on search query
  const filteredExams =
    studentExams?.filter(
      (exam) =>
        exam.id.toString().includes(searchQuery.toLowerCase()) ||
        exam.examId.toString().includes(searchQuery.toLowerCase()) ||
        (exam.examTitle &&
          exam.examTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exam.startedAt &&
          formatDate(new Date(exam.startedAt))
            .toLowerCase()
            .includes(searchQuery.toLowerCase()))
    ) || [];
  // Add this function to handle exam card clicks
  const handleExamClick = (exam: any) => {
    if (exam.status === "completed") {
      navigate(`/student/exam-review/${exam.examId}`);
    } else {
      navigate(`/student/exams/${exam.examId}`);
    }
  };

  const columns: Column<StudentExam>[] = [
    {
      header: "Exam",
      accessorKey: "examId",
      cell: (exam: StudentExam) => (
        <div className="cursor-pointer" onClick={() => handleExamClick(exam)}>
          <div className="font-medium hover:underline">Exam #{exam.examId}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {exam.examTitle}
          </div>
        </div>
      ),
    },
    {
      header: "Started At",
      accessorKey: "startedAt",
      cell: (exam: StudentExam) =>
        exam.startedAt ? formatDateWithTime(exam.startedAt) : "-",
    },
    {
      header: "Completed At",
      accessorKey: "submittedAt",
      cell: (exam: StudentExam) =>
        exam.submittedAt ? formatDateWithTime(exam.submittedAt) : "-",
    },
    {
      header: "Score",
      accessorKey: "score",
      cell: (exam: StudentExam) =>
        exam.score !== null ? `${exam.score}%` : "-",
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (exam: StudentExam) => {
        if (exam.status === "completed") {
          return (
            <Badge
              variant={
                exam.score && exam.score >= 70 ? "default" : "destructive"
              }
            >
              {exam.score && exam.score >= 70 ? "Passed" : "Failed"}
            </Badge>
          );
        } else {
          return <Badge variant="outline">In Progress</Badge>;
        }
      },
    },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <h3 className="text-gray-700 text-2xl font-medium mb-6">My Exams</h3>

        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search exams..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <p>Loading exams...</p>
          </div>
        ) : studentExams && studentExams.length > 0 ? (
          <DataTable
            columns={columns}
            data={filteredExams}
            searchField="examId"
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center py-10">
              <p className="text-muted-foreground mb-4">
                You haven't taken any exams yet.
              </p>
              <p className="text-muted-foreground">
                To start an exam, enter the exam ID provided by your professor
                on the dashboard.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
