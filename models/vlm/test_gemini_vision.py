import pathlib
import textwrap
import google.generativeai as genai
from PIL import Image
from typing import Dict, List
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Google API
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

def load_image(image_path: str) -> Image.Image:
    """Load an image from path."""
    return Image.open(image_path)

def get_gemini_response(image: Image.Image) -> str:
    """Get response from Gemini for the image."""
    model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17')
    
    prompt = """
    Analyze this exam image and extract all questions and answers in order.
    Provide answers exactly as written (A, B, C, etc for MCQ or the exact text for written answers).
    Format your response as follows:
    Question 1: [question text in lowercase]
    Answer 1: [answer text in lowercase]
    
    Question 2: [question text in lowercase]
    Answer 2: [answer text in lowercase]
    
    Include all questions in order. Keep all text lowercase.
    """
    
    response = model.generate_content([prompt, image])
    return response.text.lower()  # Normalize case

def parse_gemini_response(response: str) -> List[Dict]:
    """Parse Gemini's response into structured format."""
    lines = response.strip().split('\n')
    questions = []
    current_question = {}
    
    for line in lines:
        line = line.lower().strip()  # Normalize case
        if line.startswith('question'):
            if current_question:
                questions.append(current_question)
            current_question = {'text': line.split(':', 1)[1].strip()}
        elif line.startswith('answer'):
            current_question['answer'] = line.split(':', 1)[1].strip()
    
    if current_question:
        questions.append(current_question)
    
    return questions

def compare_answers(teacher_answers: List[Dict], student_answers: List[Dict]) -> List[bool]:
    """Compare answers in order, returns list of correct/incorrect."""
    return [
        t['answer'].lower() == s['answer'].lower()
        for t, s in zip(teacher_answers, student_answers)
    ]

def main():
    # Test with a sample image
    image_path = "test_images/sample_exam.png"  # Update this path
    
    try:
        # Load and process image
        image = load_image(image_path)
        
        # Get response from Gemini
        response = get_gemini_response(image)
        print("Raw Gemini Response:")
        print("-" * 50)
        print(response)
        print("-" * 50)
        
        # Parse structured data
        questions = parse_gemini_response(response)
        
        print("\nStructured Output:")
        print("-" * 50)
        for i, q in enumerate(questions, 1):
            print(f"Question {i}:")
            print(f"Text: {q['text']}")
            print(f"Answer: {q['answer']}")
            print()
            
    except Exception as e:
        print(f"Error processing image: {str(e)}")

if __name__ == "__main__":
    main()
