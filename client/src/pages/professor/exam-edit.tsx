import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast"; // Correct import path
import { Loader2, Save, Trash2, Plus, ArrowLeft } from "lucide-react";
import { Exam, Question, Option, QuestionType } from "@shared/schema";

// Define API_URL constant - use import.meta.env for Vite or just use relative path
const API_URL = "/api";

// Define extended Exam type that includes questions
interface ExamWithQuestions extends Exam {
  questions?: any[];
  description?: string;
}

export default function ExamEditPage() {
  const params = useParams();
  const [, navigate] = useLocation();
  const examId = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast(); // Use the useToast hook correctly
  const [examData, setExamData] = useState<Partial<ExamWithQuestions>>({});
  const [questions, setQuestions] = useState<any[]>([]);

  // Fetch exam data - Fixed the useQuery hook
  const { data: exam, isLoading } = useQuery<ExamWithQuestions>({
    queryKey: [`/api/exams/${examId}`],
    enabled: !isNaN(examId),
  });

  // Set initial data when exam data is loaded
  useEffect(() => {
    if (exam) {
      setExamData({
        title: exam.title,
        courseCode: exam.courseCode,
        description: exam.description || "", // Now valid with the extended type
        instructions: exam.instructions || "",
        duration: exam.duration,
        passingScore: exam.passingScore,
        isActive: exam.isActive,
        examKey: exam.examKey,
      });

      // Format questions for form state
      const formattedQuestions =
        exam.questions?.map((q: any) => ({
          id: q.id,
          text: q.text,
          type: q.type,
          points: q.points,
          model_answer: q.model_answer || "",
          order: q.order,
          options: q.options || [],
        })) || [];

      setQuestions(formattedQuestions);
    }
  }, [exam]);

  // Update exam mutation
  const updateExamMutation = useMutation({
    mutationFn: async (data: Partial<ExamWithQuestions>) => {
      const response = await fetch(`${API_URL}/exams/${examId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update exam");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Exam updated",
        description: "Your exam has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      const response = await fetch(`${API_URL}/questions/${questionData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionData),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update question");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update question",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save changes
  const handleSaveExam = async () => {
    try {
      // Update exam basic info
      await updateExamMutation.mutateAsync(examData);

      // Update each question
      for (const question of questions) {
        await updateQuestionMutation.mutateAsync(question);
      }
    } catch (error) {
      console.error("Error saving exam:", error);
    }
  };

  // Handle exam field changes
  const handleExamChange = (field: string, value: any) => {
    setExamData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle question changes
  const handleQuestionChange = (index: number, field: string, value: any) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Handle option changes
  const handleOptionChange = (
    questionIndex: number,
    optionIndex: number,
    field: string,
    value: any
  ) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const options = [...(updated[questionIndex].options || [])];
      options[optionIndex] = { ...options[optionIndex], [field]: value };
      updated[questionIndex].options = options;

      // If setting isCorrect to true, set all others to false
      if (field === "isCorrect" && value === true) {
        options.forEach((_, idx) => {
          if (idx !== optionIndex) {
            options[idx].isCorrect = false;
          }
        });
      }

      return updated;
    });
  };

  // Add a new option to an MCQ question
  const addOption = (questionIndex: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const options = [...(updated[questionIndex].options || [])];
      options.push({
        text: "",
        isCorrect: false,
        order: options.length + 1,
      });
      updated[questionIndex].options = options;
      return updated;
    });
  };

  // Remove an option
  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions((prev) => {
      const updated = [...prev];
      const options = [...(updated[questionIndex].options || [])];
      options.splice(optionIndex, 1);

      // Update order for remaining options
      options.forEach((opt, idx) => {
        opt.order = idx + 1;
      });

      updated[questionIndex].options = options;
      return updated;
    });
  };

  // Add new question
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        text: "New Question",
        type: "essay",
        points: 10,
        model_answer: "",
        order: prev.length + 1,
        options: [],
      },
    ]);
  };

  // Remove question
  const removeQuestion = async (index: number) => {
    const question = questions[index];

    if (question.id) {
      // If it's an existing question, delete from server
      try {
        const response = await fetch(`${API_URL}/questions/${question.id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to delete question");
        }

        queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
      } catch (error) {
        console.error("Error deleting question:", error);
        toast({
          title: "Failed to delete question",
          description: "There was an error deleting the question.",
          variant: "destructive",
        });
        return;
      }
    }

    // Remove from state
    setQuestions((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);

      // Update order for remaining questions
      updated.forEach((q, idx) => {
        q.order = idx + 1;
      });

      return updated;
    });
  };

  // Watch for question type changes to manage options
  const handleQuestionTypeChange = (index: number, type: string) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index].type = type;

      // Initialize options if switching to multiple choice
      if (
        type === QuestionType.enum.multiple_choice &&
        (!updated[index].options || updated[index].options.length === 0)
      ) {
        updated[index].options = [
          { text: "Option 1", isCorrect: true, order: 1 },
          { text: "Option 2", isCorrect: false, order: 2 },
        ];
      }

      return updated;
    });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8 flex justify-center items-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/professor/exams")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h3 className="text-gray-700 text-2xl font-medium">Edit Exam</h3>
          </div>
          <Button
            onClick={handleSaveExam}
            disabled={
              updateExamMutation.isPending || updateQuestionMutation.isPending
            }
          >
            {(updateExamMutation.isPending ||
              updateQuestionMutation.isPending) && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Save className="h-4 w-4 mr-2" /> Save Changes
          </Button>
        </div>

        {/* Exam Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={examData.title || ""}
                  onChange={(e) => handleExamChange("title", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="courseCode">Course Code</Label>
                <Input
                  id="courseCode"
                  value={examData.courseCode || ""}
                  onChange={(e) =>
                    handleExamChange("courseCode", e.target.value)
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={examData.duration || 60}
                  onChange={(e) =>
                    handleExamChange("duration", parseInt(e.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  value={examData.passingScore || 60}
                  onChange={(e) =>
                    handleExamChange("passingScore", parseInt(e.target.value))
                  }
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="isActive"
                  checked={examData.isActive}
                  onCheckedChange={(checked) =>
                    handleExamChange("isActive", checked)
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={examData.description || ""}
                onChange={(e) =>
                  handleExamChange("description", e.target.value)
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={examData.instructions || ""}
                onChange={(e) =>
                  handleExamChange("instructions", e.target.value)
                }
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Exam Key:</div>
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {examData.examKey || exam?.examKey || ""}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* Questions Section */}
        <div className="mt-8 flex items-center justify-between mb-6">
          <h4 className="text-gray-700 text-xl font-medium">Questions</h4>
          <Button onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-2" /> Add Question
          </Button>
        </div>

        {/* Question Cards */}
        <div className="space-y-6">
          {questions.map((question, qIndex) => (
            <Card key={question.id || `new-${qIndex}`} className="relative">
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => removeQuestion(qIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <CardHeader>
                <CardTitle className="flex items-center">
                  Question {qIndex + 1}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`question-${qIndex}`}>Question Text</Label>
                  <Textarea
                    id={`question-${qIndex}`}
                    value={question.text || ""}
                    onChange={(e) =>
                      handleQuestionChange(qIndex, "text", e.target.value)
                    }
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`question-type-${qIndex}`}>Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) =>
                        handleQuestionTypeChange(qIndex, value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={QuestionType.enum.essay}>
                          Essay
                        </SelectItem>
                        <SelectItem value={QuestionType.enum.multiple_choice}>
                          Multiple Choice
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`question-points-${qIndex}`}>Points</Label>
                    <Input
                      id={`question-points-${qIndex}`}
                      type="number"
                      value={question.points || 10}
                      onChange={(e) =>
                        handleQuestionChange(
                          qIndex,
                          "points",
                          parseInt(e.target.value)
                        )
                      }
                    />
                  </div>
                </div>

                {question.type === QuestionType.enum.essay && (
                  <div className="space-y-2">
                    <Label htmlFor={`model-answer-${qIndex}`}>
                      Model Answer
                    </Label>
                    <Textarea
                      id={`model-answer-${qIndex}`}
                      value={question.model_answer || ""}
                      onChange={(e) =>
                        handleQuestionChange(
                          qIndex,
                          "model_answer",
                          e.target.value
                        )
                      }
                      rows={3}
                      placeholder="Enter the model answer for this question..."
                    />
                  </div>
                )}

                {question.type === QuestionType.enum.multiple_choice && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Answer Options</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addOption(qIndex)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Option
                      </Button>
                    </div>

                    {question.options?.map((option: any, oIndex: number) => (
                      <div
                        key={option.id || `new-${oIndex}`}
                        className="flex items-start space-x-2 border rounded-md p-3"
                      >
                        <div className="pt-3">
                          <Checkbox
                            checked={option.isCorrect}
                            onCheckedChange={(checked) =>
                              handleOptionChange(
                                qIndex,
                                oIndex,
                                "isCorrect",
                                checked
                              )
                            }
                          />
                        </div>

                        <div className="flex-1">
                          <Input
                            value={option.text}
                            onChange={(e) =>
                              handleOptionChange(
                                qIndex,
                                oIndex,
                                "text",
                                e.target.value
                              )
                            }
                            placeholder={`Option ${oIndex + 1}`}
                          />
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(qIndex, oIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    {(!question.options || question.options.length === 0) && (
                      <div className="text-center py-4 border rounded-md bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                          No options added. Click "Add Option" to create answer
                          choices.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {questions.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center py-10">
                <p className="text-muted-foreground">
                  No questions added. Click "Add Question" to create your first
                  question.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveExam}
            disabled={updateExamMutation.isPending}
            className="px-6"
          >
            {updateExamMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            <Save className="h-4 w-4 mr-2" /> Save Exam
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
