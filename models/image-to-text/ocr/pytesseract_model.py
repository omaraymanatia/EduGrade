import pytesseract
from PIL import Image
import cv2
import numpy as np

# Set path to Tesseract executable if not in PATH (Windows example)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Load image
image_path = r"F:\Graduation Project\repo\Grad-Project\models\image-to-text\exams\test.jpg"
image = Image.open(image_path)

# Preprocessing for better OCR (convert to grayscale and threshold)
def preprocess_image(img):
    # Convert to OpenCV format
    img_cv = np.array(img)
    
    # Convert to grayscale
    gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
    
    # Thresholding (binarization)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY_INV)
    
    # Optional: Denoising
    denoised = cv2.fastNlMeansDenoising(thresh, h=10)
    
    return Image.fromarray(denoised)

# Preprocess the image
processed_image = preprocess_image(image)

# Extract text with custom config
custom_config = r'--oem 3 --psm 6'  # OEM 3 = default engine, PSM 6 = assume uniform block
text = pytesseract.image_to_string(processed_image, config=custom_config)

print("Extracted Text:")
print("="*50)
print(text.strip())
print("="*50)