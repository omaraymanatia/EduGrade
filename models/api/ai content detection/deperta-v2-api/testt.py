import requests
import time
import sys

def test_api():
    MAX_RETRIES = 100  # Maximum number of retries for connection errors
    RETRY_DELAY = 2  # Delay in seconds between retries

    # Sample text to test the API
    text = "The author strongly advocates for the importance of studying Venus, despite the potential dangers involved. As evidenced by the proposed \"blimp-like vehicle,\" the necessary altitude and temperature for operation, and the development of innovative technology for exploration, it is clear that the benefits of studying Venus far outweigh the risks.\n\nThe author's perspective is that Venus, although hostile to human exploration, holds valuable secrets that could significantly advance our understanding of the universe. The extreme environment of Venus, with temperatures reaching up to 462\u00b0C and crushing pressure, presents a unique opportunity for scientists to develop innovative technologies that can withstand such conditions. The proposed \"blimp-like vehicle\" is a testament to human ingenuity, as it would need to operate at an altitude of 50-60 km above the Venusian surface, where the temperature and pressure are relatively tolerable.\n\nThe development of such technology would not only facilitate the exploration of Venus but also have far-reaching implications for future space missions. Moreover, studying Venus could provide valuable insights into the planet's unique atmosphere and geological processes, which could shed light on the Earth's own climate and evolution. In conclusion, the author's perspective is that the potential dangers involved in studying Venus are significantly outweighed by the potential benefits, and that continued exploration and innovation are essential for advancing our understanding of the universe."

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