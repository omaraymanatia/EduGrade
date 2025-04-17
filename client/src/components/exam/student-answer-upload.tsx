import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, X, Image, CheckCircle } from "lucide-react";

type StudentAnswerUploadProps = {
  examId: number;
  studentExamId: number;
  onSuccess?: () => void;
};

export function StudentAnswerUpload({ examId, studentExamId, onSuccess }: StudentAnswerUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (validFiles.length !== files.length) {
        toast({
          title: "Invalid file format",
          description: "Please select only image files",
          variant: "destructive",
        });
      }
      
      // Create previews
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setPreviews(prev => [...prev, e.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
      
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Remove a file from the selection
  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    const newPreviews = [...previews];
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  // Upload files mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (selectedFiles.length === 0) return;
      
      const formData = new FormData();
      formData.append('examId', examId.toString());
      formData.append('studentExamId', studentExamId.toString());
      
      selectedFiles.forEach((file, index) => {
        formData.append(`images`, file);
      });
      
      const res = await apiRequest("POST", "/api/upload-student-answers", formData);
      
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload successful",
        description: `Successfully uploaded ${selectedFiles.length} image(s)`,
      });
      
      // Clear the form
      setSelectedFiles([]);
      setPreviews([]);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/exams/${examId}`] });
      
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Upload Student Answer Images</CardTitle>
        <CardDescription>
          Upload photos of handwritten student answers for grading
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* File input */}
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="student-answers">Select Images</Label>
            <Input
              id="student-answers"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              ref={fileInputRef}
              className="hidden"
            />
            <div 
              className="border-2 border-dashed rounded-md py-10 px-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select images or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports: JPG, PNG, GIF
                </p>
              </div>
            </div>
          </div>
          
          {/* Preview area */}
          {previews.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Images ({previews.length})</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="w-full aspect-square rounded-md overflow-hidden border">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-90"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Upload button */}
          <div className="flex justify-end">
            <Button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="mr-2"
              disabled={uploadMutation.isPending}
            >
              <Image className="mr-2 h-4 w-4" />
              Add Images
            </Button>
            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={selectedFiles.length === 0 || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </Button>
          </div>
          
          {/* Success message */}
          {uploadMutation.isSuccess && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-sm text-green-700">
                Images have been uploaded successfully
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}