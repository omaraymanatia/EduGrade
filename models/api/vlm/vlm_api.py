import os
import sys
# Add project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
sys.path.append(project_root)

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import logging
import tempfile
from models.vlm.exam_processor import ExamProcessor
from supabase import create_client, Client
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="VLM API",
    description="API for processing exam images using Vision Language Models",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize VLM processor
processor = ExamProcessor()

# Initialize Supabase client
load_dotenv()
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Pydantic models
class Option(BaseModel):
    text: str
    isCorrect: bool

class Question(BaseModel):
    text: str
    type: str
    points: int
    modelAnswer: Optional[str] = None
    options: Optional[List[Option]] = None

class ExamResponse(BaseModel):
    title: str
    courseCode: str
    instructions: Optional[str] = None
    duration: int
    questions: List[Question]

class StudentAnswer(BaseModel):
    answer: str

class StudentAnswersResponse(BaseModel):
    answers: List[StudentAnswer]

async def get_exam_structure(exam_id: int) -> Dict:
    """Fetch exam structure from database"""
    try:
        # Fetch exam details
        exam = supabase.table("exams").select("*").eq("id", exam_id).single().execute()
        
        # Fetch questions for this exam
        questions = supabase.table("questions").select(
            "*",
            "options(*)"
        ).eq("exam_id", exam_id).execute()
        
        # Format the exam structure
        exam_structure = {
            "title": exam.data["title"],
            "courseCode": exam.data["course_code"],
            "instructions": exam.data["instructions"],
            "duration": exam.data["duration"],
            "questions": []
        }
        
        for q in questions.data:
            question = {
                "text": q["text"],
                "type": q["type"],
                "points": q["points"],
                "modelAnswer": q["model_answer"],
                "options": [
                    {
                        "text": opt["text"],
                        "isCorrect": opt["is_correct"]
                    }
                    for opt in q["options"]
                ] if q["type"].lower() == "mcq" else []
            }
            exam_structure["questions"].append(question)
            
        return exam_structure
        
    except Exception as e:
        logger.error(f"Error fetching exam structure: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Exam not found: {exam_id}")

@app.post("/process-teacher-exam", response_model=ExamResponse)
async def process_teacher_exam(file: UploadFile = File(...)):
    """Process teacher's exam image and extract exam structure"""
    try:
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()

            logger.info(f"Processing teacher exam image: {file.filename}")
            result = processor.process_teacher_exam(temp_file.name)
            
            # Validate required fields
            if not result.get("questions"):
                raise ValueError("No questions detected in the image")
                
            return ExamResponse(**result)
            
    except Exception as e:
        logger.error(f"Error processing teacher exam: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process exam image: {str(e)}"
        )
    finally:
        if 'temp_file' in locals():
            os.unlink(temp_file.name)

@app.post("/process-student-answers/{exam_id}")
async def process_student_answers(
    exam_id: int,
    file: UploadFile = File(...)
):
    """Process student's answer sheet"""
    try:
        # Get exam structure from database
        exam_structure = await get_exam_structure(exam_id)
        
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_file.flush()
            
            logger.info(f"Processing student answers for exam {exam_id}")
            result = processor.process_student_answers(temp_file.name, exam_structure)
            os.unlink(temp_file.name)
            
            return result
            
    except Exception as e:
        logger.error(f"Error processing student answers: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """
    Health check endpoint
    """
    return {"status": "healthy", "model": "VLM API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
