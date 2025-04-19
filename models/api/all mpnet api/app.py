from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
import os

# Add parent directory to path to import model_utils
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(parent_dir)

from model_utils import retrieve_context, generate_answer_with_gemini, compute_similarity

app = FastAPI(title="Answer Comparison API")

class ComparisonRequest(BaseModel):
    question: str
    doctor_answer: str
    student_answer: str

class ComparisonResponse(BaseModel):
    rag_answer: str
    similarity_scores: dict
    
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

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
