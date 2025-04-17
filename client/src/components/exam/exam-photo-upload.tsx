import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Upload, X, Image, CheckCircle } from "lucide-react";

type ExamPhotoUploadProps = {
  onSuccess?: () => void;
};

export function ExamPhotoUpload({ onSuccess }: ExamPhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
      
      // Generate previews
      selectedFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove a file
  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (files.length === 0) {
        throw new Error("Please select at least one file");
      }

      const formData = new FormData();
      files.forEach(file => {
        formData.append("examPhotos", file);
      });

      const res = await apiRequest("POST", "/api/exams/upload", formData);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Exam created successfully",
        description: `Created exam "${data.title}" with ID ${data.examKey}`,
      });

      // Clear the form
      setFiles([]);
      setPreviews([]);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      
      // Call success callback
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div 
            className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center ${
              files.length > 0 ? "border-gray-300 bg-gray-50" : "border-primary/20 hover:border-primary/40 bg-primary/5"
            }`}
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: "pointer" }}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
              multiple 
              accept="image/*"
            />
            
            {files.length === 0 ? (
              <>
                <Upload className="h-10 w-10 text-primary/60 mb-2" />
                <h3 className="text-lg font-semibold mb-1">Upload Exam Photos</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  Drag and drop exam photos here or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Supported formats: JPG, PNG, PDF
                </p>
              </>
            ) : (
              <>
                <Image className="h-10 w-10 text-primary/60 mb-2" />
                <h3 className="text-lg font-semibold mb-1">Add More Photos</h3>
                <p className="text-xs text-muted-foreground">
                  Click to add more images to your exam
                </p>
              </>
            )}
          </div>
          
          {/* File previews */}
          {previews.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-sm mb-3">Selected Photos ({previews.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-md overflow-hidden border shadow-sm">
                      <img
                        src={preview}
                        alt={`Upload preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm 
                        opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="text-xs truncate mt-1">{files[index]?.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Upload button */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={() => uploadMutation.mutate()} 
            disabled={uploadMutation.isPending}
            size="lg"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Create Exam from Photos
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* Progress and instructions */}
      {uploadMutation.isPending && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Analyzing exam photos and extracting questions...
          </p>
          <Progress value={45} className="h-2" />
        </div>
      )}
      
      <div className="mt-6 space-y-6">
        <div className="bg-primary/5 p-4 rounded-md border border-primary/10">
          <h3 className="font-medium mb-2">How Exam Photo Processing Works</h3>
          <ol className="space-y-3 pl-5 list-decimal text-sm text-muted-foreground">
            <li>Upload clear photos of your printed exam papers</li>
            <li>Our AI system analyzes the photos to extract questions and answers</li>
            <li>The system automatically creates a digital version of your exam</li>
            <li>You can review and edit the extracted content if needed</li>
            <li>Share the generated exam ID with your students to begin the assessment</li>
          </ol>
        </div>
      </div>
    </div>
  );
}