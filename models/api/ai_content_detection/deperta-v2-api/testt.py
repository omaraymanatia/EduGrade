import requests
import time
import sys

def test_api():
    MAX_RETRIES = 100  # Maximum number of retries for connection errors
    RETRY_DELAY = 2  # Delay in seconds between retries

    # Sample text to test the API

    text = "In today's rapidly evolving digital landscape, leveraging cutting-edge technologies is not just an option but a necessity for forward-thinking organizations. Data-driven insights empower businesses to make strategic decisions, optimize operations, and deliver enhanced value to stakeholders. As artificial intelligence and machine learning continue to transform industries, the integration of scalable, cloud-based solutions becomes a cornerstone of innovation and long-term growth. Embracing this paradigm shift enables companies to remain agile, competitive, and resilient in an increasingly complex global ecosystem."
    for attempt in range(MAX_RETRIES):
        try:
            # Send a POST request to the /detect endpoint
            response = requests.post(
                "http://localhost:8000/detect",
                json={"text": text},
                timeout=10
            )
            response.raise_for_status()  # Raise an error for HTTP status codes >= 400

            # Print the detection results
            print("Detection Results:")
            print("-" * 40)
            result = response.json()
            print(f"Classification: {result['classification']}")
            print(f"Confidence: {result['confidence']}")
            print(f"Human Probability: {result['human_probability']:.1f}%")
            print(f"Machine Probability: {result['machine_probability']:.1f}%")
            break
        except requests.exceptions.ConnectionError:
            if attempt < MAX_RETRIES - 1:
                print(f"Server not responding. Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
            else:
                print("Error: Could not connect to the server. Make sure it's running.")
                sys.exit(1)
        except Exception as e:
            print(f"Error: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    test_api()