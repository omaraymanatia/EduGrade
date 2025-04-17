import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Loader2, ArrowLeft, Eye, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type Exam = {
  id: number;
  title: string;
  course: string;
  description: string;
  duration: number;
  accessCode: string;
  totalPoints: number;
  createdAt: string;
  createdBy: number;
};

type Submission = {
  id: number;
  userId: number;
  examId: number;
  score: number;
  timeSpent: number;
  completedAt: string;
  user?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const examId = parseInt(id || "0");
  const isProfessor = user?.role === "professor";

  // Fetch exam details
  const {
    data: exam,
    isLoading: isExamLoading,
    error: examError,
  } = useQuery<Exam>({
    queryKey: [`/api/exams/${examId}`],
    enabled: !!examId && examId > 0,
  });

  // For professors, fetch submissions
  const {
    data: submissions,
    isLoading: isSubmissionsLoading,
    error: submissionsError,
  } = useQuery<Submission[]>({
    queryKey: [`/api/exams/${examId}/submissions`],
    enabled: !!examId && examId > 0 && isProfessor,
  });

  // Loading state
  if (isExamLoading || (isProfessor && isSubmissionsLoading)) {
    return (
      <DashboardLayout title="Exam Details">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (examError || (isProfessor && submissionsError)) {
    return (
      <DashboardLayout title="Exam Details">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-red-500">Failed to load exam details. Please try again later.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate("/exams")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam History
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // No exam found
  if (!exam) {
    return (
      <DashboardLayout title="Exam Details">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600">Exam not found</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate("/exams")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exam History
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const copyAccessCode = () => {
    navigator.clipboard.writeText(exam.accessCode);
    toast({
      title: "Copied to clipboard",
      description: "Exam access code copied to clipboard.",
    });
  };

  const exportResults = () => {
    toast({
      title: "Export initiated",
      description: "Exam results are being prepared for download.",
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM d, yyyy");
  };

  // Format time spent (convert seconds to minutes)
  const formatTimeSpent = (seconds?: number) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minutes`;
  };

  return (
    <DashboardLayout title={exam.title} subtitle={exam.course}>
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="text-primary hover:text-primary/80 pl-0 -ml-2 mb-4"
          onClick={() => navigate("/exams")}
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>Back to Exam History</span>
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Exam Details</h3>
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Eye className="h-5 w-5 mr-2" />
                Preview Exam
              </Button>
              {isProfessor && (
                <Button onClick={exportResults}>
                  <Download className="h-5 w-5 mr-2" />
                  Export Results
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Date Created</h4>
              <p className="font-medium">{formatDate(exam.createdAt)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Exam ID</h4>
              <div className="flex items-center">
                <p className="font-medium mr-2 font-mono">{exam.accessCode}</p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary hover:text-primary/80" 
                  onClick={copyAccessCode}
                  title="Copy to clipboard"
                >
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Time Limit</h4>
              <p className="font-medium">{exam.duration} minutes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-600 mb-2">Total Points</h4>
              <p className="font-medium">{exam.totalPoints} points</p>
            </div>
            {isProfessor && (
              <>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Students Completed</h4>
                  <p className="font-medium">
                    {submissions?.length || 0} students
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-2">Average Score</h4>
                  <p className="font-medium">
                    {submissions && submissions.length > 0
                      ? `${Math.round(
                          submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) /
                            submissions.length
                        )}%`
                      : "N/A"}
                  </p>
                </div>
              </>
            )}
          </div>

          {isProfessor && submissions && submissions.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Student Results</h3>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Time Taken</TableHead>
                      <TableHead>Date Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id} className="hover:bg-gray-50">
                        <TableCell>
                          {submission.user ? (
                            <>
                              <div className="font-medium text-gray-900">
                                {`${submission.user.firstName} ${submission.user.lastName}`}
                              </div>
                              <div className="text-sm text-gray-600">{submission.user.email}</div>
                            </>
                          ) : (
                            <div className="text-gray-600">Unknown User</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span 
                            className={`font-medium ${
                              (submission.score || 0) >= 80 
                                ? 'text-green-600' 
                                : (submission.score || 0) >= 70 
                                ? 'text-yellow-600' 
                                : 'text-red-500'
                            }`}
                          >
                            {submission.score || 0}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatTimeSpent(submission.timeSpent)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(submission.completedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80"
                          >
                            <Eye className="h-5 w-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {isProfessor && (!submissions || submissions.length === 0) && (
            <div className="text-center py-8 text-gray-600">
              <p>No students have taken this exam yet.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
