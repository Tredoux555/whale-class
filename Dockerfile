# Montree / Whale — production image (Railway, DOCKERFILE builder).
#
# LAYER CACHING: this Dockerfile is deliberately cache-friendly. The apt/pip
# layers, the WORKDIR, and the npm dependency layer only rebuild when their
# own inputs change — there are NO cache-bust ARGs any more. Deploy speed is
# governed by .dockerignore (which keeps the build context small) plus the
# `COPY package*.json ./` + `npm ci` ordering below, which lets Docker reuse
# the dependency layer on every deploy that doesn't touch package.json /
# package-lock.json. If you ever need a genuinely clean build, use Railway's
# "clear build cache" — do not reintroduce a timestamp ARG.
#
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

# Copy package files FIRST, on their own layer. Everything below this line is
# cached and reused until package.json or package-lock.json actually changes —
# source-only deploys skip the whole npm install.
COPY package*.json ./

# Install npm dependencies from the lockfile.
# `npm ci` (not `npm install --force`, and NOT deleting the lockfile): it is
# deterministic, meaningfully faster, and — critically for the sharp problem
# documented below — it installs exactly the resolved native sidecars the
# lockfile pins (@img/sharp-linux-x64@0.34.5 + @img/sharp-libvips-linux-x64@1.2.4).
# --include=optional is required: several deps (sharp, lightningcss, @tailwindcss/oxide)
# ship prebuilt native binaries as optionalDependencies that npm resolves for the
# current platform (linux-x64 in this image). The explicit reinstall of sharp below
# is a safety net per https://sharp.pixelplumbing.com/install#cross-platform in case
# a stale/hoisted arch-specific package elsewhere in the tree confuses npm's optional
# dependency resolution.
RUN npm ci --include=optional
# 🚨 PIN THE VERSION ON THIS LINE. It must match package.json exactly.
# 2026-07-27 build failure: this line used to be a bare `npm install sharp`, i.e.
# sharp@latest, while package.json asked for ^0.34.5. That was harmless while
# latest WAS 0.34.5. Then sharp 0.35.x shipped and the two installs could
# disagree, and the two lines need DIFFERENT native sidecars:
#   sharp 0.34.5 -> @img/sharp-libvips-linux-x64@1.2.4 -> libvips-cpp.so.8.17.3
#   sharp 0.35.x -> @img/sharp-libvips-linux-x64@1.3.2 -> libvips-cpp.so.8.18.3
# The image ended up with the 0.34.5 binding but no 8.17.3 sidecar, so `next
# build` died collecting page data for the routes importing sharp
# (story/admin/vault/{finalize,upload}):
#   ERR_DLOPEN_FAILED: libvips-cpp.so.8.17.3: cannot open shared object file
# The precise npm resolution that dropped the sidecar was NOT reproducible
# outside this image (a minimal repro of these two lines resolves fine) — the
# point is that unpinned + --force + no lockfile made the sharp<->libvips
# pairing non-deterministic. Pinning both sides removes the variable: exactly
# one sharp and its matching libvips. The verification line below is the guard.
RUN npm install --no-save --include=optional --os=linux --cpu=x64 sharp@0.34.5
# Fail LOUDLY and EARLY if the native binding is broken. Without this the first
# symptom is `next build` dying deep inside "Collecting page data" for an
# unrelated-looking route, which is what made the 2026-07-27 failure confusing.
RUN node -e "const s=require('sharp'); console.log('sharp OK', s.versions.sharp, 'libvips', s.versions.vips);"

# Copy application files. What lands here is governed entirely by .dockerignore —
# read that file before adding anything at the repo root.
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
