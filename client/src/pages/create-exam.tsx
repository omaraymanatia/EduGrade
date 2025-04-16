import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { FilePlus, FileText, Trash2, Eye, Save, ArrowLeft } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

// Define question types
interface BaseQuestion {
  id: string;
  question: string;
  points: number;
  type: 'mcq' | 'article';
}

interface McqQuestion extends BaseQuestion {
  type: 'mcq';
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
}

interface ArticleQuestion extends BaseQuestion {
  type: 'article';
  expectedLength?: number;
}

type Question = McqQuestion | ArticleQuestion;

interface ExamData {
  title: string;
  course: string;
  description: string;
  timeLimit?: number;
  questions: Question[];
}

export default function CreateExam() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [currentQuestionType, setCurrentQuestionType] = useState<'mcq' | 'article'>('mcq');
  
  const [examData, setExamData] = useState<ExamData>({
    title: "",
    course: "",
    description: "",
    timeLimit: undefined,
    questions: []
  });

  // Create a new empty MCQ question
  const addMcqQuestion = () => {
    const newQuestion: McqQuestion = {
      id: uuidv4(),
      type: 'mcq',
      question: "",
      points: 1,
      options: [
        { id: uuidv4(), text: "", isCorrect: false },
        { id: uuidv4(), text: "", isCorrect: false },
        { id: uuidv4(), text: "", isCorrect: false },
        { id: uuidv4(), text: "", isCorrect: false }
      ]
    };
    setExamData({
      ...examData,
      questions: [...examData.questions, newQuestion]
    });
  };

  // Create a new empty article question
  const addArticleQuestion = () => {
    const newQuestion: ArticleQuestion = {
      id: uuidv4(),
      type: 'article',
      question: "",
      points: 10,
    };
    setExamData({
      ...examData,
      questions: [...examData.questions, newQuestion]
    });
  };

  // Update a question in the questions array
  const updateQuestion = (updatedQuestion: Question) => {
    const updatedQuestions = examData.questions.map(q => 
      q.id === updatedQuestion.id ? updatedQuestion : q
    );
    setExamData({
      ...examData,
      questions: updatedQuestions
    });
  };

  // Delete a question by id
  const deleteQuestion = (questionId: string) => {
    setExamData({
      ...examData,
      questions: examData.questions.filter(q => q.id !== questionId)
    });
  };

  // Add an option to an MCQ question
  const addOptionToMcq = (questionId: string) => {
    const updatedQuestions = examData.questions.map(q => {
      if (q.id === questionId && q.type === 'mcq') {
        return {
          ...q,
          options: [...q.options, { id: uuidv4(), text: "", isCorrect: false }]
        };
      }
      return q;
    });
    
    setExamData({
      ...examData,
      questions: updatedQuestions
    });
  };

  // Delete an option from an MCQ question
  const deleteOptionFromMcq = (questionId: string, optionId: string) => {
    const updatedQuestions = examData.questions.map(q => {
      if (q.id === questionId && q.type === 'mcq') {
        return {
          ...q,
          options: q.options.filter(opt => opt.id !== optionId)
        };
      }
      return q;
    });
    
    setExamData({
      ...examData,
      questions: updatedQuestions
    });
  };

  // Handle changing the correct answer in an MCQ question
  const handleCorrectAnswerChange = (questionId: string, optionId: string) => {
    const updatedQuestions = examData.questions.map(q => {
      if (q.id === questionId && q.type === 'mcq') {
        return {
          ...q,
          options: q.options.map(opt => ({
            ...opt,
            isCorrect: opt.id === optionId
          }))
        };
      }
      return q;
    });
    
    setExamData({
      ...examData,
      questions: updatedQuestions
    });
  };

  // Save the exam
  const saveExam = async () => {
    // TODO: Implement API call to save the exam
    console.log("Saving exam:", examData);
    
    // Navigate back to professor dashboard
    navigate('/');
  };

  // Cancel and go back
  const handleCancel = () => {
    navigate('/');
  };

  // Validate that the exam can be saved
  const canSaveExam = () => {
    return (
      examData.title.trim() !== "" && 
      examData.course.trim() !== "" && 
      examData.questions.length > 0 &&
      examData.questions.every(q => {
        if (q.type === 'mcq') {
          return q.question.trim() !== "" && 
            q.options.length >= 2 && 
            q.options.every(opt => opt.text.trim() !== "") &&
            q.options.some(opt => opt.isCorrect);
        } else {
          return q.question.trim() !== "";
        }
      })
    );
  };

  if (!user || user.role !== "professor") {
    return null; // Will be redirected by protected route
  }

  return (
    <AppShell>
      <div className="py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Create New Exam</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create your exam with multiple choice and/or essay questions
              </p>
            </div>
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="edit">Edit Exam</TabsTrigger>
              <TabsTrigger value="preview">Preview Exam</TabsTrigger>
            </TabsList>
            
            <TabsContent value="edit">
              {/* Exam Details Section */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Exam Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Exam Title</Label>
                      <Input 
                        id="title" 
                        placeholder="Enter exam title" 
                        value={examData.title}
                        onChange={(e) => setExamData({...examData, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course">Course</Label>
                      <Input 
                        id="course" 
                        placeholder="Enter course name" 
                        value={examData.course}
                        onChange={(e) => setExamData({...examData, course: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Enter exam description" 
                      value={examData.description}
                      onChange={(e) => setExamData({...examData, description: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Time Limit (minutes, optional)</Label>
                    <Input 
                      id="timeLimit" 
                      type="number"
                      placeholder="Enter time limit in minutes" 
                      value={examData.timeLimit || ""}
                      onChange={(e) => setExamData({...examData, timeLimit: e.target.value ? parseInt(e.target.value) : undefined})}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Questions Section */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-4 mb-6">
                    <Button onClick={() => {
                      setCurrentQuestionType('mcq');
                      addMcqQuestion();
                    }} className="flex items-center gap-2">
                      <FilePlus className="w-4 h-4" /> Add MCQ Question
                    </Button>
                    <Button onClick={() => {
                      setCurrentQuestionType('article');
                      addArticleQuestion();
                    }} variant="outline" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Add Essay Question
                    </Button>
                  </div>

                  {/* Display existing questions */}
                  {examData.questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No questions added yet. Use the buttons above to add questions.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {examData.questions.map((question, index) => (
                        <Card key={question.id} className="border border-gray-200">
                          <CardHeader className="bg-gray-50 flex flex-row items-center justify-between p-4">
                            <CardTitle className="text-base">Question {index + 1}: {question.type === 'mcq' ? 'Multiple Choice' : 'Essay'}</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => deleteQuestion(question.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </CardHeader>
                          <CardContent className="p-4">
                            {question.type === 'mcq' ? (
                              // MCQ Question Editor
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`question-${question.id}`}>Question</Label>
                                  <Textarea 
                                    id={`question-${question.id}`} 
                                    placeholder="Enter your question" 
                                    value={question.question}
                                    onChange={(e) => updateQuestion({
                                      ...question,
                                      question: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Options</Label>
                                  <div className="space-y-2">
                                    {question.options.map((option, optIndex) => (
                                      <div key={option.id} className="flex items-center space-x-2">
                                        <input
                                          type="radio"
                                          id={`option-${option.id}`}
                                          name={`correct-${question.id}`}
                                          checked={option.isCorrect}
                                          onChange={() => handleCorrectAnswerChange(question.id, option.id)}
                                          className="h-4 w-4 text-primary"
                                        />
                                        <Input 
                                          placeholder={`Option ${optIndex + 1}`} 
                                          value={option.text}
                                          onChange={(e) => {
                                            const updatedOptions = question.options.map(opt => 
                                              opt.id === option.id ? {...opt, text: e.target.value} : opt
                                            );
                                            updateQuestion({
                                              ...question,
                                              options: updatedOptions
                                            });
                                          }}
                                          className="flex-1"
                                        />
                                        <Button 
                                          variant="ghost" 
                                          size="icon"
                                          onClick={() => deleteOptionFromMcq(question.id, option.id)}
                                          disabled={question.options.length <= 2}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => addOptionToMcq(question.id)}
                                    className="mt-2"
                                  >
                                    Add Option
                                  </Button>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Label htmlFor={`points-${question.id}`}>Points:</Label>
                                  <Input 
                                    id={`points-${question.id}`}
                                    type="number"
                                    value={question.points}
                                    onChange={(e) => updateQuestion({
                                      ...question,
                                      points: parseInt(e.target.value) || 1
                                    })}
                                    className="w-20"
                                  />
                                </div>
                              </div>
                            ) : (
                              // Essay Question Editor
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`question-${question.id}`}>Question</Label>
                                  <Textarea 
                                    id={`question-${question.id}`} 
                                    placeholder="Enter your essay question" 
                                    value={question.question}
                                    onChange={(e) => updateQuestion({
                                      ...question,
                                      question: e.target.value
                                    })}
                                  />
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor={`points-${question.id}`}>Points:</Label>
                                    <Input 
                                      id={`points-${question.id}`}
                                      type="number"
                                      value={question.points}
                                      onChange={(e) => updateQuestion({
                                        ...question,
                                        points: parseInt(e.target.value) || 10
                                      })}
                                      className="w-20"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Label htmlFor={`length-${question.id}`}>Expected Word Count (Optional):</Label>
                                    <Input 
                                      id={`length-${question.id}`}
                                      type="number"
                                      value={question.expectedLength || ""}
                                      onChange={(e) => updateQuestion({
                                        ...question,
                                        expectedLength: e.target.value ? parseInt(e.target.value) : undefined
                                      })}
                                      className="w-20"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="preview">
              {/* Exam Preview */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>{examData.title || "Untitled Exam"}</CardTitle>
                  <div className="text-sm text-gray-500">
                    {examData.course || "No course specified"} • 
                    {examData.timeLimit ? ` ${examData.timeLimit} minutes` : " No time limit"}
                  </div>
                </CardHeader>
                <CardContent>
                  {examData.description && (
                    <div className="mb-6 p-4 bg-gray-50 rounded">
                      <p>{examData.description}</p>
                    </div>
                  )}
                  
                  {examData.questions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No questions added yet. Go to Edit tab to add questions.
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {examData.questions.map((question, index) => (
                        <div key={question.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                          <h3 className="font-medium mb-2">Question {index + 1}: {question.question || "Untitled Question"}</h3>
                          {question.type === 'mcq' ? (
                            <div className="space-y-2 ml-4">
                              {question.options.map((option, optIndex) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                  <input
                                    type="radio"
                                    id={`preview-option-${option.id}`}
                                    name={`preview-${question.id}`}
                                    disabled
                                    className="h-4 w-4"
                                  />
                                  <label htmlFor={`preview-option-${option.id}`} className="text-sm">
                                    {option.text || `Option ${optIndex + 1}`}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="ml-4">
                              <div className="border border-gray-200 rounded p-4 bg-gray-50 text-gray-400 min-h-[100px]">
                                Student answer will appear here
                              </div>
                              {question.expectedLength && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Expected word count: approximately {question.expectedLength} words
                                </p>
                              )}
                            </div>
                          )}
                          <div className="text-xs text-gray-500 mt-2 text-right">
                            {question.points} point{question.points !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 mt-6">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button 
              onClick={saveExam} 
              disabled={!canSaveExam()}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Exam
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}