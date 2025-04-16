import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { aiTextAnalysisSchema, AiTextAnalysis, AiDetectionResult } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DetectionResults } from "@/components/dashboard/detection-results";

export function AiDetectionDemo() {
  const [showResults, setShowResults] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const form = useForm<AiTextAnalysis>({
    resolver: zodResolver(aiTextAnalysisSchema),
    defaultValues: {
      text: "",
      sensitivity: 3
    }
  });
  
  const analyzeTextMutation = useMutation<AiDetectionResult, Error, AiTextAnalysis>({
    mutationFn: async (data: AiTextAnalysis) => {
      const res = await apiRequest("POST", "/api/detect", data);
      return await res.json();
    },
    onSuccess: () => {
      setShowResults(true);
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  const onSubmit = (data: AiTextAnalysis) => {
    analyzeTextMutation.mutate(data);
  };
  
  const handleFileUpload = async () => {
    if (!selectedFile) return;
    
    // In a real implementation, we would upload the file to the server
    // and then process it for AI detection.
    // For now, we'll just simulate this process:
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && typeof e.target.result === 'string') {
        form.setValue('text', e.target.result.substring(0, 5000)); // Limit text size
        setSelectedFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };
  
  return (
    <div>
      <h3 className="text-lg font-medium text-gray-900">AI Text Detection Demo</h3>
      <p className="mt-1 text-sm text-gray-500">
        Test the AI detection capabilities by entering text or uploading a document.
      </p>
      
      <div className="mt-6">
        <Label htmlFor="detection-text" className="block text-sm font-medium text-gray-700">
          Enter text for analysis
        </Label>
        <div className="mt-1">
          <Textarea
            id="detection-text"
            rows={5}
            placeholder="Paste student text here to analyze for AI-generated content..."
            className="resize-none"
            {...form.register("text")}
          />
          {form.formState.errors.text && (
            <p className="mt-1 text-xs text-red-500">{form.formState.errors.text.message}</p>
          )}
        </div>
      </div>
      
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="flex-grow flex flex-col">
            <span className="text-sm font-medium text-gray-900">
              Detection Sensitivity
            </span>
            <span className="text-sm text-gray-500">
              Adjust how strictly the system identifies AI content
            </span>
          </span>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">Low</span>
            <input 
              type="range"
              min="1"
              max="5"
              className="h-2 w-32 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              {...form.register("sensitivity", { valueAsNumber: true })}
            />
            <span className="text-sm text-gray-500">High</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={analyzeTextMutation.isPending}
        >
          {analyzeTextMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : "Analyze Text"}
        </Button>
        
        <div className="relative">
          <Button variant="outline">
            <Upload className="w-5 h-5 mr-2" />
            Upload Document
          </Button>
          <Input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
          />
        </div>
        
        {selectedFile && (
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">{selectedFile.name}</span>
            <Button size="sm" onClick={handleFileUpload}>Process</Button>
          </div>
        )}
      </div>
      
      {showResults && analyzeTextMutation.data && (
        <DetectionResults result={analyzeTextMutation.data} text={form.getValues().text} />
      )}
    </div>
  );
}
