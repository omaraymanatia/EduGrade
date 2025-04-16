import { SubmissionWithDetails } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface SubmissionsTableProps {
  submissions: SubmissionWithDetails[];
}

export function SubmissionsTable({ submissions }: SubmissionsTableProps) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="mt-4 p-8 text-center bg-white border border-gray-200 rounded-lg shadow">
        <p className="text-gray-500">No submissions found</p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Submission Date</TableHead>
                  <TableHead>AI Detection</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gray-200 text-gray-600 font-semibold">
                          {submission.student.fullName.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {submission.student.fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            #{submission.student.id}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{submission.exam.title}</div>
                      <div className="text-sm text-gray-500">{submission.exam.course}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(submission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        {submission.aiDetectionResult ? (
                          <>
                            <div className="text-sm text-gray-900 font-medium mb-1">
                              <AiDetectionScore score={submission.aiDetectionResult.score} />
                            </div>
                            <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${getScoreColor(submission.aiDetectionResult.score)}`}
                                style={{ width: `${submission.aiDetectionResult.score}%` }}
                              ></div>
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Not analyzed</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <GradeDisplay submission={submission} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/submissions/${submission.id}`}>
                        <Button variant="ghost" className="text-primary hover:text-primary-dark">
                          Review
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiDetectionScore({ score }: { score: number }) {
  let textColor = "text-green-600";
  let label = "Human Generated";
  
  if (score > 70) {
    textColor = "text-red-600";
    label = "AI Generated";
  } else if (score > 30) {
    textColor = "text-yellow-600";
    label = "Possibly AI Generated";
  }
  
  return <span className={textColor}>{score}% {label}</span>;
}

function getScoreColor(score: number): string {
  if (score > 70) return "bg-red-500";
  if (score > 30) return "bg-yellow-500";
  return "bg-green-500";
}

function GradeDisplay({ submission }: { submission: SubmissionWithDetails }) {
  if (submission.status === "flagged") {
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
        Flagged
      </span>
    );
  }
  
  if (submission.grade !== null && submission.grade !== undefined) {
    let bgColor = "bg-green-100 text-green-800";
    if (submission.grade < 60) {
      bgColor = "bg-red-100 text-red-800";
    } else if (submission.grade < 80) {
      bgColor = "bg-yellow-100 text-yellow-800";
    }
    
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
        {Math.round(submission.grade)}%
      </span>
    );
  }
  
  return (
    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
      Pending
    </span>
  );
}
