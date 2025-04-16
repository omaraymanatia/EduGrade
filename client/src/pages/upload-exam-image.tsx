import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { FileUp, ArrowLeft, Loader2 } from "lucide-react";

export default function UploadExamImage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  
  const [examData, setExamData] = useState({
    title: "",
    course: "",
    description: "",
    examType: "mcq", // Default to mcq
  });
  
  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      setIsUploading(true);
      
      // Create a preview URL for the image
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage(reader.result as string);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Process image with AI to extract text
  const processImage = async () => {
    if (!uploadedImage) return;
    
    setIsProcessing(true);
    
    // Simulate AI text extraction
    setTimeout(() => {
      // This is a placeholder for the actual AI text extraction API call
      const sampleExtractedText = 
        "1. What is the capital of France?\na) London\nb) Berlin\nc) Paris\nd) Madrid\n\n" +
        "2. Which planet is known as the Red Planet?\na) Venus\nb) Mars\nc) Jupiter\nd) Mercury\n\n" +
        "3. What is the largest mammal on Earth?\na) Elephant\nb) Blue Whale\nc) Giraffe\nd) Gorilla";
      
      setExtractedText(sampleExtractedText);
      setIsProcessing(false);
    }, 2000);
  };
  
  // Create exam from extracted text
  const createExam = async () => {
    if (!extractedText) return;
    
    // In a real application, this would parse the extracted text
    // and create questions in the proper format in the database
    
    // For now, just navigate back to the dashboard
    navigate("/");
  };
  
  // Handle cancel and return to dashboard
  const handleCancel = () => {
    navigate("/");
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
              <h1 className="text-2xl font-semibold text-gray-900">Upload Exam Image</h1>
              <p className="mt-1 text-sm text-gray-500">
                Upload a photo of your exam and let AI extract the text automatically
              </p>
            </div>
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Exam Details Section */}
            <Card>
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  <Label htmlFor="examType">Exam Type</Label>
                  <Select 
                    value={examData.examType} 
                    onValueChange={(value) => setExamData({...examData, examType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mcq">Multiple Choice</SelectItem>
                      <SelectItem value="article">Essay/Article</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
            
            {/* Image Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Exam Image</CardTitle>
              </CardHeader>
              <CardContent>
                {!uploadedImage ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center">
                    <FileUp className="h-12 w-12 text-gray-400" />
                    <div className="mt-2 text-sm text-gray-500">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-dark">
                        <span>Upload a file</span>
                        <input 
                          id="file-upload" 
                          name="file-upload" 
                          type="file" 
                          className="sr-only" 
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-md overflow-hidden">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded exam" 
                        className="w-full h-auto max-h-[400px] object-contain"
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                        onClick={() => setUploadedImage(null)}
                      >
                        Remove
                      </Button>
                    </div>
                    
                    <Button 
                      onClick={processImage} 
                      className="w-full"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Image...
                        </>
                      ) : (
                        "Process Image with AI"
                      )}
                    </Button>
                  </div>
                )}
                
                {isUploading && (
                  <div className="mt-4 flex items-center justify-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {/* Extracted Text Section */}
          {extractedText && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Extracted Text</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-md">
                  <pre className="whitespace-pre-wrap">{extractedText}</pre>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  The AI has extracted the text above from your image. You can create an exam with this content
                  or edit it manually in the exam creation page.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end space-x-4">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={createExam}>
                  Create Exam from Extracted Text
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}