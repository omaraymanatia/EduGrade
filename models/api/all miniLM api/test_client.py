import requests
import json

API_URL = "http://localhost:8000/compare-answers"

def test_comparison_api():
    # Test data
    test_data = {
        "question": str(input("Enter the question: ")),
        "doctor_answer": str(input("Enter the doctor's answer: ")),
        "student_answer": str(input("Enter the student's answer: "))
    }
    
    # Make API request
    print("Sending request to API...")
    response = requests.post(API_URL, json=test_data)
    
    # Check response
    if response.status_code == 200:
        result = response.json()
        print("\n=== RESULTS ===")
        print(f"RAG Answer: {result['rag_answer']}")
        print("\nSimilarity Scores:")
        for key, value in result['similarity_scores'].items():
            print(f"  {key}: {value:.4f}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    test_comparison_api()
