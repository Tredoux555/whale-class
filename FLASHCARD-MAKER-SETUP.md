# 🎵 Song Flashcard Maker - Setup Guide

## ⚠️ Important: Vercel Limitation

**The flashcard maker requires system dependencies (`ffmpeg` and `yt-dlp`) that are NOT available on Vercel's serverless functions.**

### Current Status:
- ✅ **Local Development**: Fully functional (tools installed)
- ❌ **Vercel Production**: Not supported (system binaries unavailable)

## 🚀 Running Locally

### Prerequisites (Already Installed ✅)
- `ffmpeg` version 8.0.1
- `yt-dlp` version 2025.12.08

### Steps:
1. **Start the development server:**
   ```bash
   cd /Users/tredouxwillemse/Desktop/whale
   npm run dev
   ```

2. **Access the flashcard maker:**
   - Open: `http://localhost:3000/admin/flashcard-maker`
   - Or navigate from admin dashboard: `http://localhost:3000/admin`

3. **Use the feature:**
   - Paste a YouTube URL
   - Adjust settings (scene sensitivity, min interval)
   - Click "Generate Flashcards"
   - Download PDF when ready

## 🔧 Alternative Solutions for Production

### Option 1: Separate Processing Service (Recommended)
Create a separate API service on a platform that supports system binaries:

**Platforms that support ffmpeg/yt-dlp:**
- **Railway** - Easy deployment, supports Docker
- **Render** - Supports Docker containers
- **DigitalOcean App Platform** - Supports Docker
- **AWS Lambda with Layers** - More complex but scalable
- **Google Cloud Run** - Container-based, supports binaries

**Architecture:**
```
Vercel (Frontend) → External API (Video Processing) → Returns frames → Vercel generates PDF
```

### Option 2: Client-Side Processing (Limited)
- Use browser-based video processing (limited capabilities)
- Requires uploading video files directly (no YouTube download)
- Not recommended for production

### Option 3: Use External APIs
- **YouTube Data API** - Get video info (but can't download)
- **Cloud Video Processing Services** - Expensive but reliable
- **Custom Docker Service** - Deploy on Railway/Render

## 📝 Implementation Example (Railway)

If you want to deploy a processing service on Railway:

1. **Create a separate API service:**
   ```typescript
   // api/process-video.ts
   export async function POST(request: Request) {
     // Call Railway API endpoint
     const response = await fetch('https://your-railway-app.railway.app/process', {
       method: 'POST',
       body: await request.json()
     });
     return response;
   }
   ```

2. **Railway service** (Node.js with Docker):
   ```dockerfile
   FROM node:18
   RUN apt-get update && apt-get install -y ffmpeg
   RUN pip install yt-dlp
   # ... rest of Dockerfile
   ```

## 🎯 Current Recommendation

**For now, use the feature locally:**
- All tools are installed and working
- Perfect for generating flashcards during lesson planning
- No additional setup needed

**For production later:**
- Consider deploying a separate processing service on Railway or Render
- Keep the PDF generation on Vercel (works fine)
- Only move video processing to external service

## 🐛 Troubleshooting

### "yt-dlp: command not found" (Local)
- Verify installation: `which yt-dlp && yt-dlp --version`
- Reinstall: `brew install yt-dlp`

### "ffmpeg: command not found" (Local)
- Verify installation: `which ffmpeg && ffmpeg -version`
- Reinstall: `brew install ffmpeg`

### Processing fails (Local)
- Check `/tmp/flashcard-maker/` directory exists and is writable
- Ensure sufficient disk space
- Check video URL is accessible

## 📚 Resources

- [yt-dlp Documentation](https://github.com/yt-dlp/yt-dlp)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Railway Deployment Guide](https://docs.railway.app/)
- [Render Docker Guide](https://render.com/docs/docker)

