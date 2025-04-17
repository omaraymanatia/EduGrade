import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Loader2, Search, Eye, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";

type Exam = {
  id: number;
  title: string;
  course: string;
  createdAt: string;
  accessCode: string;
  createdBy: number;
};

export default function ExamHistoryPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const examsPerPage = 5;
  
  const isProfessor = user?.role === "professor";

  // Fetch exams
  const { data: exams, isLoading, error } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  // Filter exams based on search query and status filter
  const filteredExams = exams
    ? exams.filter((exam) => {
        // Search filter
        const matchesSearch =
          exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          exam.course.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Status filter (we'd normally use a real status field)
        // For now, let's just consider all exams as "Completed"
        const matchesStatus = statusFilter === "all" || statusFilter === "completed";
        
        return matchesSearch && matchesStatus;
      })
    : [];

  // Pagination
  const totalPages = Math.ceil(filteredExams.length / examsPerPage);
  const indexOfLastExam = currentPage * examsPerPage;
  const indexOfFirstExam = indexOfLastExam - examsPerPage;
  const currentExams = filteredExams.slice(indexOfFirstExam, indexOfLastExam);

  // Handle exam row click
  const handleExamClick = (examId: number) => {
    navigate(`/exams/${examId}`);
  };

  // Render loading state
  if (isLoading) {
    return (
      <DashboardLayout title="Exam History">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Render error state
  if (error) {
    return (
      <DashboardLayout title="Exam History">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-red-500">Failed to load exams. Please try again later.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Exam History"
      subtitle="View and manage all your past and upcoming exams"
    >
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">All Exams</h3>
              <p className="text-gray-600 text-sm">
                Showing {filteredExams.length} exams
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search exams..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-full sm:w-auto">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                {isProfessor && <TableHead>Students</TableHead>}
                <TableHead>Average Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentExams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isProfessor ? 6 : 5} className="text-center py-8">
                    No exams found
                  </TableCell>
                </TableRow>
              ) : (
                currentExams.map((exam) => (
                  <TableRow
                    key={exam.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleExamClick(exam.id)}
                  >
                    <TableCell>
                      <div className="font-medium text-gray-900">{exam.title}</div>
                      <div className="text-sm text-gray-600">{exam.course}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {format(new Date(exam.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 inline-flex text-xs leading-5 font-medium rounded-full bg-green-100 text-green-800">
                        Completed
                      </span>
                    </TableCell>
                    {isProfessor && (
                      <TableCell className="text-sm text-gray-600">25/28</TableCell>
                    )}
                    <TableCell className="text-sm text-gray-600">82.4%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex space-x-3 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-primary/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExamClick(exam.id);
                          }}
                        >
                          <Eye className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-600 hover:text-gray-900"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-600">
                Showing {indexOfFirstExam + 1} to{" "}
                {Math.min(indexOfLastExam, filteredExams.length)} of{" "}
                {filteredExams.length} entries
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(Math.max(1, currentPage - 1));
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(i + 1);
                        }}
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentPage(Math.min(totalPages, currentPage + 1));
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
