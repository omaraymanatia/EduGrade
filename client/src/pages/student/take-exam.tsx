import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { formatTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function StudentTakeExam() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const examId = parseInt(id || "0");

  // Track various states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<{
    [key: number]: { answer: string; selectedOptionId?: number };
  }>({});
  const [studentExamId, setStudentExamId] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showConfirmSubmitDialog, setShowConfirmSubmitDialog] =
    useState<boolean>(false);
  const [isExamComplete, setIsExamComplete] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedExamData, setCompletedExamData] = useState<any>(null);

  // Define the type for exam details
  interface ExamDetails {
    duration: number;
    title: string;
    courseCode: string;
    instructions?: string;
    passingScore: number;
    questions: {
      id: number;
      text: string;
      type: "multiple_choice" | "short_answer" | "essay";
      points: number;
      options?: { id: number; text: string }[];
    }[];
    studentExam?: {
      score: number;
    };
  }

  // Fetch exam details
  const { data: examDetails, isLoading: isLoadingExam } = useQuery<ExamDetails>(
    {
      queryKey: [`/api/exams/${examId}`],
      enabled: !isNaN(examId),
    }
  );

  // Fetch student exam details
  const { data: studentExamData } = useQuery({
    queryKey: [`/api/student-exam/${examId}`],
    enabled: !isNaN(examId),
    onSuccess: (data) => {
      // If the exam exists and is already completed, redirect to review page
      if (data?.studentExam && data.studentExam.status === "completed") {
        navigate(`/student/exam-review/${examId}`);
        return;
      }

      // If there's an existing in-progress attempt, use that
      if (data?.studentExam && data.studentExam.status === "in_progress") {
        setStudentExamId(data.studentExam.id);
      }
    },
  });

  // Timer interval for countdown
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (timeRemaining !== null && timeRemaining > 0 && !isExamComplete) {
      intervalId = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev && prev > 0) {
            return prev - 1;
          } else {
            // Auto-submit when time expires
            if (intervalId) clearInterval(intervalId);
            submitExam();
            return 0;
          }
        });
      }, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [timeRemaining, isExamComplete]);

  // Initialize the exam state when data is loaded
  useEffect(() => {
    if (examDetails && examDetails.duration) {
      // Convert minutes to seconds for the timer
      setTimeRemaining(examDetails.duration * 60);
    }
  }, [examDetails]);

  // Start the exam - create a student exam record
  const startExamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/start-exam", { examId });
      return await res.json();
    },
    onSuccess: (data) => {
      setStudentExamId(data.studentExamId);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start exam",
        description: error.message,
        variant: "destructive",
      });
      navigate("/student/exams");
    },
  });

  // Start the exam when data is loaded
  useEffect(() => {
    if (examDetails && !studentExamId && !startExamMutation.isPending) {
      startExamMutation.mutate();
    }
  }, [examDetails, studentExamId]);

  // Submit a single answer
  const submitAnswerMutation = useMutation({
    mutationFn: async (data: {
      questionId: number;
      answer: string;
      selectedOptionId?: number;
    }) => {
      if (!studentExamId) return;

      const payload = {
        studentExamId,
        questionId: data.questionId,
        answer: data.answer,
        selectedOptionId: data.selectedOptionId,
      };

      const res = await apiRequest("POST", "/api/submit-answer", payload);
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save answer",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete the exam - submit all answers
  const completeExamMutation = useMutation({
    mutationFn: async () => {
      if (!studentExamId) return;

      const res = await apiRequest("POST", "/api/complete-exam", {
        studentExamId,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setIsExamComplete(true);
      setIsSubmitting(false);
      setCompletedExamData(data); // Store the completed exam data
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });

      toast({
        title: "Exam completed",
        description: `Your score: ${data.score}%`,
      });
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast({
        title: "Failed to complete exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle answer change for the current question
  const handleAnswerChange = (value: string, questionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer: value,
      },
    }));
  };

  // Handle option selection for multiple choice
  const handleOptionSelect = (optionId: number, questionId: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        selectedOptionId: optionId,
        answer:
          examDetails?.questions
            .find((q) => q.id === questionId)
            ?.options?.find((o) => o.id === optionId)?.text || "",
      },
    }));

    // Submit the answer immediately for multiple choice
    submitAnswerMutation.mutate({
      questionId,
      answer:
        examDetails?.questions
          .find((q) => q.id === questionId)
          ?.options?.find((o) => o.id === optionId)?.text || "",
      selectedOptionId: optionId,
    });
  };

  // Auto-save the current answer when navigating between questions
  const saveCurrentAnswer = () => {
    const currentQuestion = examDetails?.questions?.[currentQuestionIndex];
    if (currentQuestion && answers[currentQuestion.id]) {
      submitAnswerMutation.mutate({
        questionId: currentQuestion.id,
        answer: answers[currentQuestion.id].answer,
        selectedOptionId: answers[currentQuestion.id].selectedOptionId,
      });
    }
  };

  // Navigate to the next question
  const goToNextQuestion = () => {
    saveCurrentAnswer();
    if (
      examDetails?.questions &&
      currentQuestionIndex < examDetails.questions.length - 1
    ) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Navigate to the previous question
  const goToPrevQuestion = () => {
    saveCurrentAnswer();
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  // Jump to a specific question
  const jumpToQuestion = (index: number) => {
    saveCurrentAnswer();
    setCurrentQuestionIndex(index);
  };

  // Submit the entire exam
  const submitExam = () => {
    setIsSubmitting(true);
    saveCurrentAnswer();
    completeExamMutation.mutate();
  };

  // Calculate progress
  const calculateProgress = () => {
    if (!examDetails?.questions) return 0;
    const answeredQuestions = Object.keys(answers).length;
    return Math.round((answeredQuestions / examDetails.questions.length) * 100);
  };

  // Display when loading
  if (isLoadingExam || !examDetails) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading exam...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Get the current question
  const currentQuestion = examDetails.questions[currentQuestionIndex];

  // Handle completed exam view
  if (isExamComplete) {
    const score = completedExamData?.score || 0;
    const passing = examDetails?.passingScore || 0;
    const isPassed = score >= passing;

    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardHeader className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Exam Completed</CardTitle>
              <CardDescription>
                Your responses have been submitted successfully.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-6">
              <div className="flex justify-center gap-8 mb-8">
                <div>
                  <p className="text-sm text-gray-500">Your Score</p>
                  <p className="text-3xl font-bold">{score}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <Badge variant={isPassed ? "default" : "destructive"}>
                    {isPassed ? "Passed" : "Failed"}
                  </Badge>
                </div>
              </div>
              {completedExamData?.AI_detected > 0 && (
                <div className="mt-4 mb-6 p-4 bg-yellow-50 rounded-md border border-yellow-200 text-left">
                  <p className="font-medium text-yellow-800">Note:</p>
                  <p className="text-sm text-yellow-700">
                    AI content was detected in {completedExamData.AI_detected}{" "}
                    of your answers. This might have affected your score.
                  </p>
                </div>
              )}
              <Button onClick={() => navigate("/student/exams")}>
                Back to My Exams
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <CardTitle>{examDetails.title}</CardTitle>
                <CardDescription>{examDetails.courseCode}</CardDescription>
              </div>
              <div className="flex items-center mt-2 md:mt-0">
                <div className="flex items-center mr-4">
                  <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Course: {examDetails.courseCode}
                  </span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {timeRemaining !== null
                      ? formatTime(timeRemaining)
                      : "Loading..."}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Progress indicator */}
            <div className="mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {Object.keys(answers).length} of{" "}
                  {examDetails.questions.length} questions answered
                </span>
              </div>
              <Progress value={calculateProgress()} />
            </div>

            {/* Question navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {examDetails.questions.map((q, index) => (
                <Button
                  key={q.id}
                  variant={
                    index === currentQuestionIndex
                      ? "default"
                      : answers[q.id]
                      ? "outline"
                      : "secondary"
                  }
                  size="sm"
                  onClick={() => jumpToQuestion(index)}
                >
                  {index + 1}
                </Button>
              ))}
            </div>

            {/* Instructions */}
            {examDetails.instructions && currentQuestionIndex === 0 && (
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 mb-6">
                <h4 className="font-medium mb-2">Instructions:</h4>
                <p>{examDetails.instructions}</p>
              </div>
            )}

            {/* Current Question */}
            <div className="border rounded-md p-6 mb-6">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-medium">
                  Question {currentQuestionIndex + 1}
                </h3>
                <div className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {currentQuestion.points}{" "}
                  {currentQuestion.points === 1 ? "point" : "points"}
                </div>
              </div>

              <p className="mb-6">{currentQuestion.text}</p>

              {/* Multiple Choice */}
              {currentQuestion.type === "multiple_choice" &&
                currentQuestion.options && (
                  <RadioGroup
                    value={
                      answers[
                        currentQuestion.id
                      ]?.selectedOptionId?.toString() || ""
                    }
                    onValueChange={(value) =>
                      handleOptionSelect(parseInt(value), currentQuestion.id)
                    }
                    className="space-y-3"
                  >
                    {currentQuestion.options.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center space-x-2 p-2 border rounded-md"
                      >
                        <RadioGroupItem
                          id={`option-${option.id}`}
                          value={option.id.toString()}
                        />
                        <Label
                          htmlFor={`option-${option.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {option.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

              {/* Short Answer */}
              {currentQuestion.type === "short_answer" && (
                <Textarea
                  placeholder="Enter your answer here..."
                  rows={3}
                  value={answers[currentQuestion.id]?.answer || ""}
                  onChange={(e) =>
                    handleAnswerChange(e.target.value, currentQuestion.id)
                  }
                />
              )}

              {/* Essay */}
              {currentQuestion.type === "essay" && (
                <Textarea
                  placeholder="Enter your essay answer here..."
                  rows={8}
                  value={answers[currentQuestion.id]?.answer || ""}
                  onChange={(e) =>
                    handleAnswerChange(e.target.value, currentQuestion.id)
                  }
                />
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={goToPrevQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            <div>
              {currentQuestionIndex === examDetails.questions.length - 1 ? (
                <Button
                  onClick={() => setShowConfirmSubmitDialog(true)}
                  disabled={isSubmitting}
                >
                  Submit Exam
                </Button>
              ) : (
                <Button onClick={goToNextQuestion}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Confirm Submit Dialog */}
      <Dialog
        open={showConfirmSubmitDialog}
        onOpenChange={setShowConfirmSubmitDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your exam? You won't be able to
              change your answers after submission.
            </DialogDescription>
          </DialogHeader>

          {Object.keys(answers).length < examDetails.questions.length && (
            <div className="flex items-start p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertTriangle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Warning</p>
                <p className="text-sm text-amber-700">
                  You have only answered {Object.keys(answers).length} out of{" "}
                  {examDetails.questions.length} questions.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmSubmitDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={submitExam} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Exam"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
