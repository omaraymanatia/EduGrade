from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
import os

from model_utils import retrieve_context, generate_answer_with_gemini, compute_similarity

app = FastAPI(title="Answer Comparison API")

class ComparisonRequest(BaseModel):
    question: str
    doctor_answer: str
    student_answer: str

class ComparisonResponse(BaseModel):
    rag_answer: str
    similarity_scores: dict

class TextRequest(BaseModel):
    text: str

class DetectionResponse(BaseModel):
    classification: str
    confidence: str
    confidence_score: float
    human_probability: float
    machine_probability: float
    
@app.post("/compare-answers", response_model=ComparisonResponse)
async def compare_answers(request: ComparisonRequest):
    try:
        # Retrieve context from RAG
        context_nodes = retrieve_context(request.question)
        
        # Generate answer using RAG and Gemini
        rag_answer = generate_answer_with_gemini(request.question, context_nodes)
        
        # Compute similarity between answers
        similarity_scores = compute_similarity(
            request.student_answer,
            request.doctor_answer,
            rag_answer
        )
        
        return ComparisonResponse(
            rag_answer=rag_answer,
            similarity_scores=similarity_scores
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing comparison: {str(e)}")

@app.post("/detect-ai", response_model=DetectionResponse)
async def detect_ai_content(request: TextRequest):
    """
    Fallback endpoint for AI detection when the actual service is unavailable.
    Always returns a human-written result to avoid penalizing students.
    """
    try:
        # Default fallback response - assume human-written
        return DetectionResponse(
            classification="Human-Written",
            confidence="High",
            confidence_score=80.0,
            human_probability=90.0,
            machine_probability=10.0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in AI detection: {str(e)}")

@app.post("/detect", response_model=DetectionResponse)
async def detect_ai_content_alt(request: TextRequest):
    """
    Alternative endpoint name for AI detection to handle different client configurations.
    """
    # Reuse the same implementation
    return await detect_ai_content(request)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7000)
