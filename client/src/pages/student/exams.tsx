import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { StudentExam } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTimeAgo } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentExams() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch exams taken by this student
  const { data: studentExams, isLoading } = useQuery<StudentExam[]>({
    queryKey: ["/api/exams"],
  });
  
  // Filter exams based on search query (basic implementation)
  const filteredExams = studentExams?.filter(exam => 
    // Since we don't have the actual exam title in the student exam object,
    // we're just filtering by ID and date for demonstration
    exam.id.toString().includes(searchQuery.toLowerCase()) ||
    exam.examId.toString().includes(searchQuery.toLowerCase()) ||
    (exam.startedAt && formatDate(exam.startedAt).toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];
  
  const columns = [
    {
      header: "Exam",
      accessorKey: "examId" as keyof StudentExam,
      cell: (exam: StudentExam) => (
        <div className="font-medium">Exam #{exam.examId}</div>
      ),
    },
    {
      header: "Started At",
      accessorKey: "startedAt" as keyof StudentExam,
      cell: (exam: StudentExam) => formatDate(exam.startedAt),
    },
    {
      header: "Completed At",
      accessorKey: "completedAt" as keyof StudentExam,
      cell: (exam: StudentExam) => exam.completedAt ? formatDate(exam.completedAt) : "-",
    },
    {
      header: "Score",
      accessorKey: "score" as keyof StudentExam,
      cell: (exam: StudentExam) => exam.score !== null ? `${exam.score}%` : "-",
    },
    {
      header: "Status",
      accessorKey: "status" as keyof StudentExam,
      cell: (exam: StudentExam) => {
        if (exam.status === "completed") {
          return (
            <Badge variant={exam.score && exam.score >= 70 ? "success" : "destructive"}>
              {exam.score && exam.score >= 70 ? "Passed" : "Failed"}
            </Badge>
          );
        } else {
          return <Badge variant="outline">In Progress</Badge>;
        }
      },
    },
    {
      header: "Actions",
      accessorKey: "id" as keyof StudentExam,
      cell: (exam: StudentExam) => (
        <Button
          variant="link"
          asChild
        >
          <Link href={`/student/exams/${exam.examId}`}>
            {exam.status === "in_progress" ? "Continue" : "View"}
          </Link>
        </Button>
      ),
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
                To start an exam, enter the exam ID provided by your professor on the dashboard.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
