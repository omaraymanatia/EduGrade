import torch
from transformers import Qwen2_5_VLForConditionalGeneration, AutoTokenizer, AutoProcessor
from qwen_vl_utils import process_vision_info
from huggingface_hub import login
from transformers import BitsAndBytesConfig
from PIL import Image
import os

quant_config = BitsAndBytesConfig(
    load_in_4bit=True,  # Use 4-bit quantization (smallest memory footprint)
    bnb_4bit_compute_dtype=torch.float16,
)

login(token="your-token-here")  # Replace with your Hugging Face token

model = Qwen2_5_VLForConditionalGeneration.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct",
    torch_dtype=torch.float16,
    device_map="auto")

processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct")


image = '/kaggle/input/exam-images/deep1.jpg'
prompt = """Convert the provided exam content into a strict JSON matching the specified SQL schema. Follow these rules:

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



# Create output directory if it doesn't exist
output_dir = '/kaggle/output'
os.makedirs(output_dir, exist_ok=True)

# Function to process image and generate JSON
def process_exam_image(image_path, question_prompt):
    messages = [{"role": "user", "content": [{"type": "image", "image": image_path}, {"type": "text", "text": question_prompt}]}]
    text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = processor(text=[text], images=image_inputs, videos=video_inputs, padding=True, return_tensors="pt")
    inputs = inputs.to("cuda")
    
    # Generate response without token limit constraint
    generated_ids = model.generate(**inputs, max_length=model.config.max_position_embeddings)
    
    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)
    
    return output_text[0]

# Process the image
result_text = process_exam_image(image, prompt)

import json
# Try to parse the result as JSON
try:
    # Strip any potential markdown code block formatting
    if "```json" in result_text:
        json_text = result_text.split("```json")[1].split("```")[0].strip()
    elif "```" in result_text:
        json_text = result_text.split("```")[1].strip()
    else:
        json_text = result_text.strip()
    
    # Parse to validate JSON structure
    result_json = json.loads(json_text)
    
    # Save to output file
    output_path = os.path.join(output_dir, 'exam_results.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result_json, f, ensure_ascii=False, indent=2)
    
    print(f"Successfully saved JSON output to {output_path}")
    
    # Print a preview of the JSON
    print("\nJSON Preview (first few questions):")
    questions = result_json.get('exam', {}).get('questions', [])
    preview_count = min(3, len(questions))
    preview = {
        "exam": {
            "title": result_json.get('exam', {}).get('title', ''),
            "questions": questions[:preview_count]
        }
    }
    print(json.dumps(preview, indent=2))
    print(f"\nTotal questions processed: {len(questions)}")
    
except json.JSONDecodeError as e:
    print(f"Error parsing JSON: {e}")
    print("Raw output (may not be valid JSON):")
    print(result_text)
    
    # Save the raw output anyway
    output_path = os.path.join(output_dir, 'exam_results_raw.txt')
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(result_text)
    print(f"Saved raw output to {output_path}")