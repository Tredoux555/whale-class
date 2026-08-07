# Potato Snaps montage render worker.
# Railway: set the service root directory to `potato-worker`, 4 vCPU / 4 GB.
FROM node:22-bookworm-slim

# --- system deps: Chromium (for Remotion) + ffmpeg + fonts + chrome libs ---
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      ffmpeg \
      fonts-liberation \
      ca-certificates \
      libnss3 \
      libatk1.0-0 \
      libatk-bridge2.0-0 \
      libcups2 \
      libdrm2 \
      libxkbcommon0 \
      libxcomposite1 \
      libxdamage1 \
      libxrandr2 \
      libgbm1 \
      libxshmfence1 \
      libasound2 \
      libpangocairo-1.0-0 \
      libpango-1.0-0 \
      libcairo2 \
      libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Point Remotion at the system Chromium — never let it download one.
# (chrome-for-testing mode is passed programmatically in src/render.ts.)
ENV REMOTION_BROWSER_EXECUTABLE=/usr/bin/chromium
ENV NODE_ENV=production

WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# App source (music assets + remotion/public assets must be present via
# scripts/prepare-assets.sh before build).
COPY . .

# Sanity: assets should have been prepared on the host before the image build.
# (The worker also hard-fails at boot if music assets are missing.)

# 🚨 The `sh -c` stub is load-bearing: the repo-root railway.json healthcheck
# (`/api/health`) is inherited by every service in the project, so the worker
# must answer it or Railway restart-loops a healthy render worker. The health
# stub runs in the background; `exec` hands PID 1 to the worker so SIGTERM
# still reaches it and the graceful-shutdown path works.
CMD ["sh", "-c", "node scripts/health-server.mjs & exec npx tsx src/index.ts"]
