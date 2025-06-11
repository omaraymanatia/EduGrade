from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uvicorn
from test import ExamProcessor
import io
from PIL import Image

app = FastAPI(
    title="Exam VLM Processor API",
    description="API for processing exam images using Qwen VLM model"
)

# Initialize the model at startup
processor = ExamProcessor()

class ExamMetadata(BaseModel):
    title: Optional[str] = None
    courseCode: Optional[str] = None
    institution: Optional[str] = None
    faculty: Optional[str] = None
    level: Optional[str] = None
    major: Optional[str] = None
    date: Optional[str] = None
    duration: Optional[int] = None
    totalMarks: Optional[int] = None
    passingScore: Optional[int] = None
    examiner: Optional[str] = None

@app.post("/process-exam")
async def process_exam(
    file: UploadFile = File(...),
    metadata: Optional[Dict[str, Any]] = None
):
    try:
        # Read and validate image
        image_content = await file.read()
        image = Image.open(io.BytesIO(image_content))
        
        # Process the exam
        exam_data = processor.process_exam_image(image, metadata)
        
        return JSONResponse(
            content=exam_data,
            status_code=200
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
