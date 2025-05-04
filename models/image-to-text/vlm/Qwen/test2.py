import json
import requests
import os
from PIL import Image
import base64
from io import BytesIO

# Load API key from environment variable
API_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen1.5-1.8B-Instruct"
API_KEY = "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"  # Set this in your environment variables

if not API_KEY:
    raise ValueError("Please set your Hugging Face API key in the HF_API_KEY environment variable")

def encode_image_to_base64(image_path):
    """Convert image to base64 for API input"""
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")

def query_qwen_model(image_base64, prompt):
    """Send image and prompt to Qwen model"""
    headers = {"Authorization": f"Bearer {API_KEY}"}
    payload = {
        "inputs": {
            "image": image_base64,
            "question": prompt
        }
    }
    
    response = requests.post(API_URL, headers=headers, json=payload)
    
    if response.status_code != 200:
        raise Exception(f"API request failed with status {response.status_code}: {response.text}")
    
    return response.json()

def generate_exam_json(image_path):
    """Generate structured exam JSON from image"""
    try:
        image_base64 = encode_image_to_base64(image_path)
        
        prompt = """
        [Your prompt here...]
        """
        
        response = query_qwen_model(image_base64, prompt)
        
        # Handle different possible response formats
        if isinstance(response, list):
            # Try to extract generated text
            if "generated_text" in response[0]:
                exam_json = json.loads(response[0]["generated_text"])
            else:
                exam_json = response  # Return raw response for inspection
        else:
            exam_json = response
        
        return exam_json
    
    except Exception as e:
        return {"error": str(e)}

# Example Usage
if __name__ == "__main__":
    image_path = r"F:\Graduation Project\repo\Grad-Project\models\image-to-text\exams\deep\deep1.jpg"
    output_json = "exam_output.json"

    exam_data = generate_exam_json(image_path)
    
    with open(output_json, "w") as f:
        json.dump(exam_data, f, indent=2)

    print("Exam JSON generated successfully!")