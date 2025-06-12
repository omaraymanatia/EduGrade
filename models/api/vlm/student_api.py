from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import JSONResponse
import sys
import os
import logging
from pathlib import Path
from typing import Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.append(str(project_root))
from models.vlm.gemini.exam_processor import ExamProcessor

# Create router instead of app
router = APIRouter(prefix="/student", tags=["student"])
processor = ExamProcessor()

@router.post("/process-answers/")
async def process_answers(
    file: UploadFile = File(...),
    exam_id: int = Form(...)
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
        
        logger.info(f"Processing student answers for exam ID: {exam_id} from file: {file_path}")
        
        # Process student answers
        result = processor.process_student_answers(str(file_path), exam_id)
        
        # Clean up
        os.remove(file_path)
        
        logger.info(f"Student answers processed successfully")
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error processing student answers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check endpoint for student API"""
    return {"status": "healthy"}
