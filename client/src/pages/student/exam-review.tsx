import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
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
import { ArrowLeft, ArrowRight, CheckCircle, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export default function StudentExamReview() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch the studentExam with answers and the exam with questions
  const { data: examData, isLoading } = useQuery({
    queryKey: [`/api/student-exams/${id}`],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center items-center h-64">
            <p>Loading exam data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!examData) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Exam data not found</p>
              <Button className="mt-4" onClick={() => navigate("/student")}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { studentExam, exam, answers } = examData;
  const questions = exam.questions || [];
  const currentQuestion = questions[currentQuestionIndex] || {};
  const studentAnswer = answers.find(
    (a) => a.questionId === currentQuestion.id
  );

  // Navigation handlers
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
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
            onClick={() => navigate("/student/exams")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-gray-700 text-2xl font-medium">
            {exam.title || `Exam #${exam.id}`}
          </h3>
        </div>

        {/* Exam Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Course</h4>
                <p className="mt-1 font-medium">{exam.courseCode || "-"}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Date Taken
                </h4>
                <p className="mt-1 font-medium">
                  {formatDate(studentExam.startedAt)}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Score</h4>
                <div className="mt-1 flex items-center">
                  <span className="font-medium mr-2">{studentExam.score}%</span>
                  <Badge
                    variant={
                      studentExam.score >= (exam.passingScore || 70)
                        ? "default"
                        : "destructive"
                    }
                  >
                    {studentExam.score >= (exam.passingScore || 70)
                      ? "Passed"
                      : "Failed"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="mb-4 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={goToPrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
          <Button
            variant="outline"
            onClick={goToNextQuestion}
            disabled={currentQuestionIndex === questions.length - 1}
          >
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
              <Badge variant="outline">{currentQuestion.points} points</Badge>
            </div>
            <CardDescription>
              {currentQuestion.type === "multiple_choice"
                ? "Multiple Choice"
                : "Essay Question"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6">{currentQuestion.text}</p>

            {/* Multiple Choice Question */}
            {currentQuestion.type === "multiple_choice" &&
              currentQuestion.options && (
                <div className="space-y-3">
                  {currentQuestion.options.map((option: any) => {
                    const isStudentSelectedOption =
                      option.id === studentAnswer?.selectedOptionId;
                    const isActualCorrectOption = option.isCorrect;

                    let optionClassName =
                      "flex items-center space-x-3 p-3 border rounded-md transition-colors";
                    let icon = null;

                    if (isStudentSelectedOption) {
                      if (isActualCorrectOption) {
                        optionClassName +=
                          " bg-green-100 border-green-300 text-green-800";
                        icon = (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        );
                      } else {
                        optionClassName +=
                          " bg-red-100 border-red-300 text-red-800";
                        icon = <XCircle className="h-5 w-5 text-red-600" />;
                      }
                    } else if (isActualCorrectOption) {
                      // Style for the correct option if not selected by the student
                      optionClassName +=
                        " bg-green-50 border-green-200 text-green-700";
                      // Optionally, add an icon to indicate this was the correct answer
                      icon = (
                        <CheckCircle className="h-5 w-5 text-green-500 opacity-70" />
                      );
                    } else {
                      optionClassName += " bg-gray-50 border-gray-200";
                    }

                    return (
                      <div key={option.id} className={optionClassName}>
                        <RadioGroupItem // Visually represents a radio button
                          id={`option-${option.id}`}
                          value={option.id.toString()}
                          checked={isStudentSelectedOption} // Show if this was the student's selection
                          disabled // Non-interactive in review mode
                          className="border-gray-400 data-[state=checked]:border-primary"
                        />
                        <Label
                          htmlFor={`option-${option.id}`}
                          className="flex-1 cursor-default"
                        >
                          {option.text}
                        </Label>
                        {icon} {/* Display the icon determined above */}
                      </div>
                    );
                  })}
                </div>
              )}

            {/* Essay Question */}
            {currentQuestion.type === "essay" && (
              <div className="space-y-3">
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Your Answer:
                  </h4>
                  <div className="p-3 bg-gray-50 border rounded-md">
                    {studentAnswer?.answer || "No answer provided"}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">
                    Model Answer:
                  </h4>
                  <div className="p-3 bg-green-50 border border-green-100 rounded-md">
                    {currentQuestion.model_answer || "No model answer provided"}
                  </div>
                </div>

                {studentAnswer?.isCorrect !== null && (
                  <div className="mt-4">
                    <Badge
                      variant={
                        studentAnswer?.isCorrect ? "default" : "destructive"
                      }
                      className="text-sm"
                    >
                      {studentAnswer?.isCorrect ? "Correct" : "Incorrect"}
                    </Badge>
                    {studentAnswer?.points !== null && (
                      <span className="ml-2 text-sm">
                        Points: {studentAnswer.points}/{currentQuestion.points}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={goToPrevQuestion}
              disabled={currentQuestionIndex === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              onClick={goToNextQuestion}
              disabled={currentQuestionIndex === questions.length - 1}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
