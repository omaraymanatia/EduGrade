import logging
from exam_processor import ExamProcessor
import json
from pathlib import Path
import time
import os

# Configure more verbose logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def display_result(title: str, data: any):
    print("\n" + "="*80)
    print(f"🔍 {title}")
    print("="*80)
    if isinstance(data, dict):
        print(json.dumps(data, indent=2, ensure_ascii=False))
    else:
        print(data)
    print("="*80 + "\n")

def test_teacher_exam():
    print("\n🚀 Starting Teacher Exam Test")
    processor = ExamProcessor()
    
    # Create test directory if it doesn't exist
    Path("test_images").mkdir(exist_ok=True)
    
    # Create a sample test image with some text for testing
    test_image_path = "F:\Graduation Project\Grad-Project\models\image-to-text\exams\deep\deep1.jpg"
    if not Path(test_image_path).exists():
        # Create a simple test image using PIL
        from PIL import Image, ImageDraw, ImageFont
        img = Image.new('RGB', (800, 600), color='white')
        d = ImageDraw.Draw(img)
        d.text((10,10), "Math Quiz\nQ1: What is 2+2?\nA) 3\nB) 4\nC) 5", fill='black')
        img.save(test_image_path)
        print(f"Created sample test image: {test_image_path}")
    
    try:
        print(f"\n📷 Processing image: {test_image_path}")
        start_time = time.time()
        
        # Get raw model response
        print("\n🤖 Getting raw model response...")
        response = processor.model.generate_content([
            "Describe what you see in this exam image",
            processor._load_image(test_image_path)
        ])
        display_result("Raw Model Response", response.text)
        
        # Process exam
        print("\n🔄 Processing exam structure...")
        result = processor.process_teacher_exam(test_image_path)
        process_time = time.time() - start_time
        
        print(f"⏱️  Processing took {process_time:.2f} seconds")
        display_result("Processed Exam Structure", result)
        
        # Validate structure
        print("\n✅ Validation Checks:")
        for key in ['title', 'courseCode', 'questions']:
            print(f"  {'✓' if key in result else '✗'} {key}")
            
    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}", exc_info=True)
        raise

def test_student_answers():
    print("\n🚀 Starting Student Answers Test")
    processor = ExamProcessor()
    
    # Create sample student answer sheet
    test_image_path = "test_images/sample_answer.png"
    if not Path(test_image_path).exists():
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (800, 600), color='white')
        d = ImageDraw.Draw(img)
        d.text((10,10), "Student Answer Sheet\nQ1: B) 4", fill='black')
        img.save(test_image_path)
        print(f"Created sample answer sheet: {test_image_path}")
    
    exam_structure = {
        "questions": [
            {
                "text": "What is 2+2?",
                "type": "MCQ",
                "options": [
                    {"text": "3", "isCorrect": False},
                    {"text": "4", "isCorrect": True},
                    {"text": "5", "isCorrect": False}
                ]
            }
        ]
    }
    
    try:
        print(f"\n📝 Processing student answers...")
        result = processor.process_student_answers(test_image_path, exam_structure)
        display_result("Student Answer Processing Result", result)
        
    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}", exc_info=True)
        raise

if __name__ == "__main__":
    print("🔬 Running VLM Exam Processing Tests with Debug Output")
    test_teacher_exam()
    test_student_answers()
