# This script is a FastAPI application that serves a BERT model for AI content detection.
# It includes a health check endpoint and a prediction endpoint.
# The model is loaded at startup, and the server can be gracefully shut down using signals.
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from model_handler import BertModelHandler
import uvicorn
import sys
import signal

app = FastAPI(
    title="BERT AI Content Detection API",
    description="API for detecting AI-generated content using BERT",
    version="1.0.0"
)

# Initialize model handler
try:
    print("Loading BERT model...")
    model_handler = BertModelHandler()
    print("Model loaded successfully. Starting server...")
except Exception as e:
    print(f"Error loading model: {str(e)}")
    sys.exit(1)

class TextRequest(BaseModel):
    text: str

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model": "loaded"}

@app.post("/predict")
async def predict(request: TextRequest):
    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Empty text provided")
        
        result = model_handler.predict(request.text)
        return result
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def handle_shutdown(signum, frame):
    print("\nShutting down server gracefully...")
    sys.exit(0)

if __name__ == "__main__":
    # Register shutdown handlers
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)
    
    try:
        print("\nStarting BERT AI Content Detection API")
        print("======================================")
        print("Server will be available at: http://localhost:8000")
        print("API documentation at: http://localhost:8000/docs")
        print("Press Ctrl+C to stop the server")
        print("======================================\n")
        
        uvicorn.run(app, host="0.0.0.0", port=8000)
    except Exception as e:
        print(f"\nServer error: {str(e)}")
        sys.exit(1)
