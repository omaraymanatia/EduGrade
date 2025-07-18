from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import sys
import os
from pathlib import Path
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.append(str(project_root))
from models.vlm.gemini.exam_processor import ExamProcessor

# Verify API key is present
if not os.getenv('GOOGLE_API_KEY'):
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please set it in .env file")

# Create router instead of app
router = APIRouter(prefix="/teacher", tags=["teacher"])
processor = ExamProcessor()

@router.post("/process-exam/")
async def process_exam(file: UploadFile = File(...)):
    """Process teacher's exam and extract structure"""
    try:
        # Create temp directory if it doesn't exist
        temp_dir = Path("temp_uploads")
        temp_dir.mkdir(exist_ok=True)
        
        # Save uploaded file temporarily
        file_path = temp_dir / file.filename
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"Processing exam from file: {file_path}")
        
        # Process the exam
        result = processor.process_teacher_exam(str(file_path))
        
        # Ensure the result has the expected structure
        if not isinstance(result, dict):
            result = {
                "title": "Extracted Exam",
                "questions": []
            }
            
        # Clean up
        os.remove(file_path)
        
        logger.info(f"Exam processed successfully, returning {len(result.get('questions', []))} questions")
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Error processing exam: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}