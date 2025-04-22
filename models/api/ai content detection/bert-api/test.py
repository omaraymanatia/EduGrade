import requests
import json
import sys
from requests.exceptions import ConnectionError

def check_server_status(url):
    try:
        requests.get(url)
        return True
    except:
        return False

def test_prediction(text):
    url = "http://localhost:8000/predict"
    
    # Check if server is running
    if not check_server_status("http://localhost:8000"):
        print("\nError: API server is not running!")
        print("Please start the server by running: python app.py")
        print("Make sure you're in the correct directory and the server is running on port 8000")
        sys.exit(1)
    
    try:
        response = requests.post(
            url,
            json={"text": text},
            timeout=10  # Add timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            print("\nPrediction Results:")
            print(f"Classification: {result['class']}")
            print(f"Human Probability: {result['human_probability']:.2%}")
            print(f"AI Probability: {result['ai_probability']:.2%}")
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            
    except ConnectionError:
        print("\nConnection Error: Could not connect to the API server")
        print("Please make sure:")
        print("1. The server is running (python app.py)")
        print("2. The server is accessible at localhost:8000")
        print("3. No firewall is blocking the connection")
    except Exception as e:
        print(f"\nError making request: {str(e)}")

if __name__ == "__main__":
    print("BERT AI Content Detection API Test Script")
    print("========================================")
    print("Checking server status...")
    
    # Test cases remain the same
    test_texts = [
        """ChatGPT is a large language model developed by OpenAI that can engage in 
        conversational interactions. It uses advanced natural language processing techniques.""",
        
        """data science is a very widely known tech field that is very popular in tech. 
        it contains a lot of tools and skills such as data analysis, python programming."""
    ]
    
    print("\nTesting API with example texts...")
    for text in test_texts:
        print("\n" + "="*50)
        print(f"Input text: {text[:100]}...")
        test_prediction(text)
