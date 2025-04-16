import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActionCard } from "@/components/dashboard/action-card";
import { SubmissionsTable } from "@/components/dashboard/submissions-table";
import { AiDetectionDemo } from "@/components/dashboard/ai-detection-demo";
import { Loader2, FilePlus, FileText, FileImage, Users, BarChart4, FileUp } from "lucide-react";
import { useLocation } from "wouter";

interface ProfessorStats {
  totalExams: number;
  totalStudents: number;
  totalDetections: number;
  recentSubmissions: any[];
}

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Mock data for demonstration purposes
  const mockStats: ProfessorStats = {
    totalExams: 5,
    totalStudents: 45,
    totalDetections: 12,
    recentSubmissions: [
      { id: 1, examTitle: "Midterm Exam", type: "Mixed", course: "Computer Science", status: "Active", submissionCount: 24 },
      { id: 2, examTitle: "Final Exam", type: "Essay", course: "Computer Science", status: "Draft", submissionCount: 0 }
    ]
  };
  
  const { data: stats, isLoading } = useQuery<ProfessorStats>({
    queryKey: ["/api/stats"],
    initialData: mockStats // Using mock data as initial data
  });

  if (!user || user.role !== "professor") {
    return null; // Will be redirected by protected route
  }
  
  const handleCreateExam = () => {
    navigate("/create-exam");
  };
  
  const handleUploadExamImage = () => {
    navigate("/upload-exam-image");
  };

  return (
    <AppShell>
      <div className="py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Professor Dashboard</h1>
        </div>
        
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          {/* Stats Overview */}
          {isLoading ? (
            <div className="flex justify-center mt-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-6">
              <StatsCard 
                title="Total Exams"
                value={stats?.totalExams || 0}
                icon={<FileText className="w-6 h-6" />}
                linkText="View all"
                linkHref="#exams"
                color="primary"
              />
            </div>
          )}

          {/* Create New Exam Actions */}
          <div className="mt-6">
            <ActionCard
              title="Create New Exam"
              description="Set up a new exam with both multiple choice and essay questions for your students. You can also upload a photo of your exam for automatic text extraction."
              actions={[
                {
                  label: "Create Exam Manually",
                  icon: <FilePlus className="w-5 h-5 mr-2" />,
                  onClick: handleCreateExam,
                  primary: true,
                  color: "primary"
                },
                {
                  label: "Upload Exam Photo",
                  icon: <FileImage className="w-5 h-5 mr-2" />,
                  onClick: handleUploadExamImage,
                  color: "secondary"
                }
              ]}
            />
          </div>

          {/* Exams History */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Exam History</h3>
              <a href="#exams" className="text-sm font-medium text-primary hover:text-primary-dark">
                View all
              </a>
            </div>
            
            <div className="mt-4 overflow-hidden bg-white shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                      Exam Title
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Course
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Submissions
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {stats?.recentSubmissions && stats.recentSubmissions.length > 0 ? (
                    stats.recentSubmissions.map((submission, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          Midterm Exam
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          MCQ
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          Computer Science
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          24
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a href="#" className="text-primary hover:text-primary-dark mr-4">
                            View
                          </a>
                          <a href="#" className="text-red-600 hover:text-red-900">
                            Delete
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-sm text-gray-500">
                        No exams created yet. Create your first exam to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
