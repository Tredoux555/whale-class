# syntax=docker/dockerfile:1.7
#
# Montree / Whale — production image (Railway, DOCKERFILE builder).
#
# THREE STAGES:
#   1. deps    — installs npm dependencies (incl. the pinned sharp/libvips
#                safety net) from the lockfile only. Cached until
#                package.json / package-lock.json change. Uses a BuildKit
#                cache mount for npm's own cache dir so even a cold
#                dependency-layer rebuild doesn't re-download from the npm
#                registry.
#   2. build   — extends `deps`, copies the full (dockerignore-filtered)
#                source tree, and runs `next build` (output: 'standalone').
#                Uses a BuildKit cache mount for .next/cache so Turbopack's
#                incremental build cache survives across deploys even when
#                this layer itself isn't Docker-cached (e.g. after a source
#                change, which busts layer cache but not the mounted dir).
#   3. runtime — fresh node:20-slim. Installs ONLY what's needed to run the
#                app (ffmpeg/yt-dlp/python3/reportlab/pillow — none of that
#                is needed to `npm ci` or `next build`, so it's installed
#                here only, not duplicated into deps/build; start.sh itself
#                calls `pip3 install --upgrade yt-dlp` at container start,
#                so pip3/yt-dlp must be on PATH here). CONFIRMED via the
#                staged start.sh that the server is fully self-contained:
#                start.sh does `cd /app/.next/standalone && exec node
#                server.js` — so runtime process.cwd() is
#                /app/.next/standalone, and NONE of node_modules,
#                package.json, or the app/components/lib source tree at
#                /app root are ever read. This stage therefore carries only:
#                  - .next/standalone (self-contained: its own traced
#                    node_modules + server.js + .next/static + public,
#                    the last two copied in during the build stage exactly
#                    as the original Dockerfile did)
#                  - a small set of runtime-read paths NOT caught by Next's
#                    file tracer, copied directly into .next/standalone/
#                    (see "UNTRACED RUNTIME READS" below) — matching the
#                    actual cwd, not /app root
#                  - start.sh itself, at /app (where CMD invokes it from)
#                This drops the full node_modules tree, the parallel
#                app/components/lib/public source copy, and the
#                non-standalone .next/{cache,server} build output entirely
#                — none of it is ever read at runtime — which is the real
#                size/export-time win over the previous single-stage image.
#
# UNTRACED RUNTIME READS — checked next.config.ts (staged AND live copies)
# for `outputFileTracingIncludes`: IT IS NOT SET, in either file. Next's
# default tracer only follows static JS/TS imports plus a best-effort
# static analysis of literal-path fs.readFile calls — it cannot predict
# readdir() results and does not follow child_process spawn() targets at
# all. Per .dockerignore's "MUST NEVER BE EXCLUDED" audit these five reads
# are not safely traced, so they're copied explicitly into
# .next/standalone/ in stage 3 (see the comment there for per-path detail):
#   data/, scripts/, assets/, lib/**/*.md (whole lib/ copied, for path
#   fidelity), and root *.xlsx (staged via the glob-tolerant
#   `_runtime-extras` dir since it's the one optional file in this list).
#
# LAYER CACHING: apt/pip/WORKDIR/npm layers only rebuild when their own
# inputs change — no cache-bust ARGs. If you ever need a genuinely clean
# build, use Railway's "clear build cache" — do not reintroduce a timestamp
# ARG.

# ── Stage 1: deps ─────────────────────────────────────────────────────────
FROM node:20-slim AS deps
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
# The --mount=type=cache persists npm's download/extract cache across builds
# (keyed by this stage) without baking it into the image layer itself — a
# lockfile change no longer means re-fetching every package from the registry.
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --include=optional
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
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm install --no-save --include=optional --os=linux --cpu=x64 sharp@0.34.5
# Fail LOUDLY and EARLY if the native binding is broken. Without this the first
# symptom is `next build` dying deep inside "Collecting page data" for an
# unrelated-looking route, which is what made the 2026-07-27 failure confusing.
RUN node -e "const s=require('sharp'); console.log('sharp OK', s.versions.sharp, 'libvips', s.versions.vips);"

# ── Stage 2: build ────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app

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

# Build Next.js app (creates .next/standalone with output: 'standalone').
# The cache mount persists Turbopack's incremental build cache across builds
# even when the `build` layer itself gets invalidated by a source change.
RUN --mount=type=cache,id=next-cache,target=/app/.next/cache \
    npm run build

# CRITICAL: Copy static files to standalone folder for production
# Next.js standalone mode requires these to be copied manually
# NOTE: Using correct cp syntax - copy INTO directory, not as named target
RUN mkdir -p .next/standalone/.next
RUN cp -r .next/static .next/standalone/.next/
RUN cp -r public .next/standalone/ 2>/dev/null || true

