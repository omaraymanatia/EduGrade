# Dockerfile for the Python AI model service
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    scikit-learn==1.4.0 \
    tensorflow==2.15.0 \
    transformers==4.38.2 \
    nltk==3.8.1 \
    spacy==3.7.2 \
    torch==2.1.2 \
    sentence-transformers==2.3.1 \
    numpy==1.26.3 \
    pandas==2.2.0 \
    flask==3.0.0 \
    fastapi==0.109.2 \
    uvicorn==0.27.1 \
    gunicorn==21.2.0 \
    python-dotenv==1.0.1

# Copy Python app files
COPY ./models /app/models
COPY ./python_api /app/python_api

# Download NLTK data
RUN python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"

# Download spaCy model
RUN python -m spacy download en_core_web_sm

# Expose port the API will run on
EXPOSE 8000

# Start the FastAPI server
CMD ["uvicorn", "python_api.main:app", "--host", "0.0.0.0", "--port", "8000"]