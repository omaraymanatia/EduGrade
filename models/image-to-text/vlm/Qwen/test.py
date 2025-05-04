from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
import torch
import json
import requests
from PIL import Image
import io
import os

class ExamProcessor:
    def __init__(self):
        # Initialize the model and processor
        self.model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            "Qwen/Qwen2.5-VL-7B-Instruct",
            torch_dtype=torch.bfloat16,
            device_map="auto"
        )
        self.processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct")
        
        # System prompt with detailed instructions
        self.system_prompt = """"Convert the provided exam content into a strict JSON matching the specified SQL schema. Follow these rules:

1. **For MCQs (True/False or Multiple Choice):**  
   - Map all options with `isCorrect: false` by default (never answer for the student).  
   - If the question includes a pre-selected answer, mark `isCorrect: true` for that option.  
   - If no answer is provided, leave `options` as an empty list.  

2. **Question Types:**  
   - `mcq`: For True/False or multiple-choice questions.  
   - `essay`: For open-ended questions (no options).  

3. **Required JSON Structure:**  
```json
{
  "exam": {
    "title": "[Exam Title]",
    "courseCode": "[Course Code]",
    "institution": "[Institution Name]",
    "faculty": "[Faculty Name]",
    "level": "[Academic Level]",
    "major": "[Major/Field]",
    "date": "[Exam Date]",
    "duration": [Duration in Minutes],
    "totalMarks": [Total Marks],
    "passingScore": [Passing Threshold],
    "examiner": "[Examiner Name]",
    "instructions": "Answer the following questions according to your study",
    "questions": [
      {
        "id": 1,
        "text": "Google File System (GFS) is designed for small data-intensive applications.",
        "type": "mcq",
        "points": 1,
        "order": 1,
        "options": [
          { "text": "True", "isCorrect": false, "order": 1 },
          { "text": "False", "isCorrect": false, "order": 2 }
        ]
      },
      ...
      {
        "id": 14,
        "text": "If you have six processes from D1 to D2, apply (ring algorithm) to detect the coordinator of the ring, known that D1 discovers that the coordinator D2 is dead, but will start election (you must draw each step with brief description).",
        "type": "essay",
        "points": 1,
        "order": 14,
        "options": []
      }
      ... 
    ]
  }
}"""

    def load_image(self, image_path):
        """Load image from file path or URL"""
        if image_path.startswith('http'):
            response = requests.get(image_path)
            image = Image.open(io.BytesIO(response.content))
        else:
            image = Image.open(image_path)
        return image

    def process_exam(self, image_path, metadata=None):
        """Process an exam image and return structured JSON"""
        # Load the image
        image = self.load_image(image_path)
        
        # Prepare the prompt
        user_prompt = """Convert this exam paper into JSON format following the exact schema provided. 
        Extract all questions and their details including:
        - Question text
        - Question type (mcq or essay)
        - Points value
        - For MCQs: all options (mark correct ones if indicated)
        - Maintain original question order
        
        Include any exam metadata you can identify from the header."""
        
        # Create messages
        messages = [
            {"role": "system", "content": self.system_prompt},
            {
                "role": "user", 
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": user_prompt}
                ]
            }
        ]
        
        # Process the input
        text = self.processor.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = self.processor(
            text=[text],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt"
        ).to("cuda")
        
        # Generate output
        generated_ids = self.model.generate(
            **inputs,
            max_new_tokens=2048,
            pad_token_id=self.processor.tokenizer.eos_token_id
        )
        
        # Decode and clean the output
        generated_ids_trimmed = [
            out_ids[len(in_ids):] 
            for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        output_text = self.processor.batch_decode(
            generated_ids_trimmed, 
            skip_special_tokens=True, 
            clean_up_tokenization_spaces=False
        )[0]
        
        # Try to extract JSON from the output
        try:
            # Sometimes the model adds text before/after the JSON
            json_start = output_text.find('{')
            json_end = output_text.rfind('}') + 1
            json_str = output_text[json_start:json_end]
            
            exam_data = json.loads(json_str)
            
            # Apply any provided metadata
            if metadata:
                exam_data['exam'].update(metadata)
                
            return exam_data
        except json.JSONDecodeError as e:
            print("Failed to parse JSON output:")
            print(output_text)
            raise e

    def save_to_file(self, data, output_path):
        """Save the extracted data to a JSON file"""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Exam data saved to {output_path}")



######################## Example Usage ########################
if __name__ == "__main__":
    # Initialize the processor
    processor = ExamProcessor()
    
    # Example metadata (can be empty if you want the model to extract everything)
    metadata = {
        "title": "Computer Science Final Exam",
        "courseCode": "CS401",
        "institution": "University of Technology",
        "level": "Undergraduate",
        "date": "2024-05-15",
        "duration": 120,
        "totalMarks": 100,
        "passingScore": 50
    }
    
    # Process an exam image (can be file path or URL)
    exam_image_path = "/kaggle/input/exams-images/best.png"  # or "https://example.com/exam.jpg"
    
    try:
        # Process the exam
        exam_data = processor.process_exam(exam_image_path, metadata)
        
        # Save to file
        output_file = "exam_data.json"
        processor.save_to_file(exam_data, output_file)
        
        print("Exam processing completed successfully!")
    except Exception as e:
        print(f"Error processing exam: {e}")