# Stage optional root-level runtime files (currently just *.xlsx, per
# .dockerignore's "*.xlsx at root" note) into a directory that always
# exists, so the runtime stage's COPY --from=build below never hard-fails
# on a zero-match glob if no such file happens to be present in a given
# checkout. Required runtime paths (data/, scripts/, assets/, start.sh) are
# copied as exact non-glob paths instead — if any of those are ever
# genuinely missing, we WANT the build to fail loudly rather than silently
# ship a broken runtime, same philosophy as the sharp verification above.
RUN mkdir -p /app/_runtime-extras && \
    cp *.xlsx /app/_runtime-extras/ 2>/dev/null || true

# ── Stage 3: runtime ──────────────────────────────────────────────────────
FROM node:20-slim AS runtime

# Install system dependencies for ffmpeg and yt-dlp.
# These are RUNTIME-only deps (video processing / PDF report generation via
# spawned subprocesses) — `npm ci` and `next build` never invoke them, so
# unlike the previous single-stage image they're installed once here instead
# of sitting unused in the build stages too.
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

WORKDIR /app

# CONFIRMED via start.sh (staged separately): it does
#   cd /app/.next/standalone && exec node server.js
# i.e. the server is fully self-contained (its own bundled node_modules) and
# runtime process.cwd() is /app/.next/standalone, NOT /app. So:
#   - No root node_modules/package.json/app/components/public needed at
#     /app — none of that is ever read; .next/standalone is self-sufficient
#     for everything Next's file tracer DID catch.
#   - Anything read at runtime via fs/process.cwd() joins that the tracer
#     did NOT catch must be copied INTO .next/standalone/ (matching the
#     actual cwd), not to /app root.
#
# /app/.next/standalone/ already has .next/static + public copied INTO it
# (done above, in the build stage, identically to the original Dockerfile).
COPY --from=build /app/.next/standalone ./.next/standalone

# CRITICAL — untraced runtime reads: checked next.config.ts (staged AND
# live copies) for `outputFileTracingIncludes` — IT IS NOT SET. Next's
# default file tracer only follows static JS/TS module imports plus a
# best-effort static analysis of literal-path fs.readFile calls; it cannot
# know what a readdir() will enumerate at runtime, and it does not follow
# child_process spawn target paths at all. Per .dockerignore's "MUST NEVER
# BE EXCLUDED" audit, all five of the following are runtime reads the
# tracer cannot be trusted to have caught, so they're copied explicitly
# into .next/standalone/ (the real runtime cwd) rather than relying on
# tracing:
#   data/     — lib/data.ts, lib/montree/guru/knowledge-retriever.ts read
#               process.cwd()/data/{videos.json,guru_knowledge/…} (the
#               guru_knowledge/… subtree implies directory enumeration).
#   scripts/  — app/api/whale/reports/pdf spawns
#               process.cwd()/scripts/generate_parent_report.py as a child
#               process — tracing NEVER follows spawn() target paths.
#   assets/   — app/api/guides/language-making-guide reads it.
#   lib/**/*.md — runtime knowledge bases (story coach, mira, tracy,
#               social-media-guru) loaded via readdir()/readFile() —
#               readdir results are runtime-only, tracing cannot predict
#               them. Copying the whole lib/ dir (not just *.md, via a
#               fragile recursive glob) guarantees the .md files land at
#               the exact nested paths readdir() expects; the .ts/.tsx
#               alongside them is unused at runtime (already compiled into
#               server.js) but negligible in size.
#   *.xlsx (root) — app/api/montree/super-admin/master-outreach/download
#               reads process.cwd()/Montree_Master_Outreach.xlsx. Staged via
#               the glob-tolerant `_runtime-extras` dir from the build stage
#               (see above) since it's the one genuinely optional file here
#               — Docker COPY hard-fails on a zero-match glob otherwise.
COPY --from=build /app/data ./.next/standalone/data
COPY --from=build /app/scripts ./.next/standalone/scripts
COPY --from=build /app/assets ./.next/standalone/assets
COPY --from=build /app/lib ./.next/standalone/lib
COPY --from=build /app/_runtime-extras/ ./.next/standalone/

# BELT-AND-SUSPENDERS: also copy data/, scripts/, assets/ to /app root
# (alongside the .next/standalone/ copies above), in case any code or
# spawned subprocess references an absolute /app/scripts|data|assets path,
# or resolves relative to start.sh's initial /app cwd before its `cd
# /app/.next/standalone` runs. Low tens of MB — cheap insurance against a
# 404 that cwd-relative coverage alone wouldn't catch.
COPY --from=build /app/data ./data
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/assets ./assets

# start.sh is the CMD entrypoint — lives at /app (WORKDIR), not inside
# .next/standalone; it does the `cd` itself.
COPY --from=build /app/start.sh ./start.sh

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Make start script executable and start
RUN chmod +x start.sh
CMD ["./start.sh"]
