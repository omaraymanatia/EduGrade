import tensorflow as tf
from transformers import TFAutoModel, AutoTokenizer
import numpy as np
import os

# Suppress GPU errors if CUDA is not properly set up
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
try:
    # Use GPU if available
    physical_devices = tf.config.list_physical_devices('GPU')
    if len(physical_devices) > 0:
        tf.config.experimental.set_memory_growth(physical_devices[0], True)
except:
    print("No GPU found. Using CPU instead.")

# Initialize BERT base model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
base_model = TFAutoModel.from_pretrained("bert-base-uncased")

# Create the same model architecture as used in training
class BERTForClassification(tf.keras.Model):
    def __init__(self, bert_model, num_classes):
        super().__init__()
        self.bert = bert_model
        self.fc = tf.keras.layers.Dense(num_classes, activation='softmax')
    
    def call(self, inputs):
        x = self.bert(inputs)[1]
        return self.fc(x)

# Initialize and build the model
classifier = BERTForClassification(base_model, num_classes=2)

# Create dummy input to build the model
dummy_input = {
    'input_ids': tf.ones((1, 256), dtype=tf.int32),
    'attention_mask': tf.ones((1, 256), dtype=tf.int32),
    'token_type_ids': tf.zeros((1, 256), dtype=tf.int32)
}

# Call the model once to build it
_ = classifier(dummy_input)

# Set the correct model path
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'bert-fine-tuned.h5')

# Now load the weights with better error handling
try:
    if not os.path.exists(MODEL_PATH):
        print(f"Error: Model file not found at {MODEL_PATH}")
        exit(1)
    
    classifier.load_weights(MODEL_PATH)
    print(f"Model weights loaded successfully from {MODEL_PATH}")
except Exception as e:
    print(f"Error loading model weights: {str(e)}")
    print(f"Attempted to load from: {MODEL_PATH}")
    exit(1)

def predict_text(text):
    # Clean and preprocess the text
    text = text.strip()
    
    # Tokenize with proper truncation
    inputs = tokenizer(
        text,
        padding='max_length',
        truncation=True,
        max_length=256,
        return_tensors="tf"
    )
    
    # Make prediction
    prediction = classifier(inputs)
    probabilities = tf.nn.softmax(prediction, axis=1).numpy()[0]
    predicted_class = tf.argmax(prediction, axis=1).numpy()[0]
    
    # Apply confidence thresholding
    confidence = probabilities[predicted_class]
    if confidence < 0.6:  # Threshold for more confident predictions
        # If confidence is low, return the class with higher probability
        predicted_class = 1 if probabilities[1] > probabilities[0] else 0
    
    return predicted_class, probabilities

# Test examples with clear AI vs Human characteristics
test_texts = [
    # AI Generated 
    """ChatGPT is a large language model developed by OpenAI that can engage in conversational interactions. It uses advanced natural language processing techniques to understand and generate human-like text responses. The model was trained on a vast amount of text data and can assist with various tasks including writing, answering questions, and providing explanations.""",
    
    # Human Written 
    """data science is a very wiedly known tech field that is very popular in tech. it contains a lot of tools and skills such as data analysis, python programming, Databases, BI tools, machine learning, deep learning (neural networks, NLP, CV, Transformers). data science is very huge field that you cannot have an estimated time to finish it because every single day a new model is released which could make a big difference in the field""",
    
    # AI Generated
    """Machine learning algorithms can be classified into three main categories: supervised learning, unsupervised learning, and reinforcement learning. Each type serves different purposes and utilizes distinct methodologies to process and learn from data.""",

]

print("Testing the model with example texts:\n")
for text in test_texts:
    pred_class, probabilities = predict_text(text)
    print(f"Text: {text[:100]}...")  # Show first 100 chars for brevity
    print(f"Predicted class: {'AI Generated' if pred_class == 1 else 'Human Written'}")
    print(f"Confidence Scores:")
    print(f"Human: {probabilities[0]:.2%}")
    print(f"AI: {probabilities[1]:.2%}\n")
    print("-" * 80 + "\n")
