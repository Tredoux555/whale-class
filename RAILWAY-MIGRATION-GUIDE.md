# 🚂 Railway Migration Guide

## Migration Effort Assessment: **LOW-MEDIUM** (1-3 hours)

Railway is an excellent choice because:
- ✅ Auto-detects Next.js (minimal config needed)
- ✅ Supports Docker (can include ffmpeg/yt-dlp)
- ✅ Easy environment variable management
- ✅ PostgreSQL support (your Supabase DB will work)
- ✅ Similar ease-of-use to Vercel

---

## 📋 Pre-Migration Checklist

### What You'll Need:
- [ ] Railway account (free tier available)
- [ ] GitHub account (already have)
- [ ] Your environment variables list
- [ ] ~30 minutes for basic migration
- [ ] ~1-2 hours if adding Docker for flashcard maker

---

## 🚀 Step 1: Basic Migration (30 minutes)

### A. Create Railway Account & Project

1. **Sign up**: https://railway.app (use GitHub login)
2. **New Project** → **Deploy from GitHub repo**
3. **Select**: `Tredoux555/whale-class`
4. **Branch**: `main`

Railway will auto-detect Next.js and start building!

### B. Add Environment Variables

In Railway dashboard → **Variables** tab, add these:

```bash
# Supabase (from your Vercel env vars)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres.dmfncjjtsoxrnvcdnvjq:Ya0ryafijQvg5Thq@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# Admin Auth
ADMIN_SECRET=your-admin-secret
ADMIN_PASSWORD=your-admin-password

# Story System
STORY_JWT_SECRET=d5bf08e53658390333ec76f688cf34e72332859b9ba85f24868eb0b7235c29ea

# AI (if using)
ANTHROPIC_API_KEY=your-anthropic-key

# Vercel Blob (optional - can switch to Supabase Storage)
BLOB_READ_WRITE_TOKEN=your-blob-token
```

**Tip**: Copy all env vars from Vercel → Settings → Environment Variables

### C. Configure Build Settings

Railway auto-detects, but verify:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Node Version**: 20.x (set in `package.json` or Railway settings)

### D. Deploy!

Railway will:
1. Clone your repo
2. Install dependencies
3. Build your app
4. Deploy it

**First deployment**: ~5-10 minutes

---

## 🐳 Step 2: Add Docker Support for Flashcard Maker (1-2 hours)

### Why Docker?
Railway's default Node.js environment doesn't include `ffmpeg` or `yt-dlp`. Docker lets us install them.

### A. Create Dockerfile

Create `Dockerfile` in project root:

```dockerfile
# Use Node.js 20
FROM node:20-slim

# Install system dependencies for ffmpeg and yt-dlp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Verify installations
RUN ffmpeg -version && yt-dlp --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

### B. Create .dockerignore

Create `.dockerignore`:

```
node_modules
.next
.git
.env.local
.env*.local
*.md
.DS_Store
```

### C. Update Railway Settings

1. Railway dashboard → Your project → **Settings**
2. **Dockerfile Path**: `Dockerfile` (or leave blank if in root)
3. **Docker Build Context**: `.` (root directory)

### D. Redeploy

Railway will rebuild with Docker, including ffmpeg and yt-dlp!

**Build time**: ~10-15 minutes (first Docker build is slower)

---

## 🔧 Step 3: Custom Domain (Optional, 10 minutes)

### A. Add Domain in Railway

1. Railway dashboard → **Settings** → **Networking**
2. Click **Generate Domain** (or add custom domain)
3. Railway provides: `your-app.up.railway.app`

### B. Update DNS (if using custom domain)

If you want `teacherpotato.xyz`:
1. Add CNAME record in your DNS:
   - **Name**: `@` or `www`
   - **Value**: Railway-provided domain
2. Railway will auto-configure SSL

---

## 📊 Step 4: Database Connection

Your Supabase PostgreSQL will work as-is! No changes needed.

Railway also offers managed PostgreSQL if you want to migrate later.

---

## ✅ Step 5: Verify Everything Works

### Test Checklist:
- [ ] Homepage loads
- [ ] Admin login works
- [ ] Video upload works (Supabase Storage)
- [ ] Database queries work
- [ ] **Flashcard Maker works** (if Docker added)

### Test Flashcard Maker:
1. Go to `/admin/flashcard-maker`
2. Paste YouTube URL
3. Click "Generate Flashcards"
4. Should work! 🎉

---

## 💰 Cost Comparison

### Railway:
- **Free Tier**: $5/month credit (usually enough for small apps)
- **Hobby Plan**: $5/month (if you exceed free tier)
- **Pro Plan**: $20/month (for production)

### Vercel:
- **Free Tier**: Good for static sites
- **Pro Plan**: $20/month (for serverless functions)

**Railway is often cheaper** for apps needing system binaries!

---

## 🔄 Step 6: Update DNS (If Using Custom Domain)

### Option A: Keep Vercel Domain
- Keep using Vercel's domain
- No DNS changes needed

### Option B: Switch to Railway Domain
1. Update DNS records
2. Point `teacherpotato.xyz` → Railway domain
3. Wait for DNS propagation (~5-60 minutes)

### Option C: Keep Both Running
- Test Railway first
- Switch DNS when ready
- Keep Vercel as backup

---

## 🐛 Troubleshooting

### Build Fails
- Check Railway logs: Dashboard → **Deployments** → Click deployment → **View Logs**
- Common issues:
  - Missing env vars → Add in Railway Variables
  - Build timeout → Increase in Railway settings
  - Docker build fails → Check Dockerfile syntax

### Flashcard Maker Still Doesn't Work
- Verify Dockerfile is being used: Check Railway build logs
- Test locally: `docker build -t whale . && docker run -p 3000:3000 whale`
- Check logs: `ffmpeg -version` and `yt-dlp --version` should appear in build logs

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check Supabase connection pooler settings
- Ensure SSL is enabled for Supabase connections

---

## 📝 Quick Start Commands

### Test Docker Locally (Before Deploying):
```bash
# Build Docker image
docker build -t whale-class .

# Run locally
docker run -p 3000:3000 --env-file .env.local whale-class

# Test flashcard maker
open http://localhost:3000/admin/flashcard-maker
```

### Railway CLI (Optional):
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Deploy
railway up
```

---

## 🎯 Migration Timeline

### Basic Migration (No Docker):
- **Setup**: 15 minutes
- **First Deploy**: 10 minutes
- **Testing**: 15 minutes
- **Total**: ~40 minutes

### Full Migration (With Docker):
- **Setup**: 15 minutes
- **Dockerfile Creation**: 20 minutes
- **First Deploy**: 15 minutes
- **Testing**: 30 minutes
- **Total**: ~1.5 hours

---

## 🚀 Ready to Migrate?

1. **Start with basic migration** (no Docker)
2. **Test everything works**
3. **Add Docker if you need flashcard maker**
4. **Switch DNS when ready**

Railway is very similar to Vercel - the migration should be smooth!

---

## 📚 Resources

- [Railway Docs](https://docs.railway.app/)
- [Railway Docker Guide](https://docs.railway.app/deploy/dockerfiles)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)



