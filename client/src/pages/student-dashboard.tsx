import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, GraduationCap, CheckCircle, ArrowRight, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface StudentStats {
  availableExams: number;
  grades: Array<{
    examId: number;
    examTitle: string;
    grade: number;
  }>;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  // Mock data for demonstration purposes
  const mockStats: StudentStats = {
    availableExams: 3,
    grades: [
      { examId: 1, examTitle: "Midterm Exam", grade: 85 },
      { examId: 2, examTitle: "Quiz 1", grade: 92 },
      { examId: 3, examTitle: "Assignment 2", grade: 78 }
    ]
  };
  
  const mockExams = [
    { id: 4, title: "Final Exam", course: "Computer Science", timeLimit: 120, examType: "mixed", questions: 15 },
    { id: 5, title: "Essay Assignment", course: "Computer Science", timeLimit: 60, examType: "article", questions: 3 },
    { id: 6, title: "Pop Quiz", course: "Algorithms", timeLimit: 30, examType: "mcq", questions: 10 }
  ];
  
  const { data: stats, isLoading } = useQuery<StudentStats>({
    queryKey: ["/api/stats"],
    initialData: mockStats // Using mock data as initial data
  });

  // Get upcomings exams for the student
  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
    initialData: mockExams // Using mock data as initial data
  });

  if (!user || user.role !== "student") {
    return null; // Will be redirected by protected route
  }
  
  const handleEnterExam = (examId: number) => {
    navigate(`/take-exam/${examId}`);
  };

  return (
    <AppShell>
      <div className="py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Student Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {user.fullName}
          </p>
        </div>
        
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          {/* Stats Overview */}
          {isLoading ? (
            <div className="flex justify-center mt-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <StatsCard 
                title="Available Exams"
                value={stats?.availableExams || 0}
                icon={<FileText className="w-6 h-6" />}
                linkText="View all"
                linkHref="#available"
                color="primary"
              />
              <StatsCard 
                title="Average Grade"
                value={`${calculateAverage(stats?.grades || [])}%`}
                icon={<GraduationCap className="w-6 h-6" />}
                linkText="View details"
                linkHref="#grades"
                color="secondary"
              />
              <StatsCard 
                title="Completed Exams"
                value={stats?.grades?.length || 0}
                icon={<CheckCircle className="w-6 h-6" />}
                linkText="View all"
                linkHref="#completed"
                color="green"
              />
            </div>
          )}



          {/* Available Exams */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Available Exams</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.isArray(exams) && exams.length > 0 ? (
                exams.slice(0, 3).map((exam: any) => (
                  <Card key={exam.id || Math.random()}>
                    <CardContent className="pt-5">
                      <div className="flex items-center mb-2">
                        <Clock className="h-4 w-4 text-gray-500 mr-1" />
                        <span className="text-xs text-gray-500">
                          {exam.timeLimit ? `${exam.timeLimit} minutes` : 'No time limit'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-lg">{exam.title || 'Untitled Exam'}</h4>
                      <p className="text-sm text-gray-500 mt-1">{exam.course || 'General'}</p>
                      <div className="mt-4 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {exam.examType === 'mcq' ? 'Multiple Choice' : 'Article/Essay'}
                          </span>
                          <span className="text-sm text-gray-700">
                            {exam.dueDate ? new Date(exam.dueDate).toLocaleDateString() : 'No due date'}
                          </span>
                        </div>
                        <Button 
                          onClick={() => handleEnterExam(exam.id || 0)}
                          className="w-full mt-2 flex items-center justify-center gap-1"
                        >
                          Enter Exam <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full p-4 text-center">
                  <p className="text-gray-500">No available exams</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed Exams */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Completed Exams</h3>
            <Card>
              <CardContent className="p-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Exam
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Grade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats?.grades && stats.grades.length > 0 ? (
                      stats.grades.map((grade) => (
                        <tr key={grade.examId}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {grade.examTitle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Computer Science
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date().toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              grade.grade >= 90 ? 'bg-green-100 text-green-800' : 
                              grade.grade >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'
                            }`}>
                              {grade.grade}%
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                          No completed exams yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function calculateAverage(grades: Array<{grade: number}>): string {
  if (grades.length === 0) return "0";
  
  const sum = grades.reduce((total, current) => total + current.grade, 0);
  return (sum / grades.length).toFixed(1);
}
