import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Download,
  Eye,
  Trash2,
  Copy,
  Clock,
  Calendar,
  CheckCircle,
  Upload,
  Image,
  X,
  Loader2,
} from "lucide-react";
import { formatDate, calculateTimeTaken } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { StudentAnswerUpload } from "@/components/exam/student-answer-upload";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ProfessorExamDetails() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  if (!id) {
    navigate("/professor/exams");
    return null;
  }
  const examId = parseInt(id);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);

  // Fetch exam details
  interface ExamDetails {
    isActive: boolean;
    examKey: string;
    title: string;
    courseCode: string;
    createdAt: string;
    duration: number;
    passingScore: number;
    studentResults?: Array<any>;
    questions?: Array<any>;
    instructions?: string;
  }

  const { data: examDetails, isLoading } = useQuery<ExamDetails>({
    queryKey: [`/api/exams/${examId}`],
    enabled: !isNaN(examId),
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await apiRequest("PATCH", `/api/exams/${examId}`, {
        isActive,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
      toast({
        title: examDetails?.isActive ? "Exam deactivated" : "Exam activated",
        description: examDetails?.isActive
          ? "Students will no longer be able to access this exam"
          : "Students can now access this exam with the key",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update exam status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle toggle active status
  const handleToggleActive = (isActive: boolean) => {
    toggleActiveMutation.mutate(isActive);
  };

  // Function to copy exam key to clipboard
  const copyExamKey = () => {
    if (examDetails?.examKey) {
      navigator.clipboard.writeText(examDetails.examKey);
      toast({
        title: "Exam key copied to clipboard",
        description: examDetails.examKey,
      });
    }
  };

  // Redirect if invalid exam ID
  if (!isNaN(examId) && !isLoading && !examDetails) {
    navigate("/professor/exams");
    return null;
  }

  // Columns for student results table
  const studentColumns = [
    {
      header: "Student",
      accessorKey: "student",
      cell: (data: any) => (
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 mr-3">
            {data.student?.firstName?.[0]}
            {data.student?.lastName?.[0]}
          </div>
          <div>
            <div className="font-medium">{`${data.student?.firstName} ${data.student?.lastName}`}</div>
            <div className="text-sm text-muted-foreground">
              {data.student?.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Date Completed",
      accessorKey: "completedAt",
      cell: (data: any) => (
        <div>
          {data.completedAt ? (
            <>
              <div>{formatDate(data.completedAt)}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(data.completedAt).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <Badge variant="outline">In progress</Badge>
          )}
        </div>
      ),
    },
    {
      header: "Time Taken",
      accessorKey: "timeTaken",
      cell: (data: any) =>
        data.completedAt && data.startedAt
          ? calculateTimeTaken(
              new Date(data.startedAt),
              new Date(data.completedAt)
            )
          : "-",
    },
    {
      header: "Score",
      accessorKey: "score",
      cell: (data: any) => (data.score !== null ? `${data.score}%` : "-"),
    },
    {
      header: "Status",
      accessorKey: "status",
      cell: (data: any) =>
        data.status === "completed" ? (
          <Badge
            variant={
              data.score >= (examDetails?.passingScore || 0)
                ? "default"
                : "destructive"
            }
          >
            {data.score >= (examDetails?.passingScore || 0)
              ? "Passed"
              : "Failed"}
          </Badge>
        ) : (
          <Badge variant="outline">In progress</Badge>
        ),
    },
    {
      header: "Actions",
      accessorKey: "id",
      cell: (data: any) => <Button variant="link">View Details</Button>,
    },
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => navigate("/professor/exams")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {isLoading ? (
            <Skeleton className="h-8 w-80" />
          ) : (
            <h3 className="text-gray-700 text-2xl font-medium">
              {examDetails?.title}
            </h3>
          )}
        </div>

        {/* Exam Overview */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Course
                    </h4>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {examDetails?.courseCode}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Created
                    </h4>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {formatDate(
                        examDetails?.createdAt
                          ? new Date(examDetails.createdAt)
                          : undefined
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Exam ID
                    </h4>
                    <div className="mt-1 flex items-center">
                      <code className="text-lg font-medium text-gray-900 font-mono bg-gray-100 p-1 rounded">
                        {examDetails?.examKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyExamKey}
                        className="ml-2"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Duration
                    </h4>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {examDetails?.duration} minutes
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Passing Score
                    </h4>
                    <p className="mt-1 text-lg font-medium text-gray-900">
                      {examDetails?.passingScore}%
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">
                      Status
                    </h4>
                    <div className="mt-1 flex items-center space-x-2">
                      <Badge
                        variant={
                          examDetails?.isActive ? "default" : "secondary"
                        }
                      >
                        {examDetails?.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Switch
                        checked={examDetails?.isActive || false}
                        onCheckedChange={handleToggleActive}
                        aria-label="Toggle exam active status"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <Button onClick={() => setShowPreviewDialog(true)}>
                    <Eye className="mr-2 h-4 w-4" /> Preview Exam
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export Results
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Exam
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tabs for Student Results, Questions, and File Upload */}
        <Tabs defaultValue="results">
          <TabsList>
            <TabsTrigger value="results">Student Results</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="uploads">Upload Answers</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : examDetails?.studentResults?.length ? (
              <DataTable
                columns={studentColumns}
                data={examDetails.studentResults || []}
              />
            ) : (
              <Card>
                <CardContent className="p-6 text-center py-20">
                  <p className="text-muted-foreground">
                    No students have taken this exam yet.
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Share the exam key{" "}
                    <code className="bg-gray-100 p-1 rounded">
                      {examDetails?.examKey}
                    </code>{" "}
                    with your students.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="questions" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : examDetails?.questions?.length ? (
              <div className="space-y-6">
                {examDetails.questions.map((question: any, index: number) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex justify-between">
                        <CardTitle>Question {index + 1}</CardTitle>
                        <Badge variant="outline">
                          {question.points} points
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-4">{question.text}</p>

                      <div className="flex items-center mb-2">
                        <Badge variant="outline" className="mr-2">
                          {question.type === "multiple_choice"
                            ? "Multiple Choice"
                            : question.type === "short_answer"
                            ? "Short Answer"
                            : "Essay"}
                        </Badge>
                      </div>

                      {question.type === "multiple_choice" &&
                        question.options && (
                          <div className="space-y-2 mt-4">
                            {question.options.map((option: any) => (
                              <div
                                key={option.id}
                                className={`flex items-center p-2 rounded ${
                                  option.isCorrect
                                    ? "bg-green-50 border border-green-200"
                                    : ""
                                }`}
                              >
                                {option.isCorrect && (
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                                )}
                                <span>{option.text}</span>
                                {option.isCorrect && (
                                  <Badge
                                    variant="outline"
                                    className="ml-2 bg-green-50 text-green-700"
                                  >
                                    Correct Answer
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center py-20">
                  <p className="text-muted-foreground">
                    No questions found for this exam.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="uploads" className="mt-4">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <div className="space-y-6">
                <StudentAnswerUpload
                  examId={examId}
                  studentExamId={0} // This will be selected by the professor or set on the server
                  onSuccess={() => {
                    toast({
                      title: "Upload successful",
                      description: "Student answer images have been uploaded",
                    });
                  }}
                />

                {/* Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle>
                      Instructions for Uploading Student Answers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="bg-primary-50 h-8 w-8 rounded-full flex items-center justify-center text-primary-600 mr-3">
                          1
                        </div>
                        <div>
                          <h4 className="font-medium">
                            Take Photos of Student Work
                          </h4>
                          <p className="text-muted-foreground">
                            Take clear photos of student handwritten answers.
                            Ensure good lighting and focus.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-primary-50 h-8 w-8 rounded-full flex items-center justify-center text-primary-600 mr-3">
                          2
                        </div>
                        <div>
                          <h4 className="font-medium">
                            Upload Using the Form Above
                          </h4>
                          <p className="text-muted-foreground">
                            Click "Add Images" to select multiple images at
                            once, or drag and drop files into the upload area.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="bg-primary-50 h-8 w-8 rounded-full flex items-center justify-center text-primary-600 mr-3">
                          3
                        </div>
                        <div>
                          <h4 className="font-medium">Grade the Answers</h4>
                          <p className="text-muted-foreground">
                            After uploading, you can assign scores to the
                            student's answers in the platform.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Exam Preview: {examDetails?.title}</DialogTitle>
              <DialogDescription>
                This is how students will see the exam
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              <div className="flex flex-col md:flex-row justify-between p-4 bg-muted rounded-md">
                <div className="flex items-center mb-2 md:mb-0">
                  <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>Course: {examDetails?.courseCode}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <span>Duration: {examDetails?.duration} minutes</span>
                </div>
              </div>

              {examDetails?.instructions && (
                <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                  <h4 className="font-medium mb-2">Instructions:</h4>
                  <p>{examDetails.instructions}</p>
                </div>
              )}

              <Separator />

              {examDetails?.questions?.map((question: any, index: number) => (
                <div key={question.id} className="border rounded-md p-4">
                  <div className="flex justify-between">
                    <h3 className="font-medium">Question {index + 1}</h3>
                    <Badge variant="outline">{question.points} points</Badge>
                  </div>
                  <p className="my-3">{question.text}</p>

                  {question.type === "multiple_choice" && question.options && (
                    <div className="space-y-2 mt-4">
                      {question.options.map((option: any) => (
                        <div
                          key={option.id}
                          className="flex items-center p-2 border rounded-md"
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            disabled
                            className="mr-2"
                          />
                          <span>{option.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {question.type === "short_answer" && (
                    <div className="mt-4">
                      <textarea
                        className="w-full border rounded-md p-2"
                        disabled
                        placeholder="Student's answer will appear here"
                        rows={2}
                      ></textarea>
                    </div>
                  )}

                  {question.type === "essay" && (
                    <div className="mt-4">
                      <textarea
                        className="w-full border rounded-md p-2"
                        disabled
                        placeholder="Student's essay answer will appear here"
                        rows={4}
                      ></textarea>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button onClick={() => setShowPreviewDialog(false)}>
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
