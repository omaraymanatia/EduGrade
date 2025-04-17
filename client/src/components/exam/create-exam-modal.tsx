import { FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ExamPhotoUpload } from "./exam-photo-upload";

type CreateExamModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CreateExamModal({ isOpen, onClose }: CreateExamModalProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleGoToManualCreate = () => {
    onClose();
    navigate("/professor/exams/create");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Create New Exam
          </DialogTitle>
          <DialogDescription>
            Choose how you want to create your exam
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="photo-upload" className="space-y-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Manual Creation
            </TabsTrigger>
            <TabsTrigger value="photo-upload" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Upload Photos
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-6">
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Create Exam Manually</h4>
              <p className="text-muted-foreground">
                Create an exam by manually entering questions and answers through our dedicated editor.
              </p>
              
              <div className="mt-6">
                <Button onClick={handleGoToManualCreate} className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Go to Manual Exam Creation
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </TabsContent>
          
          <TabsContent value="photo-upload" className="space-y-6">
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-2">Upload Exam Photos</h4>
              <p className="text-muted-foreground">
                Upload photos of your exam papers and our AI will extract questions and answers automatically.
              </p>
            </div>
            
            <ExamPhotoUpload 
              onSuccess={() => {
                onClose();
                queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
              }}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
