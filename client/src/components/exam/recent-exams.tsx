import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Exam = {
  id: number;
  title: string;
  course: string;
  createdAt: string;
  accessCode: string;
};

type Submission = {
  id: number;
  examId: number;
  score: number;
  completedAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
};

type RecentExamsProps = {
  limit?: number;
  showViewAll?: boolean;
};

export function RecentExams({ limit = 3, showViewAll = true }: RecentExamsProps) {
  const { user } = useAuth();
  
  // Fetch exams
  const { data: exams, isLoading, error } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  // Limit the exams to display
  const limitedExams = useMemo(() => {
    if (!exams) return [];
    return exams.slice(0, limit);
  }, [exams, limit]);

  // Get submissions for each exam if professor
  const { data: submissions } = useQuery<Record<number, Submission[]>>({
    queryKey: ["/api/submissions"],
    queryFn: async () => {
      if (user?.role !== "professor" || !exams || exams.length === 0) {
        return {};
      }
      
      // Fetch submissions for each exam
      const submissionsPromises = exams.map((exam) => 
        fetch(`/api/exams/${exam.id}/submissions`, { credentials: "include" })
          .then(res => res.ok ? res.json() : [])
          .then(data => ({ examId: exam.id, submissions: data }))
      );
      
      const results = await Promise.all(submissionsPromises);
      
      // Convert to a record with exam ID as key
      return results.reduce((acc, { examId, submissions }) => {
        acc[examId] = submissions;
        return acc;
      }, {} as Record<number, Submission[]>);
    },
    enabled: user?.role === "professor" && !!exams && exams.length > 0,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !exams || exams.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>{error ? "Failed to load exams" : "No exams found"}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Recent Exams</h3>
        {showViewAll && (
          <Link href="/exams" className="text-primary hover:text-primary/80 text-sm">
            View all
          </Link>
        )}
      </div>
      
      <div className="space-y-4">
        {limitedExams.map((exam) => {
          const submissionsCount = submissions?.[exam.id]?.length || 0;
          const date = new Date(exam.createdAt);
          const formattedDate = formatDistanceToNow(date, { addSuffix: true });
          
          return (
            <div key={exam.id} className="border-b border-gray-200 pb-3 last:border-0">
              <div className="flex justify-between">
                <p className="font-medium">{exam.title}</p>
                <span className="text-sm text-gray-600">{formattedDate}</span>
              </div>
              {user?.role === "professor" ? (
                <p className="text-sm text-gray-600">
                  {submissionsCount} {submissionsCount === 1 ? "student" : "students"} completed
                </p>
              ) : (
                <p className="text-sm text-gray-600">{exam.course}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
