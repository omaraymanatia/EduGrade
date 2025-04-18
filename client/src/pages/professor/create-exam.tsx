import { useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Trash2, GripVertical, Plus, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const QUESTION_TYPES = {
  MULTIPLE_CHOICE: "multiple_choice",
  ESSAY: "essay",
} as const;

const examSchema = z.object({
  title: z.string().min(1, "Title is required"),
  courseCode: z.string().min(1, "Course code is required"),
  instructions: z.string().optional(),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute"),
  passingScore: z.coerce
    .number()
    .min(0, "Passing score must be at least 0")
    .max(100, "Passing score must be at most 100"),
  questions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          text: z.string().min(1, "Question text is required"),
          type: z.literal(QUESTION_TYPES.MULTIPLE_CHOICE),
          points: z.coerce.number().min(1, "Points must be at least 1"),
          options: z
            .array(
              z.object({
                text: z.string().min(1, "Option text is required"),
                isCorrect: z.boolean().default(false),
              })
            )
            .min(2, "At least 2 options are required"),
          modelAnswer: z.string().optional(),
        }),
        z.object({
          text: z.string().min(1, "Question text is required"),
          type: z.literal(QUESTION_TYPES.ESSAY),
          points: z.coerce.number().min(1, "Points must be at least 1"),
          options: z.undefined(),
          modelAnswer: z.string().min(1, "Model answer is required"),
        }),
      ])
    )
    .min(1, "At least one question is required"),
});

type ExamFormValues = z.infer<typeof examSchema>;

