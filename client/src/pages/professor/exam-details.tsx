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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<
    "multiple_choice" | "essay" | null
  >(null);

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

  // Delete exam mutation
  const deleteExam = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/exams/${examId}`);
      toast({
        title: "Exam deleted",
        description: "The exam has been deleted successfully.",
      });
      navigate("/professor/exams");
    } catch (error: any) {
      toast({
        title: "Failed to delete exam",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
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

  // Add function to handle edit mode
  const handleEditExam = () => {
    setEditMode(true);
  };

  // Function to add a new question
  const addNewQuestion = (type: "multiple_choice" | "essay") => {
    if (!examDetails) return;

    const newQuestion = {
      id: `temp_${Date.now()}`, // Temporary ID until saved to DB
      text:
        type === "multiple_choice"
          ? "New multiple choice question"
          : "New essay question",
      type: type,
      points: 10,
      order: examDetails.questions ? examDetails.questions.length + 1 : 1,
      modelAnswer: type === "essay" ? "Enter model answer here" : undefined,
      options:
        type === "multiple_choice"
          ? [
              {
                id: `temp_opt1_${Date.now()}`,
                text: "Option 1",
                isCorrect: true,
                order: 1,
              },
              {
                id: `temp_opt2_${Date.now()}`,
                text: "Option 2",
                isCorrect: false,
                order: 2,
              },
              {
                id: `temp_opt3_${Date.now()}`,
                text: "Option 3",
                isCorrect: false,
                order: 3,
              },
            ]
          : undefined,
    };

    // Update local state with the new question
    queryClient.setQueryData([`/api/exams/${examId}`], {
      ...examDetails,
      questions: [...(examDetails.questions || []), newQuestion],
    });

    setNewQuestionType(null); // Close the dropdown after adding
  };

  // Add option to MCQ question
  const addOptionToQuestion = (questionId: number | string) => {
    if (!examDetails) return;

    const updatedQuestions = examDetails.questions?.map((q) => {
      if (q.id === questionId && q.type === "multiple_choice") {
        const newOption = {
          id: `temp_opt_${Date.now()}`,
          text: "New option",
          isCorrect: false,
          order: q.options ? q.options.length + 1 : 1,
        };

        return {
          ...q,
          options: [...(q.options || []), newOption],
        };
      }
      return q;
    });

    queryClient.setQueryData([`/api/exams/${examId}`], {
      ...examDetails,
      questions: updatedQuestions,
    });
  };

  // Function to delete a question
  const deleteQuestion = (questionId: number | string) => {
    if (!examDetails) return;

    const updatedQuestions = examDetails.questions?.filter(
      (q) => q.id !== questionId
    );

    // Update local state
    queryClient.setQueryData([`/api/exams/${examId}`], {
      ...examDetails,
      questions: updatedQuestions,
    });
  };

  // Function to delete an option from a question
  const deleteOption = (
    questionId: number | string,
    optionId: number | string
  ) => {
    if (!examDetails) return;

    const updatedQuestions = examDetails.questions?.map((q) => {
      if (q.id === questionId && q.options) {
        // Make sure we have at least 2 options after deletion
        if (q.options.length <= 2) {
          toast({
            title: "Cannot delete option",
            description:
              "Multiple choice questions must have at least 2 options",
            variant: "destructive",
          });
          return q;
        }

        // Check if we're trying to delete the only correct option
        const isCorrectOption = q.options.find(
          (opt: any) => opt.id === optionId
        )?.isCorrect;
        const otherCorrectOptionExists = q.options.some(
          (opt: any) => opt.isCorrect && opt.id !== optionId
        );

        if (isCorrectOption && !otherCorrectOptionExists) {
          toast({
            title: "Cannot delete option",
            description: "You must keep at least one correct option",
            variant: "destructive",
          });
          return q;
        }

        return {
          ...q,
          options: q.options.filter((opt: any) => opt.id !== optionId),
        };
      }
      return q;
    });

    // Update local state
    queryClient.setQueryData([`/api/exams/${examId}`], {
      ...examDetails,
      questions: updatedQuestions,
    });
  };

  // Function to handle the save changes with improved validation and error handling
  const handleSaveChanges = async () => {
    if (!examDetails) return;

    try {
      // Validate questions before saving
      examDetails.questions?.forEach((question) => {
        if (!question.text || question.text.trim() === "") {
          throw new Error("Question text cannot be empty");
        }

        if (question.type === "multiple_choice") {
          if (!question.options || question.options.length < 2) {
            throw new Error(
              "Multiple choice questions must have at least 2 options"
            );
          }

          const hasCorrectOption = question.options.some(
            (opt: any) => opt.isCorrect
          );
          if (!hasCorrectOption) {
            throw new Error(
              "Multiple choice questions must have at least one correct option"
            );
          }

          question.options.forEach((option: any) => {
            if (!option.text || option.text.trim() === "") {
              throw new Error("Option text cannot be empty");
            }
          });
        }
      });

      // Show loading state
      toast({
        title: "Saving changes...",
        description: "Please wait while your changes are being saved",
      });

      console.log("Sending data to server:", {
        questions: examDetails.questions,
        instructions: examDetails.instructions,
      });

      // Send the updated exam to the server
      const response = await apiRequest("PUT", `/api/exams/${examId}`, {
        questions: examDetails.questions,
        instructions: examDetails.instructions,
      });

      const responseData = await response.json();
      console.log("Server response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to save changes");
      }

      // Update local data with server response
      queryClient.setQueryData([`/api/exams/${examId}`], responseData);

      setEditMode(false);
      toast({
        title: "Exam updated successfully",
        description: "All changes have been saved",
      });
    } catch (error: any) {
      console.error("Error saving changes:", error);
      toast({
        title: "Failed to save changes",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  // Function to update question text
  const updateQuestionText = (questionId: number, newText: string) => {
    const updatedQuestions = examDetails?.questions?.map((q) =>
      q.id === questionId ? { ...q, text: newText } : q
    );

    // Update the state
    if (updatedQuestions && examDetails) {
      queryClient.setQueryData([`/api/exams/${examId}`], {
        ...examDetails,
        questions: updatedQuestions,
      });
    }
  };

  // Function to update option text
  const updateOptionText = (
    questionId: number,
    optionId: number,
    newText: string
  ) => {
    const updatedQuestions = examDetails?.questions?.map((q) => {
      if (q.id === questionId && q.options) {
        const updatedOptions = q.options.map((opt: any) =>
          opt.id === optionId ? { ...opt, text: newText } : opt
        );
        return { ...q, options: updatedOptions };
      }
      return q;
    });

    // Update the state
    if (updatedQuestions && examDetails) {
      queryClient.setQueryData([`/api/exams/${examId}`], {
        ...examDetails,
        questions: updatedQuestions,
      });
    }
  };

  // Function to update correct answer
  const updateCorrectAnswer = (
    questionId: number | string,
    optionId: number | string
  ) => {
    const updatedQuestions = examDetails?.questions?.map((q) => {
      if (q.id === questionId && q.options) {
        const updatedOptions = q.options.map((opt: any) => ({
          ...opt,
          isCorrect: opt.id === optionId,
        }));
        return { ...q, options: updatedOptions };
      }
      return q;
    });

    // Update the state
    if (updatedQuestions && examDetails) {
      queryClient.setQueryData([`/api/exams/${examId}`], {
        ...examDetails,
        questions: updatedQuestions,
      });
    }
  };

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
                    onClick={() => setShowDeleteDialog(true)}
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
              <DialogTitle>
                {editMode ? "Edit Exam" : "Exam Preview"}: {examDetails?.title}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Edit the exam questions and options below"
                  : "This is how students will see the exam"}
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
                  {editMode ? (
                    <textarea
                      className="w-full border rounded-md p-2"
                      value={examDetails.instructions}
                      onChange={(e) => {
                        if (examDetails) {
                          queryClient.setQueryData([`/api/exams/${examId}`], {
                            ...examDetails,
                            instructions: e.target.value,
                          });
                        }
                      }}
                      rows={3}
                    />
                  ) : (
                    <p>{examDetails.instructions}</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Existing questions section */}
              {examDetails?.questions?.map((question: any, index: number) => (
                <div key={question.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Question {index + 1}</h3>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{question.points} points</Badge>
                      {editMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 h-6 w-6 p-0"
                          onClick={() => deleteQuestion(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {editMode ? (
                    <textarea
                      className="w-full border rounded-md p-2 my-3"
                      value={question.text}
                      onChange={(e) =>
                        updateQuestionText(question.id, e.target.value)
                      }
                      rows={3}
                    />
                  ) : (
                    <p className="my-3">{question.text}</p>
                  )}

                  {question.type === "multiple_choice" && (
                    <div className="space-y-2 mt-4">
                      {question.options?.map((option: any) => (
                        <div
                          key={option.id}
                          className={`flex items-center p-2 border rounded-md ${
                            option.isCorrect && editMode
                              ? "bg-green-50 border-green-200"
                              : ""
                          }`}
                        >
                          {editMode ? (
                            <>
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                checked={option.isCorrect}
                                onChange={() =>
                                  updateCorrectAnswer(question.id, option.id)
                                }
                                className="mr-2"
                              />
                              <textarea
                                className="flex-1 border-none focus:outline-none bg-transparent"
                                value={option.text}
                                onChange={(e) =>
                                  updateOptionText(
                                    question.id,
                                    option.id,
                                    e.target.value
                                  )
                                }
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 h-6 w-6 p-0"
                                onClick={() =>
                                  deleteOption(question.id, option.id)
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <input
                                type="radio"
                                name={`question-${question.id}`}
                                disabled
                                defaultChecked={option.isCorrect}
                                className="mr-2"
                              />
                              <span>{option.text}</span>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add option button for MCQ in edit mode */}
                      {editMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOptionToQuestion(question.id)}
                          className="mt-2"
                        >
                          + Add Option
                        </Button>
                      )}
                    </div>
                  )}

                  {question.type === "short_answer" && (
                    <div className="mt-4">
                      {editMode && (
                        <div className="mb-2">
                          <h4 className="font-medium text-sm">
                            Model Answer (optional):
                          </h4>
                          <textarea
                            className="w-full border rounded-md p-2"
                            value={question.modelAnswer || ""}
                            onChange={(e) => {
                              const updatedQuestions =
                                examDetails?.questions?.map((q) =>
                                  q.id === question.id
                                    ? { ...q, modelAnswer: e.target.value }
                                    : q
                                );
                              if (updatedQuestions && examDetails) {
                                queryClient.setQueryData(
                                  [`/api/exams/${examId}`],
                                  {
                                    ...examDetails,
                                    questions: updatedQuestions,
                                  }
                                );
                              }
                            }}
                            rows={2}
                          />
                        </div>
                      )}
                      {!editMode && (
                        <div className="border border-dashed rounded-md p-3 text-muted-foreground text-sm">
                          Student answer field will appear here
                        </div>
                      )}
                    </div>
                  )}

                  {question.type === "essay" && (
                    <div className="mt-4">
                      {editMode ? (
                        <div className="mb-2">
                          <h4 className="font-medium text-sm">Model Answer:</h4>
                          <textarea
                            className="w-full border rounded-md p-2"
                            value={question.modelAnswer || ""}
                            onChange={(e) => {
                              const updatedQuestions =
                                examDetails?.questions?.map((q) =>
                                  q.id === question.id
                                    ? { ...q, modelAnswer: e.target.value }
                                    : q
                                );
                              if (updatedQuestions && examDetails) {
                                queryClient.setQueryData(
                                  [`/api/exams/${examId}`],
                                  {
                                    ...examDetails,
                                    questions: updatedQuestions,
                                  }
                                );
                              }
                            }}
                            rows={4}
                          />
                        </div>
                      ) : (
                        <div className="mt-2">
                          <h4 className="font-medium text-sm mb-2">
                            Model Answer:
                          </h4>
                          <div className="border rounded-md p-3 bg-gray-50 text-gray-700">
                            {question.modelAnswer ||
                              question.model_answer ||
                              "No model answer provided"}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Add new question section in edit mode */}
              {editMode && (
                <div className="border border-dashed rounded-md p-6 text-center mt-6">
                  <h3 className="font-medium mb-4">Add New Question</h3>

                  {newQuestionType === null ? (
                    <div className="space-x-4">
                      <Button
                        onClick={() => setNewQuestionType("multiple_choice")}
                        variant="outline"
                      >
                        + Multiple Choice
                      </Button>
                      <Button
                        onClick={() => setNewQuestionType("essay")}
                        variant="outline"
                      >
                        + Essay Question
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-4 justify-center">
                      <Button
                        onClick={() => addNewQuestion(newQuestionType)}
                        variant="default"
                      >
                        Confirm{" "}
                        {newQuestionType === "multiple_choice"
                          ? "Multiple Choice"
                          : "Essay"}{" "}
                        Question
                      </Button>
                      <Button
                        onClick={() => setNewQuestionType(null)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              {editMode ? (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveChanges}>Save Changes</Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleEditExam}
                    className="mr-2"
                  >
                    Edit Exam
                  </Button>
                  <Button onClick={() => setShowPreviewDialog(false)}>
                    Close Preview
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Exam</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this exam? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteExam}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
