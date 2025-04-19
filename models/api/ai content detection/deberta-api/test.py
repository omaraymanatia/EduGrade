import requests
import time
import sys

def test_api():
    MAX_RETRIES = 100 # Maximum number of retries for connection errors
    RETRY_DELAY = 2 # Delay in seconds between retries

    text = " I love the new iPhone 15 Pro Max. It is the best phone I have ever used. The camera is amazing, and the battery life is incredible. I highly recommend it to anyone looking for a new phone."
    
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                "http://localhost:8000/detect",
                json={"text": text},
                timeout=10
            )
            response.raise_for_status()
            print("Detection Results:")
            print("-" * 40)
            result = response.json()
            print(f"Classification: {result['classification']}")
            print(f"Confidence: {result['confidence']}")
            print(f"AI Probability: {result['ai_probability']:.1f}%")
            print(f"Human Probability: {result['human_probability']:.1f}%")
            break
        except requests.exceptions.ConnectionError:
            if attempt < MAX_RETRIES - 1:
                print(f"Server not responding. Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
            else:
                print("Error: Could not connect to the server. Make sure it's running using start_server.py")
                sys.exit(1)
        except Exception as e:
            print(f"Error: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    test_api()