import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatsCard } from "@/components/stats/stats-card";
import { RecentExams } from "@/components/exam/recent-exams";
import { CreateExamModal } from "@/components/exam/create-exam-modal";
import { ExamAccessForm } from "@/components/exam/exam-access-form";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  
  // Get user's full name
  const fullName = user ? `${user.firstName} ${user.lastName}` : "";
  
  const isProfessor = user?.role === "professor";
  
  // Additional data queries for statistics
  const { data: exams } = useQuery({
    queryKey: ["/api/exams"],
  });
  
  // We would normally fetch these from the API, but we'll use mock data for now
  const statsData = isProfessor
    ? [
        {
          title: "Total Exams",
          value: exams?.length || 0,
          trend: {
            value: "2 new this month",
            isPositive: true,
          },
        },
        {
          title: "Students Evaluated",
          value: "124",
          trend: {
            value: "15 more than last month",
            isPositive: true,
          },
        },
        {
          title: "Average Score",
          value: "72.5%",
          trend: {
            value: "3.2% lower than last month",
            isPositive: false,
          },
        },
      ]
    : [
        {
          title: "Exams Completed",
          value: "12",
          trend: {
            value: "3 more than last month",
            isPositive: true,
          },
        },
        {
          title: "Average Score",
          value: "86.2%",
          trend: {
            value: "4.5% higher than last month",
            isPositive: true,
          },
        },
        {
          title: "Pending Exams",
          value: "2",
        },
      ];

  return (
    <DashboardLayout 
      title={`${isProfessor ? 'Professor' : 'Student'} Dashboard`}
      subtitle={`Welcome back, ${fullName}`}
    >
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statsData.map((stat, index) => (
          <StatsCard
            key={index}
            title={stat.title}
            value={stat.value}
            trend={stat.trend}
          />
        ))}
      </div>

      {/* Professor: Create Exam & Recent Exams */}
      {isProfessor && (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="bg-white rounded-lg shadow p-6 flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Exam</h3>
            <p className="text-gray-600 mb-6">
              Create a new exam for your students with customizable questions and settings.
            </p>
            <Button onClick={() => setIsCreateExamModalOpen(true)}>
              <PlusCircle className="h-5 w-5 mr-2" />
              Create Exam
            </Button>
            
            {/* Create Exam Modal */}
            {isCreateExamModalOpen && (
              <CreateExamModal
                isOpen={isCreateExamModalOpen}
                onClose={() => setIsCreateExamModalOpen(false)}
              />
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 flex-1">
            <RecentExams />
          </div>
        </div>
      )}

      {/* Student: Access Exam & Recent Exams */}
      {!isProfessor && (
        <div className="flex flex-col md:flex-row gap-6">
          <div className="bg-white rounded-lg shadow p-6 flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Enter Exam</h3>
            <p className="text-gray-600 mb-6">
              Enter the exam ID provided by your professor to access your exam.
            </p>
            <ExamAccessForm />
          </div>

          <div className="bg-white rounded-lg shadow p-6 flex-1">
            <RecentExams />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
