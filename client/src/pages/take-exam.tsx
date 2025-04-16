import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation, useParams } from "wouter";
import { Loader2, Clock, AlertCircle, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

// Mock exam data
const mockExam = {
  id: 4,
  title: "Final Exam",
  course: "Computer Science",
  timeLimit: 60, // minutes
  questions: [
    {
      id: 1,
      type: "mcq",
      question: "What is the capital of France?",
      points: 2,
      options: [
        { id: "a", text: "London", isCorrect: false },
        { id: "b", text: "Berlin", isCorrect: false },
        { id: "c", text: "Paris", isCorrect: true },
        { id: "d", text: "Madrid", isCorrect: false },
      ]
    },
    {
      id: 2,
      type: "mcq",
      question: "Which of the following is NOT a programming language?",
      points: 2,
      options: [
        { id: "a", text: "Java", isCorrect: false },
        { id: "b", text: "HTML", isCorrect: true },
        { id: "c", text: "Python", isCorrect: false },
        { id: "d", text: "Ruby", isCorrect: false },
      ]
    },
    {
      id: 3,
      type: "article",
      question: "Explain the concept of inheritance in object-oriented programming and provide an example.",
      points: 10,
      expectedLength: 250
    }
  ]
};

export default function TakeExam() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const examId = params.examId ? parseInt(params.examId) : 0;
  
  const [loading, setLoading] = useState(true);
  const [exam, setExam] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load exam data
  useEffect(() => {
    const fetchExam = async () => {
      // In a real app, this would fetch from an API
      setTimeout(() => {
        setExam(mockExam);
        setTimeLeft(mockExam.timeLimit * 60); // convert to seconds
        setLoading(false);
      }, 1000);
    };
    
    fetchExam();
  }, [examId]);
  
  // Timer effect
  useEffect(() => {
    if (!timeLeft) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev && prev > 0) {
          return prev - 1;
        } else {
          // Auto-submit when time runs out
          handleSubmit();
          return 0;
        }
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);
  
  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < (exam?.questions?.length || 0)) {
      setCurrentQuestion(index);
    }
  };
  
  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    // In a real app, this would submit to an API
    console.log("Submitting answers:", answers);
    
    // Simulate API call
    setTimeout(() => {
      navigate("/student");
    }, 2000);
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage
  const calculateProgress = (): number => {
    if (!exam?.questions) return 0;
    
    const answeredCount = Object.keys(answers).length;
    return (answeredCount / exam.questions.length) * 100;
  };
  
  if (!user || user.role !== "student") {
    return null; // Will be redirected by protected route
  }
  
  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p>Loading exam...</p>
          </div>
        </div>
      </AppShell>
    );
  }
  
  if (!exam) {
    return (
      <AppShell>
        <div className="py-6">
          <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Could not load exam. Please go back and try again.
              </AlertDescription>
            </Alert>
            <div className="mt-4">
              <Button onClick={() => navigate("/student")} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }
  
  const currentQuestionData = exam.questions[currentQuestion];
  
  return (
    <AppShell>
      <div className="py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          {/* Exam Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{exam.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{exam.course}</p>
            </div>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-md">
                <Clock className="h-5 w-5 text-gray-600" />
                <span className={`font-mono font-medium ${timeLeft < 300 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
          </div>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Progress</span>
              <span className="text-sm font-medium">
                {Object.keys(answers).length} / {exam.questions.length} answered
              </span>
            </div>
            <Progress value={calculateProgress()} />
          </div>
          
          {/* Question Navigation */}
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              {exam.questions.map((q: any, index: number) => (
                <Button
                  key={q.id}
                  variant={index === currentQuestion ? "default" : answers[q.id] ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => goToQuestion(index)}
                  className={answers[q.id] ? "border-green-500" : ""}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Question {currentQuestion + 1}</span>
                <span className="text-sm font-normal text-gray-500">
                  {currentQuestionData.points} point{currentQuestionData.points !== 1 ? 's' : ''}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <p className="text-lg">{currentQuestionData.question}</p>
              </div>
              
              {currentQuestionData.type === 'mcq' ? (
                /* Multiple Choice Question */
                <RadioGroup
                  value={answers[currentQuestionData.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestionData.id, value)}
                  className="space-y-3"
                >
                  {currentQuestionData.options.map((option: any) => (
                    <div className="flex items-center space-x-2" key={option.id}>
                      <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                      <Label htmlFor={`option-${option.id}`} className="cursor-pointer">
                        {option.text}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                /* Essay Question */
                <div className="space-y-2">
                  <Textarea
                    placeholder="Type your answer here..."
                    className="min-h-[200px]"
                    value={answers[currentQuestionData.id] || ""}
                    onChange={(e) => handleAnswerChange(currentQuestionData.id, e.target.value)}
                  />
                  {currentQuestionData.expectedLength && (
                    <p className="text-xs text-gray-500">
                      Expected word count: approximately {currentQuestionData.expectedLength} words
                    </p>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => goToQuestion(currentQuestion - 1)}
                disabled={currentQuestion === 0}
              >
                Previous
              </Button>
              
              {currentQuestion === exam.questions.length - 1 ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Exam'
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => goToQuestion(currentQuestion + 1)}
                  disabled={currentQuestion === exam.questions.length - 1}
                >
                  Next
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}