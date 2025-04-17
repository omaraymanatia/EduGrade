# ===== BUILD STAGE =====
FROM node:22-slim AS builder

# Install Python and build tools
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python setup
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node deps
COPY package*.json .
RUN npm ci

# Copy and build app
COPY . .
RUN npm run build

# ===== PRODUCTION STAGE =====
FROM node:22-slim

WORKDIR /app

# Copy Python virtual env
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json .

# Runtime config
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

# Secrets should come from environment at runtime
# Remove this line and pass via -e or compose file
# ENV SESSION_SECRET=examsecretkey123

CMD ["node", "dist/main.js"]