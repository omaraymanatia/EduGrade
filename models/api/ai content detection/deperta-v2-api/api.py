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

app = FastAPI(title="MGT-Detection API")

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
    # Use the same model path as the original app
    MODEL_NAME = "ziadmostafa/MGT-Detection_deberta-base"
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
    human_probability: float
    machine_probability: float

@app.get("/")
async def root():
    return {"message": "MGT-Detection API is running"}

@app.post("/detect", response_model=DetectionResponse)
async def detect_content(request: TextRequest):
    try:
        # Constants
        MACHINE_THRESHOLD = 50.0  # threshold for machine-generated classification

        # Tokenize and get model output
        inputs = tokenizer([request.text], padding=True, truncation=True, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits.numpy()
            probabilities = np.exp(logits) / np.sum(np.exp(logits), axis=1, keepdims=True)

            # Map the output indices to their respective labels
            # IMPORTANT: Fixed the label order to match the original app
            # Original app mapping: TEXT_CLASS_MAPPING = {
            #    'LABEL_0': 'Human-Written',
            #    'LABEL_1': 'Human-Written, Machine-Polished'
            #    'LABEL_2': 'Machine-Generated',
            #    'LABEL_3': 'Machine-Written, Machine-Humanized'
            # }
            labels = [
                "Human-Written",                     # Index 0
                "Human-Written, Machine-Polished",   # Index 1
                "Machine-Generated",                 # Index 2
                "Machine-Written, Machine-Humanized" # Index 3
            ]
            
            # Extract only the required probabilities
            human_prob = probabilities[0, 0]  # Human-Written is at index 0
            machine_prob = probabilities[0, 2]  # Machine-Generated is at index 2

        human_percentage = human_prob * 100
        machine_percentage = machine_prob * 100
        
        # Calculate percentage difference and determine confidence
        percentage_diff = abs(machine_percentage - human_percentage)
        
        if percentage_diff <= 40:
            confidence = "Low"
        elif percentage_diff <= 70:
            confidence = "Medium"
        else:
            confidence = "High"

        # Classification logic
        label = "Machine-Generated" if machine_percentage >= MACHINE_THRESHOLD else "Human-Written"

        if confidence == "Low":
            label = "Uncertain but it is likely to be " + label

        return DetectionResponse(
            classification=label,
            confidence=confidence,
            confidence_score=float(percentage_diff),  # Use actual difference as score
            human_probability=float(human_percentage),
            machine_probability=float(machine_percentage)
        )
    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )