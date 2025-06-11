import google.generativeai as genai
from PIL import Image
import logging
import json
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ExamProcessor:
    def __init__(self):
        load_dotenv()
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17')
        logger.info("ExamProcessor initialized with Gemini model")

    def _load_image(self, image_path: str) -> Image.Image:
        logger.info(f"Loading image from: {image_path}")
        try:
            image = Image.open(image_path)
            logger.info(f"Image loaded successfully. Size: {image.size}, Mode: {image.mode}")
            return image
        except Exception as e:
            logger.error(f"Failed to load image: {str(e)}")
            raise

    def process_teacher_exam(self, image_path: str) -> Dict:
        """Process teacher's exam paper to create exam structure"""
        print(f"\n📄 Processing teacher exam from: {image_path}")
        image = self._load_image(image_path)
        
        prompt = """
        Analyze this exam paper and extract the following information in a structured format:
        1. Title of the exam (if any)
        2. Subject (if any)
        3. Year (if any)
        4. Course code (if any)
        5. Instructions (if any)
        6. Duration (in minutes)
        7. Questions with:
           - Question text
           - Type (MCQ/Essay)
           - Points (default 1 if not specified)
           - Correct answer(s)
           - Options (for MCQ)
        
        Format as JSON:
        {
            "title": "Untitled Exam",
            "courseCode": "NONE",
            "subject": "NONE",
            "year": "NONE",
            "semester": "NONE",
            "instructions": "",
            "duration": 60,
            "questions": [
                {
                    "text": "",
                    "type": "",
                    "points": 1,
                    "modelAnswer": "",
                    "options": [
                        {"text": "", "isCorrect": false}
                    ]
                }
            ]
        }
        Ensure all field names exactly match the format above.
        """
        
        print("🔍 Analyzing image with Gemini...")
        logger.info("Sending prompt to Gemini for teacher exam")
        try:
            response = self.model.generate_content([prompt, image])
            print(f"📊 Raw response length: {len(response.text)} characters")
            logger.info("Received response from Gemini")
            logger.debug(f"Raw response: {response.text}")
            
            parsed_response = self._parse_json_response(response.text)
            print("✅ Successfully parsed response")
            logger.info("Successfully parsed response")
            logger.debug(f"Parsed structure: {json.dumps(parsed_response, indent=2)}")
            return parsed_response
            
        except Exception as e:
            logger.error(f"Error processing teacher exam: {str(e)}")
            raise

    def process_student_answers(self, image_path: str, exam_structure: Dict) -> Dict:
        """Process student's answer sheet"""
        image = self._load_image(image_path)
        
        prompt = """
        Extract student answers from this answer sheet.
        List answers in order, one per line.
        If a question is not answered, mark it as 'NA'.
        Format as JSON:
        {
            "answers": [
                {
                    "answer": "text of selected answer or written response in lowercase, or NA if not answered"
                }
            ]
        }
        Keep all text lowercase.
        Ensure every question has an answer entry, even if it's NA.
        """
        
        response = self.model.generate_content([prompt, image])
        result = self._parse_json_response(response.text.lower())
        
        # Ensure we have answers for all questions, fill with "na" if missing
        expected_answers = len(exam_structure.get("questions", []))
        current_answers = len(result.get("answers", []))
        
        if current_answers < expected_answers:
            result["answers"].extend([{"answer": "na"} for _ in range(expected_answers - current_answers)])
            
        return result

    def get_raw_response(self, image_path: str, is_student: bool = False) -> str:
        """Get raw response from Gemini model for debugging"""
        image = self._load_image(image_path)
        prompt = self._get_student_prompt if is_student else self._get_teacher_prompt
        response = self.model.generate_content([prompt, image])
        return response.text

    def _get_teacher_prompt(self):
        return """
        Analyze this exam paper and extract the following information in a structured format:
        1. Title of the exam (if any)
        2. Subject (if any)
        3. Year (if any)
        4. Course code (if any)
        5. Instructions (if any)
        6. Duration (in minutes)
        7. Questions with:
           - Question text
           - Type (MCQ/Essay)
           - Points (default 1 if not specified)
           - Correct answer(s)
           - Options (for MCQ)
        
        Format as JSON:
        {
            "title": "Untitled Exam",
            "courseCode": "NONE",
            "subject": "NONE",
            "year": "NONE",
            "semester": "NONE",
            "instructions": "",
            "duration": 60,
            "questions": [
                {
                    "text": "",
                    "type": "",
                    "points": 1,
                    "modelAnswer": "",
                    "options": [
                        {"text": "", "isCorrect": false}
                    ]
                }
            ]
        }
        Ensure all field names exactly match the format above.
        """
        
    def _get_student_prompt(self):
        return """
        Given this student's answer sheet, extract answers for the following exam:
        {exam_structure['questions']}
        
        Format as JSON:
        {{
            "answers": [
                {{
                    "questionId": 1,
                    "answer": "",
                    "selectedOption": null
                }}
            ]
        }}
        """

    def _parse_json_response(self, response: str) -> Dict:
        """Extract JSON from response and handle cleanup"""
        try:
            # Find JSON content between curly braces
            start = response.find('{')
            end = response.rfind('}') + 1
            json_str = response[start:end].lower()  # Normalize case
            parsed = json.loads(json_str)
            
            # Normalize field names and ensure required fields
            normalized = {
                "title": parsed.get("title", "Untitled Exam"),
                "subject": parsed.get("subject", "NONE").lower(),
                "year": parsed.get("year", "NONE").lower(),
                "courseCode": parsed.get("coursecode", "NONE").upper(),
                "instructions": parsed.get("instructions", ""),
                "duration": int(parsed.get("duration", 60)),
                "questions": []
            }
            
            # Normalize questions
            for q in parsed.get("questions", []):
                normalized_question = {
                    "text": q.get("text", "").strip(),
                    "type": q.get("type", "MCQ").upper(),
                    "points": int(q.get("points", 1)),
                    "modelAnswer": q.get("modelanswer", "").strip(),
                    "options": []
                }
                
                # Normalize options
                if "options" in q:
                    normalized_question["options"] = [
                        {
                            "text": opt.get("text", "").strip(),
                            "isCorrect": bool(opt.get("iscorrect", False))
                        }
                        for opt in q["options"]
                    ]
                
                normalized["questions"].append(normalized_question)
            
            return normalized
            
        except Exception as e:
            logger.error(f"JSON parsing error: {str(e)}")
            # Return a valid default structure
            return {
                "title": "Untitled Exam",
                "courseCode": "NONE",
                "instructions": "",
                "duration": 60,
                "questions": []
            }

    def compare_answers(self, teacher_answers: List[Dict], student_answers: List[Dict]) -> List[Dict]:
        """Compare answers and handle NA values"""
        results = []
        for i, (teacher, student) in enumerate(zip(teacher_answers, student_answers)):
            is_correct = False
            points_awarded = 0
            
            if student["answer"] != "na":  # Only evaluate if question was attempted
                is_correct = teacher["answer"].lower() == student["answer"].lower()
                points_awarded = teacher.get("points", 0) if is_correct else 0
            
            results.append({
                "question_number": i + 1,
                "attempted": student["answer"] != "na",
                "is_correct": is_correct,
                "points_awarded": points_awarded
            })
            
        return results
