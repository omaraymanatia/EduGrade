from transformers import Qwen2_5_VLForConditionalGeneration, AutoTokenizer, AutoProcessor
from qwen_vl_utils import process_vision_info

# default: Load the model on the available device(s)
model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    "Qwen/Qwen2.5-VL-7B-Instruct", torch_dtype="auto", device_map="auto"
)

# We recommend enabling flash_attention_2 for better acceleration and memory saving, especially in multi-image and video scenarios.
# model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
#     "Qwen/Qwen2.5-VL-7B-Instruct",
#     torch_dtype=torch.bfloat16,
#     attn_implementation="flash_attention_2",
#     device_map="auto",
# )

# default processer
processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct")

# The default range for the number of visual tokens per image in the model is 4-16384.
# You can set min_pixels and max_pixels according to your needs, such as a token range of 256-1280, to balance performance and cost.
# min_pixels = 256*28*28
# max_pixels = 1280*28*28
# processor = AutoProcessor.from_pretrained("Qwen/Qwen2.5-VL-7B-Instruct", min_pixels=min_pixels, max_pixels=max_pixels)
prompt = """
"Convert the provided exam content into a strict JSON matching the specified SQL schema. Follow these rules:

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
}
"""
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "image",
                "image": "F:\Graduation Project\repo\Grad-Project\models\image-to-text\exams\deep\deep1.jpg",
            },
            {"type": "text", "text": prompt},
        ],
    }
]

# Preparation for inference
text = processor.apply_chat_template(
    messages, tokenize=False, add_generation_prompt=True
)
image_inputs, video_inputs = process_vision_info(messages)
inputs = processor(
    text=[text],
    images=image_inputs,
    videos=video_inputs,
    padding=True,
    return_tensors="pt",
)
inputs = inputs.to("cuda")

# Inference: Generation of the output
generated_ids = model.generate(**inputs, max_new_tokens=128)
generated_ids_trimmed = [
    out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
]
output_text = processor.batch_decode(
    generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
)
print(output_text)
