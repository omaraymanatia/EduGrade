from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
import os
import numpy as np

from model_utils import (
    retrieve_context,
    generate_answer_with_gemini,
    compute_similarity,
)

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
            request.student_answer, request.doctor_answer, rag_answer
        )

        return ComparisonResponse(
            rag_answer=rag_answer, similarity_scores=similarity_scores
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing comparison: {str(e)}"
        )


@app.post("/detect-ai")
async def detect_ai_fallback(request: TextRequest):
    """Fallback AI detection if the main service is down"""
    try:
        # Very basic detection - just returns reasonable defaults
        # In a real implementation, you would use a simpler model here
        text_length = len(request.text)

        # Default to assuming human-written with high confidence for shorter texts
        if text_length < 100:
            human_prob = 95.0
            machine_prob = 5.0
        else:
            # For longer texts, be more conservative
            human_prob = 75.0
            machine_prob = 25.0

        return {
            "classification": "Human-Written",
            "confidence": "Medium",
            "confidence_score": abs(human_prob - machine_prob),
            "human_probability": human_prob,
            "machine_probability": machine_prob,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error in AI detection fallback: {str(e)}"
        )


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7000)
