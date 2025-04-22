from model_handler import BertModelHandler
from typing import Union, List, Dict
import re

class AIContentDetector:
    def __init__(self):
        """Initialize the AI Content Detection API with BERT model."""
        self.model = BertModelHandler()
    
    def _preprocess_text(self, text: str) -> str:
        """Clean and validate input text."""
        if not text or not isinstance(text, str):
            raise ValueError("Input must be a non-empty string")
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Check minimum length (at least 20 characters)
        if len(text) < 20:
            raise ValueError("Text must be at least 20 characters long")
            
        return text
    
    def predict_text(self, text: Union[str, List[str]]) -> Union[Dict, List[Dict]]:
        """Predict whether text is AI-generated or human-written."""
        try:
            # Handle single text
            if isinstance(text, str):
                processed_text = self._preprocess_text(text)
                result = self.model.predict(processed_text)
                result["text"] = text[:100] + "..." if len(text) > 100 else text
                result["confidence"] = max(result["human_probability"], 
                                        result["ai_probability"])
                return result
            
            # Handle batch of texts
            elif isinstance(text, list):
                results = []
                for t in text:
                    processed = self._preprocess_text(t)
                    result = self.model.predict(processed)
                    result["text"] = t[:100] + "..." if len(t) > 100 else t
                    result["confidence"] = max(result["human_probability"], 
                                            result["ai_probability"])
                    results.append(result)
                return results
            
            else:
                raise ValueError("Input must be a string or list of strings")
                
        except Exception as e:
            raise Exception(f"Prediction error: {str(e)}")
