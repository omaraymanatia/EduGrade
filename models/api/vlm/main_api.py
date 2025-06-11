from fastapi import FastAPI
import uvicorn
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.append(str(project_root))

# Import routers
from models.api.vlm.teacher_api import router as teacher_router
from models.api.vlm.student_api import router as student_router

app = FastAPI(title="AI Grader API")

# Include routers
app.include_router(teacher_router)
app.include_router(student_router)

@app.get("/health")
async def health_check():
    """Main API health check endpoint"""
    return {"status": "healthy", "message": "AI Grader API is running"}

def main():
    """Run the API server"""
    server = uvicorn.Server(
        config=uvicorn.Config(
            "models.api.vlm.main_api:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_dirs=[str(project_root)]
        )
    )
    server.run()

# Run the server when the script is executed directly
if __name__ == "__main__":
    main()
