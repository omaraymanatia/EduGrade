import requests
import time
import sys

def test_api():
    MAX_RETRIES = 100 # Maximum number of retries for connection errors
    RETRY_DELAY = 2 # Delay in seconds between retries

    text = "Taking pictures of objects in our own solar system is much more difficult than taking pictures of distant galaxies. This is because the objects in our solar system are much closer to us, so they appear smaller in the sky and are harder to see clearly. In addition, planets like Venus are covered in clouds, which makes it difficult to get a clear view of the surface.\n\nTo take a picture of Venus or any other planet, we need to use special telescopes that are designed to capture light from distant objects. These telescopes are usually much larger and more powerful than the ones we use to look at stars and galaxies, because they need to be able to see much finer details on the surface of the planet. Even with these powerful telescopes, it can still be difficult to get a clear view of the surface of a planet like Venus, because the clouds and other atmospheric conditions can block our view.\n\nSo, while it may be possible to get some close-up shots of Venus or other planets in our solar system, it is much more difficult than taking pictures of distant galaxies, which are much further away and easier to see clearly."
    
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