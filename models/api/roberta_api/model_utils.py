from llama_index.core import Settings, StorageContext, load_index_from_storage
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from sentence_transformers import SentenceTransformer, util
import google.generativeai as genai
import numpy as np


# ===== 1. Configure Embeddings =====
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5", device="cpu"
)

# ===== 2. Load RAG Index =====
storage_context = StorageContext.from_defaults(persist_dir="saved_index")
index = load_index_from_storage(storage_context)
retriever = index.as_retriever(similarity_top_k=3)

# ===== 3. Load Models =====
similarity_model = SentenceTransformer("sentence-transformers/all-roberta-large-v1")
genai.configure(api_key="AIzaSyAyDGCmHX2bwRDtFjMYaHeJ2U0WyyrmBTA")
gemini_model = genai.GenerativeModel("gemini-2.0-flash")


def retrieve_context(query):
    return retriever.retrieve(query)


def generate_answer_with_gemini(query, context_nodes):
    context_text = "\n".join([n.text for n in context_nodes])
    response = gemini_model.generate_content(
        f"Question: {query}\nContext: {context_text}\nAnswer:"
    )
    return response.text


def compute_similarity(student_answer, doctor_answer, rag_answer):
    embeddings = similarity_model.encode([student_answer, doctor_answer, rag_answer])
    sim_matrix = util.pytorch_cos_sim(embeddings, embeddings)
    return {
        "student_doctor": sim_matrix[0][1].item(),
        "student_rag": sim_matrix[0][2].item(),
        "average": np.clip(
            (1.25 * sim_matrix[0][1] + sim_matrix[0][2]).item() / 2, 0, 1
        ),
    }
