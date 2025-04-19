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
        THRESHOLD = 0.60
        MIN_DIFFERENCE = 0.10

        # Tokenize and get model output
        inputs = tokenizer([request.text], padding=True, truncation=True, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model(**inputs)
            probabilities = torch.sigmoid(outputs.logits).numpy()

        human_prob, ai_prob = probabilities[0]
        prob_difference = abs(human_prob - ai_prob)

        # Classification logic
        if prob_difference >= MIN_DIFFERENCE:
            if ai_prob > human_prob and ai_prob > THRESHOLD:
                label = "AI"
                confidence = "High"
            elif human_prob > ai_prob and human_prob > THRESHOLD:
                label = "Human"
                confidence = "High"
            else:
                label = "AI" if ai_prob > human_prob else "Human"
                confidence = "Medium"
        else:
            if max(ai_prob, human_prob) > THRESHOLD:
                label = "AI" if ai_prob > human_prob else "Human"
                confidence = "Low"
            else:
                label = "Uncertain"
                confidence = "Very Low"

        confidence_score = (prob_difference / max(ai_prob, human_prob)) * 100

        if confidence in ['Low', 'Very Low']:
            if label == 'AI':
                label = 'Human'
                confidence = 'Medium'
            else:
                label = 'AI'
                confidence = 'Medium'

        return DetectionResponse(
            classification=label,
            confidence=confidence,
            confidence_score=float(confidence_score),
            ai_probability=float(ai_prob * 100),
            human_probability=float(human_prob * 100)
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
