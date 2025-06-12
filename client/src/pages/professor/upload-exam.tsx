import { useState } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function UploadExamPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select an exam photo to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    // Create FormData
    const formData = new FormData();
    formData.append("photos", selectedFile);

    try {
      const response = await fetch("/api/exams/upload-photos", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      const result = await response.json();

      toast({
        title: "Upload successful",
        description: `Created exam "${result.title}" with ${result.questionsCount} questions`,
      });

      // Navigate to the edit page for the newly created exam
      navigate(`/professor/exams/${result.examId}/edit`);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
            <h3 className="text-gray-700 text-2xl font-medium">
              Upload Exam Photo
            </h3>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Upload an exam photo to generate an exam automatically
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors">
                <input
                  type="file"
                  id="exam-photo"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="exam-photo" className="cursor-pointer">
                  <div className="flex flex-col items-center">
                    <Upload className="h-12 w-12 text-gray-400 mb-2" />
                    <p className="text-lg font-medium">
                      {selectedFile
                        ? selectedFile.name
                        : "Click to upload exam photo"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Supported formats: JPG, JPEG, PNG
                    </p>
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    className="px-12"
                    disabled={isUploading}
                  >
                    {isUploading && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {isUploading ? "Processing..." : "Upload and Process Exam"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
