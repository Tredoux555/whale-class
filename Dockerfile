# Use Node.js 20
FROM node:20-slim

# Install system dependencies for ffmpeg and yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp and reportlab via pip (easier to update)
RUN pip3 install --break-system-packages yt-dlp reportlab pillow

# Verify installations
RUN ffmpeg -version && yt-dlp --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Cache bust - change this to force rebuild
ARG CACHEBUST=20260120-session68-standalone-VERIFIED

# Copy application files
COPY . .

# Build Next.js app (creates .next/standalone with output: 'standalone')
RUN npm run build

# CRITICAL: Copy static files to standalone folder for production
# Next.js standalone mode requires these to be copied manually
# NOTE: Using correct cp syntax - copy INTO directory, not as named target
RUN mkdir -p .next/standalone/.next
RUN cp -r .next/static .next/standalone/.next/
RUN cp -r public .next/standalone/ 2>/dev/null || true

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Make start script executable and start
RUN chmod +x start.sh
CMD ["./start.sh"]
