import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

const examAccessSchema = z.object({
  accessCode: z.string().min(1, "Access code is required"),
});

export function ExamAccessForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const form = useForm<z.infer<typeof examAccessSchema>>({
    resolver: zodResolver(examAccessSchema),
    defaultValues: {
      accessCode: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof examAccessSchema>) => {
    setIsSubmitting(true);
    try {
      // Attempt to fetch exam by access code
      const response = await fetch(`/api/access-exam/${values.accessCode}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to access exam");
      }
      
      const examData = await response.json();
      
      // Store exam data in query cache
      queryClient.setQueryData([`/api/exams/${examData.id}`], examData);
      
      toast({
        title: "Exam accessed",
        description: `Successfully accessed "${examData.title}"`,
      });
      
      // Navigate to the exam
      navigate(`/exams/${examData.id}`);
    } catch (error) {
      toast({
        title: "Access failed",
        description: error instanceof Error ? error.message : "Invalid access code",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-3">
        <FormField
          control={form.control}
          name="accessCode"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  placeholder="Enter exam ID"
                  {...field}
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Accessing..." : "Access Exam"}
        </Button>
      </form>
    </Form>
  );
}
