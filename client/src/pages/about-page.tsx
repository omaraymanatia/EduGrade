import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  GraduationCap, 
  CheckCircle, 
  ShieldCheck, 
  Users, 
  BrainCircuit 
} from "lucide-react";

export default function AboutPage() {
  return (
    <AppShell>
      <div className="py-6">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          <h1 className="text-3xl font-semibold text-gray-900">About ExamSmart</h1>
          <p className="mt-2 text-lg text-gray-600">
            Advanced examination platform with AI detection capabilities
          </p>
        </div>
        
        <div className="px-4 mx-auto max-w-7xl sm:px-6 md:px-8">
          {/* Introduction */}
          <div className="mt-8">
            <div className="prose max-w-none">
              <p className="text-lg">
                ExamSmart is a comprehensive examination platform designed to streamline the testing process
                for both professors and students. Our platform combines traditional exam functionality with
                cutting-edge AI detection technology to ensure academic integrity.
              </p>
            </div>
          </div>
          
          {/* Key Features */}
          <div className="mt-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-6">Key Features</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard 
                title="Flexible Exam Creation" 
                description="Create exams with multiple-choice questions, essay questions, or a combination of both formats."
                icon={<BookOpen className="w-8 h-8 text-primary" />}
              />
              <FeatureCard 
                title="Photo to Exam Conversion" 
                description="Upload a photo of a paper exam and our system will automatically convert it to a digital format."
                icon={<GraduationCap className="w-8 h-8 text-secondary" />}
              />
              <FeatureCard 
                title="AI Text Detection" 
                description="Advanced AI algorithms detect potentially AI-generated content in student submissions."
                icon={<BrainCircuit className="w-8 h-8 text-accent" />}
              />
              <FeatureCard 
                title="Role-Based Access" 
                description="Different interfaces and permissions for professors and students, ensuring appropriate access."
                icon={<Users className="w-8 h-8 text-green-500" />}
              />
              <FeatureCard 
                title="Secure Examination" 
                description="Timed exams with progress tracking and safeguards against academic dishonesty."
                icon={<ShieldCheck className="w-8 h-8 text-blue-500" />}
              />
              <FeatureCard 
                title="Comprehensive Results" 
                description="Detailed reports and analytics on student performance and potential AI usage."
                icon={<CheckCircle className="w-8 h-8 text-purple-500" />}
              />
            </div>
          </div>
          
          {/* How It Works */}
          <div className="mt-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-6">How It Works</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-8">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                        1
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Professors Create Exams</h3>
                      <p className="mt-2 text-gray-600">
                        Professors can create exams using our intuitive interface, either by manually adding questions
                        or by uploading a photo of an existing paper exam.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                        2
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Students Take Exams</h3>
                      <p className="mt-2 text-gray-600">
                        Students access available exams through their dashboard, complete them within the specified time limit,
                        and submit their answers.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                        3
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">AI Detection Analysis</h3>
                      <p className="mt-2 text-gray-600">
                        For essay questions, our AI detection system analyzes student responses to identify potentially
                        AI-generated content, providing professors with insights.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                        4
                      </div>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">Review and Grading</h3>
                      <p className="mt-2 text-gray-600">
                        Professors review submissions, consider AI detection results, and assign grades that are then available
                        for students to view on their dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* About the Team */}
          <div className="mt-12 mb-16">
            <h2 className="text-2xl font-medium text-gray-900 mb-6">About the Team</h2>
            <Card>
              <CardHeader>
                <CardTitle>Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  ExamSmart was developed by a team of education technology experts and AI specialists 
                  committed to enhancing academic integrity in the digital age. Our mission is to provide 
                  educational institutions with tools that streamline the examination process while 
                  safeguarding against the challenges posed by AI-generated content.
                </p>
                <p className="mt-4 text-gray-600">
                  We believe in the power of technology to improve education, but also recognize the 
                  importance of maintaining academic standards. ExamSmart represents our commitment to 
                  supporting both educators and students in this evolving landscape.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// Feature card component
function FeatureCard({ 
  title, 
  description, 
  icon 
}: { 
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            {icon}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}