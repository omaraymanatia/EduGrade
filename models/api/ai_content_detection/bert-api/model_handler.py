import tensorflow as tf
from transformers import TFAutoModel, AutoTokenizer
import os
import sys

class BertModelHandler:
    def __init__(self):
        self.model_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 
                                      'content detection', 'bert', 'bert-fine-tuned.h5')
        self.tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
        self.base_model = TFAutoModel.from_pretrained("bert-base-uncased")
        self.model = self._load_model()

    def _create_model(self):
        class BERTForClassification(tf.keras.Model):
            def __init__(self, bert_model, num_classes):
                super().__init__()
                self.bert = bert_model
                self.fc = tf.keras.layers.Dense(num_classes, activation='softmax')
            
            def call(self, inputs):
                x = self.bert(inputs)[1]
                return self.fc(x)
        
        return BERTForClassification(self.base_model, num_classes=2)

    def _load_model(self):
        classifier = self._create_model()
        dummy_input = {
            'input_ids': tf.ones((1, 256), dtype=tf.int32),
            'attention_mask': tf.ones((1, 256), dtype=tf.int32),
            'token_type_ids': tf.zeros((1, 256), dtype=tf.int32)
        }
        _ = classifier(dummy_input)
        
        try:
            classifier.load_weights(self.model_path)
            print("Model loaded successfully")
            return classifier
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            sys.exit(1)

    def predict(self, text):
        text = text.strip()
        inputs = self.tokenizer(
            text,
            padding='max_length',
            truncation=True,
            max_length=256,
            return_tensors="tf"
        )
        
        prediction = self.model(inputs)
        probabilities = tf.nn.softmax(prediction, axis=1).numpy()[0]
        predicted_class = tf.argmax(prediction, axis=1).numpy()[0]
        
        if probabilities[predicted_class] < 0.6:
            predicted_class = 1 if probabilities[1] > probabilities[0] else 0
        
        return {
            "class": "AI Generated" if predicted_class == 1 else "Human Written",
            "human_probability": float(probabilities[0]),
            "ai_probability": float(probabilities[1])
        }
