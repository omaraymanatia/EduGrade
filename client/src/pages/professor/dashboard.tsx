import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, UserCheck, Calendar, Plus } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Exam } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CreateExamModal } from "@/components/exam/create-exam-modal";

export default function ProfessorDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch exams created by this professor
  const { data: exams, isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  // Get recent exams (last 5)
  const recentExams = exams?.slice(0, 5) || [];

  // Calculate stats
  const totalExams = exams?.length || 0;
  const activeExams = exams?.filter((exam) => exam.isActive).length || 0;
  const recentExamsCount = recentExams.length;

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <h3 className="text-gray-700 text-2xl font-medium">Dashboard</h3>

        {/* Stats Cards */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Exams
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-700">
                      {totalExams}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Active Exams
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-700">
                      {activeExams}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Recent Exams
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-700">
                      {recentExamsCount}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Exams with Create Button */}
        <div className="mt-8 flex justify-between items-center">
          <h4 className="text-gray-700 text-xl font-medium">Recent Exams</h4>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create New Exam
          </Button>
        </div>

        {/* Create Exam Modal */}
        <CreateExamModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />

        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-48 mb-2" />
                    <Skeleton className="h-4 w-32 mb-4" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentExams.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {recentExams.map((exam) => (
                <Card
                  key={exam.id}
                  className="border-l-4 border-primary-600 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/professor/exams/${exam.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-lg font-medium text-gray-800">
                          {exam.title}
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">
                          Created on: {formatDate(exam.createdAt)}
                        </p>
                        <div className="mt-4 flex gap-2">
                          <Badge
                            variant={exam.isActive ? "default" : "secondary"}
                          >
                            {exam.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{exam.courseCode}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Exam ID:</p>
                        <div className="flex items-center mt-1">
                          <span className="font-mono text-sm bg-gray-100 p-1 rounded">
                            {exam.examKey}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center py-10">
                <p className="text-muted-foreground">
                  You haven't created any exams yet. Click on "Create New Exam"
                  to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {totalExams > 5 && (
          <div className="mt-4 text-center">
            <Button variant="link" asChild>
              <Link href="/professor/exams">View All Exams</Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
