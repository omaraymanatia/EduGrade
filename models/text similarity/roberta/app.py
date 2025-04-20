from flask import Flask, request, jsonify, render_template
from model_utils import retrieve_context, generate_answer_with_gemini, compute_similarity

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/evaluate", methods=["POST"])
def evaluate():
    try:
        # Validate request
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 400
            
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['question', 'student_answer', 'doctor_answer']
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing required fields. Needed: {required_fields}"}), 400

        # Generate RAG answer
        context_nodes = retrieve_context(data['question'])
        rag_answer = generate_answer_with_gemini(data['question'], context_nodes)

        # Compute similarities
        similarities = compute_similarity(
            data['student_answer'],
            data['doctor_answer'],
            rag_answer
        )

        return jsonify({
            "average_similarity": round(similarities["average"], 4),
            "status": "success"
        })

    except Exception as e:
        return jsonify({
            "error": str(e),
            "status": "error"
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)