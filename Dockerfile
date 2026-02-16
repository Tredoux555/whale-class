# FORCE REBUILD: 20260216-CURRICULUM-UPDATE
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

# Force rebuild timestamp - changing this invalidates all following layers
ARG REBUILD_TS=20260124-2225
RUN echo "Build timestamp: $REBUILD_TS"

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Cache bust - change this to force rebuild
ARG CACHEBUST=20260216-CURRICULUM-V3

# Copy application files
COPY . .

# Remove any cached build artifacts
RUN rm -rf .next

# Next.js Turbopack evaluates server modules at build time during page data collection.
# ALL env vars referenced by ANY module must be available during `npm run build`.
# Railway injects env vars during Docker build — declare them as ARGs.

# Client-side (inlined into bundles)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_YOUTUBE_API_KEY

# Server-side (needed at build time for module evaluation)
ARG SUPABASE_SERVICE_ROLE_KEY
ARG ADMIN_SECRET
ARG STORY_JWT_SECRET
ARG MESSAGE_ENCRYPTION_KEY
ARG SUPER_ADMIN_PASSWORD
ARG TEACHER_ADMIN_PASSWORD
ARG ANTHROPIC_API_KEY
ARG DATABASE_URL
ARG VAULT_PASSWORD
ARG VAULT_PASSWORD_HASH
ARG RESEND_API_KEY
ARG RESEND_FROM_EMAIL
ARG OPENAI_API_KEY
ARG STRIPE_PRICE_GURU_MONTHLY
ARG STRIPE_WEBHOOK_SECRET_GURU

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
