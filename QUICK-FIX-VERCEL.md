# 🎬 Quick Fix: Get Videos Showing on Vercel

## The Issue

Videos upload on localhost but not on Vercel because:
- Vercel has a **read-only filesystem** (can't write files at runtime)
- Your videos.json and video files need to be in git

## ✅ Quick Fix (2 Steps)

### Step 1: Push Videos to GitHub

```bash
cd /Users/tredouxwillemse/Desktop/whale

# Make sure videos are tracked
git add data/videos.json public/videos/

# Commit and push
git commit -m "Add videos for Vercel"
git push origin main
```

### Step 2: Wait for Vercel to Deploy

- Vercel will auto-deploy (usually 1-2 minutes)
- Your videos will appear on https://whale-class.vercel.app

## 🔄 For Future Videos

**Workflow:**
1. Upload on localhost:3000/admin ✅
2. Push to GitHub: `git add public/videos/ data/videos.json && git push` ✅
3. Vercel auto-deploys ✅

**Or set up cloud storage** (AWS S3, Cloudinary) for direct uploads on Vercel.

## 📝 What's Fixed

- ✅ Better error messages when uploading on Vercel
- ✅ Videos.json is tracked in git
- ✅ Clear instructions for workaround

Your videos should show up after pushing! 🐋

