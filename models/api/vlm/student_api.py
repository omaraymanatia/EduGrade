from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.responses import JSONResponse
import sys
import os
from pathlib import Path
from typing import Dict

# Add models directory to Python path
sys.path.append(str(Path(__file__).parent.parent))
from models.vlm.gemini.exam_processor import ExamProcessor

app = FastAPI(title="Student Answer Processing API")
processor = ExamProcessor()

@app.post("/process-answers/")
async def process_answers(
    file: UploadFile = File(...),
    exam_structure: Dict = Body(...)
):
    """Process student's answer sheet"""
    try:
        # Create temp directory if it doesn't exist
        temp_dir = Path("temp_uploads")
        temp_dir.mkdir(exist_ok=True)
        
        # Save uploaded file temporarily
        file_path = temp_dir / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Process student answers
        result = processor.process_student_answers(str(file_path), exam_structure)
        
        # Clean up
        os.remove(file_path)
        
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
