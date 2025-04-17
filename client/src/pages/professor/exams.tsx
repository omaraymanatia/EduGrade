import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Exam } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function ProfessorExams() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch exams created by this professor
  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });
  
  // Filter exams based on search query
  const filteredExams = exams?.filter(exam => 
    exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exam.examKey.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];
  
  const columns = [
    {
      header: "Title",
      accessorKey: "title" as keyof Exam,
      cell: (exam: Exam) => (
        <div>
          <div className="font-medium">{exam.title}</div>
          <div className="text-sm text-muted-foreground">{exam.courseCode}</div>
        </div>
      ),
    },
    {
      header: "Exam Key",
      accessorKey: "examKey" as keyof Exam,
      cell: (exam: Exam) => (
        <code className="bg-muted px-2 py-1 rounded text-sm">{exam.examKey}</code>
      ),
    },
    {
      header: "Created",
      accessorKey: "createdAt" as keyof Exam,
      cell: (exam: Exam) => formatDate(exam.createdAt),
    },
    {
      header: "Status",
      accessorKey: "isActive" as keyof Exam,
      cell: (exam: Exam) => (
        <Badge variant={exam.isActive ? "success" : "secondary"}>
          {exam.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessorKey: "id" as keyof Exam,
      cell: (exam: Exam) => (
        <Button
          variant="link"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/professor/exams/${exam.id}`);
          }}
        >
          View Details
        </Button>
      ),
    },
  ];
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-gray-700 text-2xl font-medium">Exams</h3>
          <Button asChild>
            <Link href="/professor/exams/create">
              <Plus className="mr-2 h-4 w-4" /> Create New Exam
            </Link>
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search exams by title, course code, or exam key..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <DataTable
          columns={columns}
          data={filteredExams}
          onRowClick={(exam) => navigate(`/professor/exams/${exam.id}`)}
        />
        
        {!isLoading && exams?.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground mb-4">
              You haven't created any exams yet.
            </p>
            <Button asChild>
              <Link href="/professor/exams/create">
                <Plus className="mr-2 h-4 w-4" /> Create Your First Exam
              </Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
