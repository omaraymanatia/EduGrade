# Use Node.js LTS as the base image for the application
FROM node:20-slim AS base

# Install Python 3.11 and other dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Create a Python virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies for AI text detection
RUN pip install --no-cache-dir \
    scikit-learn==1.4.0 \
    tensorflow==2.15.0 \
    transformers==4.38.2 \
    nltk==3.8.1 \
    spacy==3.7.2 \
    torch==2.1.2 \
    sentence-transformers==2.3.1 \
    numpy==1.26.3 \
    pandas==2.2.0

# Copy package.json and package-lock.json
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci

# Copy application source
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV SESSION_SECRET=examsecretkey123

# Command to run the application
CMD ["npm", "start"]