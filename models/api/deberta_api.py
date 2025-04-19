from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import numpy as np
import logging
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Content Detection API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and tokenizer
try:
    MODEL_NAME = "OU-Advacheck/deberta-v3-base-daigenc-mgt1a"
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
    logger.info("Model and tokenizer loaded successfully")
except Exception as e:
    logger.error(f"Error loading model: {str(e)}")
    raise

class TextRequest(BaseModel):
    text: str

class DetectionResponse(BaseModel):
    classification: str
    confidence: str
    confidence_score: float
    ai_probability: float
    human_probability: float

@app.get("/")
async def root():
    return {"message": "Content Detection API is running"}

@app.post("/detect", response_model=DetectionResponse)
async def detect_content(request: TextRequest):
    try:
        # Constants
        AI_THRESHOLD = 50.0  # threshold for AI classification

        # Tokenize and get model output
        inputs = tokenizer([request.text], padding=True, truncation=True, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits.numpy()
            probabilities = np.exp(logits) / np.sum(np.exp(logits), axis=1, keepdims=True)

        human_prob, ai_prob = probabilities[0]
        human_percentage = human_prob * 100
        ai_percentage = ai_prob * 100
        
        # Calculate percentage difference and determine confidence
        percentage_diff = abs(ai_percentage - human_percentage)
        
        if percentage_diff <= 40:
            confidence = "Low"
        elif percentage_diff <= 70:
            confidence = "Medium"
        else:
            confidence = "High"

        # Classification logic
        label = "AI" if ai_percentage >= AI_THRESHOLD else "Human"

        if confidence == "Low":
            label = "Uncertain but it is likely to be" + " " + label

        return DetectionResponse(
            classification=label,
            confidence=confidence,
            confidence_score=float(percentage_diff),  # Use actual difference as score
            ai_probability=float(ai_percentage),
            human_probability=float(human_percentage)
        )
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def start():
    """Launched with `poetry run start` at root level"""
    uvicorn.run(
        "models.api.deberta_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    start()
