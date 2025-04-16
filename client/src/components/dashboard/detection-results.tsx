import { AiDetectionResult } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { CircleAlert, AlertCircle } from "lucide-react";

interface DetectionResultsProps {
  result: AiDetectionResult;
  text: string;
}

export function DetectionResults({ result, text }: DetectionResultsProps) {
  const getScoreIndicator = (score: number) => {
    if (score > 70) return { text: "High", color: "text-red-600" };
    if (score > 30) return { text: "Medium", color: "text-yellow-600" };
    return { text: "Low", color: "text-green-600" };
  };
  
  const aiScore = getScoreIndicator(result.score);
  
  return (
    <div className="mt-8" id="detection-results">
      <h4 className="text-md font-medium text-gray-900">Analysis Results</h4>
      <Card className="mt-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className={`text-lg font-bold ${result.score > 70 ? "text-red-600" : result.score > 30 ? "text-yellow-600" : "text-green-600"}`}>
                {result.score}% AI-Generated Text Detected
              </span>
              <p className="text-sm text-gray-500 mt-1">{result.confidence} confidence in this assessment</p>
            </div>
            <div className="flex items-center">
              {result.score > 70 ? (
                <AlertCircle className="h-10 w-10 text-red-500" />
              ) : result.score > 30 ? (
                <CircleAlert className="h-10 w-10 text-yellow-500" />
              ) : (
                <AlertCircle className="h-10 w-10 text-green-500" />
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Perplexity Score</span>
                <span className={result.perplexity < 20 ? "text-red-600" : result.perplexity < 40 ? "text-yellow-600" : "text-green-600"}>
                  {result.perplexity < 20 ? "Low" : result.perplexity < 40 ? "Medium" : "High"} ({result.perplexity.toFixed(1)})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={result.perplexity < 20 ? "bg-red-600" : result.perplexity < 40 ? "bg-yellow-600" : "bg-green-600"}
                  style={{ width: `${100 - (result.perplexity / 70 * 100)}%`, height: '100%', borderRadius: '9999px' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">AI text tends to have low perplexity (predictability)</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Burstiness</span>
                <span className={result.burstiness < 0.3 ? "text-red-600" : result.burstiness < 0.6 ? "text-yellow-600" : "text-green-600"}>
                  {result.burstiness < 0.3 ? "Low" : result.burstiness < 0.6 ? "Medium" : "High"} ({result.burstiness.toFixed(2)})
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={result.burstiness < 0.3 ? "bg-red-600" : result.burstiness < 0.6 ? "bg-yellow-600" : "bg-green-600"}
                  style={{ width: `${result.burstiness * 100}%`, height: '100%', borderRadius: '9999px' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Human text has more variance in sentence structure</p>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Pattern Recognition</span>
                <span className={result.patternScore > 7 ? "text-red-600" : result.patternScore > 4 ? "text-yellow-600" : "text-green-600"}>
                  {result.patternScore > 7 ? "High" : result.patternScore > 4 ? "Medium" : "Low"} AI Patterns
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={result.patternScore > 7 ? "bg-red-600" : result.patternScore > 4 ? "bg-yellow-600" : "bg-green-600"}
                  style={{ width: `${(result.patternScore / 10) * 100}%`, height: '100%', borderRadius: '9999px' }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Detected patterns common in AI-generated content</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-700">Highlighted sections show likely AI-generated content:</p>
            <div className="mt-2 text-sm overflow-auto max-h-40 p-2 bg-white rounded">
              {result.highlightedText ? (
                <div dangerouslySetInnerHTML={{ __html: result.highlightedText }} />
              ) : (
                <p className="py-1">{text}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