const SortableQuestion = ({
  id,
  children,
  index,
}: {
  id: string;
  children: React.ReactNode;
  index: number;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-2 mb-4">
        <button
          type="button"
          className="p-2 hover:bg-gray-100 rounded-lg cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
};

export default function ProfessorCreateExam() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      courseCode: "",
      instructions: "",
      duration: 60,
      passingScore: 70,
      questions: [
        {
          text: "",
          type: QUESTION_TYPES.MULTIPLE_CHOICE,
          points: 1,
          options: [
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
          modelAnswer: "",
        },
      ],
    },
  });

  const {
    fields: questionFields,
    append,
    remove,
    move,
  } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const optionsFieldArrays = useMemo(() => {
    return questionFields.map((_, index) => {
      return {
        fields: form.watch(`questions.${index}.options`) || [],
        append: (value: any) => {
          const currentOptions =
            form.getValues(`questions.${index}.options`) || [];
          form.setValue(`questions.${index}.options`, [
            ...currentOptions,
            value,
          ]);
        },
        remove: (optionIndex: number) => {
          const currentOptions =
            form.getValues(`questions.${index}.options`) || [];
          const newOptions = currentOptions.filter((_, i) => i !== optionIndex);
          form.setValue(`questions.${index}.options`, newOptions);
        },
      };
    });
  }, [questionFields.length, form.watch]);

  const createExamMutation = useMutation({
    mutationFn: async (data: ExamFormValues) => {
      const res = await apiRequest("POST", "/api/exams", data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Exam created successfully",
        description: `Exam key: ${data.examKey}`,
      });
      navigate(`/professor/exams/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExamFormValues) => {
    // Clean up the data structure before submitting
    const formattedData = {
      ...data,
      questions: data.questions.map((q) => {
        if (q.type === QUESTION_TYPES.ESSAY) {
          const { options, ...essayQuestion } = q;
          return essayQuestion;
        }
        return q;
      }),
    };

    createExamMutation.mutate(formattedData);
  };

  const addQuestion = () => {
    append({
      text: "",
      type: QUESTION_TYPES.MULTIPLE_CHOICE,
      points: 1,
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      modelAnswer: "",
    });
  };

  const handleQuestionTypeChange = (value: string, index: number) => {
    if (value === QUESTION_TYPES.ESSAY) {
      // Clear options when switching to essay
      form.setValue(`questions.${index}.options`, undefined);
    } else {
      // Add default options when switching to multiple choice
      form.setValue(`questions.${index}.options`, [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ]);
    }
    form.setValue(`questions.${index}.type`, value as any);
  };

  const addOption = (questionIndex: number) => {
    optionsFieldArrays[questionIndex]?.append({
      text: "",
      isCorrect: false,
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    optionsFieldArrays[questionIndex]?.remove(optionIndex);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = questionFields.findIndex((q) => q.id === active.id);
      const newIndex = questionFields.findIndex((q) => q.id === over?.id);
      move(oldIndex, newIndex);
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
          <h3 className="text-gray-700 text-2xl font-medium">
            Create New Exam
          </h3>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
                <CardDescription>
                  Enter the basic information for your exam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exam Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Midterm Exam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courseCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. CS-301" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            placeholder="e.g. 90"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="passingScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Passing Score (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            placeholder="e.g. 70"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add instructions for students..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="mb-4 flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-800">Questions</h4>
              <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus className="mr-2 h-4 w-4" /> Add Question
              </Button>
            </div>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={questionFields}
                strategy={verticalListSortingStrategy}
              >
                {questionFields.map((field, questionIndex) => (
                  <SortableQuestion
                    key={field.id}
                    id={field.id}
                    index={questionIndex}
                  >
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-lg">
                            Question {questionIndex + 1}
                          </CardTitle>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => remove(questionIndex)}
                            disabled={questionFields.length === 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name={`questions.${questionIndex}.text`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Question Text</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter your question..."
                                  rows={2}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`questions.${questionIndex}.type`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Question Type</FormLabel>
                                <Select
                                  onValueChange={(value) =>
                                    handleQuestionTypeChange(
                                      value,
                                      questionIndex
                                    )
                                  }
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a question type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem
                                      value={QUESTION_TYPES.MULTIPLE_CHOICE}
                                    >
                                      Multiple Choice
                                    </SelectItem>
                                    <SelectItem value={QUESTION_TYPES.ESSAY}>
                                      Essay
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`questions.${questionIndex}.points`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Points</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    placeholder="e.g. 5"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {form.watch(`questions.${questionIndex}.type`) ===
                          QUESTION_TYPES.MULTIPLE_CHOICE && (
                          <div>
                            <FormLabel>Options</FormLabel>
                            <div className="space-y-2 mt-2">
                              {optionsFieldArrays[questionIndex]?.fields.map(
                                (_, optionIndex) => (
                                  <div
                                    key={optionIndex}
                                    className="flex items-center space-x-2"
                                  >
                                    <FormField
                                      control={form.control}
                                      name={`questions.${questionIndex}.options.${optionIndex}.isCorrect`}
                                      render={({ field }) => (
                                        <FormItem className="flex items-center space-x-2">
                                          <FormControl>
                                            <RadioGroup
                                              onValueChange={(value) => {
                                                const optionsLength =
                                                  form.getValues(
                                                    `questions.${questionIndex}.options`
                                                  )?.length || 0;
                                                for (
                                                  let i = 0;
                                                  i < optionsLength;
                                                  i++
                                                ) {
                                                  form.setValue(
                                                    `questions.${questionIndex}.options.${i}.isCorrect`,
                                                    false
                                                  );
                                                }
                                                form.setValue(
                                                  `questions.${questionIndex}.options.${optionIndex}.isCorrect`,
                                                  value === "true"
                                                );
                                              }}
                                              value={
                                                field.value ? "true" : "false"
                                              }
                                            >
                                              <RadioGroupItem
                                                value="true"
                                                id={`option-${questionIndex}-${optionIndex}`}
                                              />
                                            </RadioGroup>
                                          </FormControl>
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={form.control}
                                      name={`questions.${questionIndex}.options.${optionIndex}.text`}
                                      render={({ field }) => (
                                        <FormItem className="flex-1">
                                          <FormControl>
                                            <Input
                                              placeholder={`Option ${
                                                optionIndex + 1
                                              }`}
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        removeOption(questionIndex, optionIndex)
                                      }
                                      disabled={
                                        optionsFieldArrays[questionIndex]
                                          ?.fields.length <= 2
                                      }
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )
                              )}

                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addOption(questionIndex)}
                              >
                                <Plus className="mr-2 h-3 w-3" /> Add Option
                              </Button>
                            </div>
                          </div>
                        )}

                        {form.watch(`questions.${questionIndex}.type`) ===
                          QUESTION_TYPES.ESSAY && (
                          <FormField
                            control={form.control}
                            name={`questions.${questionIndex}.modelAnswer`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Model Answer</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Enter the model answer for this essay question..."
                                    rows={4}
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </SortableQuestion>
                ))}
              </SortableContext>
            </DndContext>

            <Card>
              <CardFooter className="flex justify-end space-x-2 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/professor/exams")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createExamMutation.isPending}>
                  {createExamMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Creating...
                    </>
                  ) : (
                    "Create Exam"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>
    </DashboardLayout>
  );
}
