# 🎬 Sync Videos to Vercel - Quick Guide

## Your Local Videos

You have **2 videos** (79MB total) that need to be synced to Vercel:
1. Phonics Clay (35MB)
2. Beginning Sounds (44MB)

## 🚀 Quick Method: Use the Script

```bash
cd /Users/tredouxwillemse/Desktop/whale
./sync-videos-to-vercel.sh
```

The script will:
1. ✅ Check that videos exist
2. ✅ Temporarily allow videos in git
3. ✅ Commit videos and metadata
4. ✅ Push to GitHub
5. ✅ Vercel auto-deploys
6. ✅ Restore .gitignore (so future uploads aren't tracked)

## 📝 Manual Method

If you prefer to do it manually:

### Step 1: Temporarily Allow Videos in Git

Edit `.gitignore` and comment out or remove:
```
# /public/videos/
# /data/
```

### Step 2: Add and Commit

```bash
git add public/videos/ data/videos.json
git commit -m "Add uploaded videos for Vercel deployment"
```

### Step 3: Push to GitHub

```bash
git push origin main
```

### Step 4: Restore .gitignore

Uncomment or re-add:
```
/public/videos/
/data/
```

## ⚠️ Important Notes

1. **File Size Limits:**
   - GitHub: 100MB per file (your files are fine: 35MB, 44MB)
   - Vercel Hobby: 100MB total (you're at 79MB - OK!)
   - For larger files, use cloud storage

2. **Future Uploads:**
   - After syncing, videos are back in .gitignore
   - New uploads on Vercel will be stored there
   - Or upload via admin panel on Vercel

3. **Production Recommendation:**
   - For production, use cloud storage:
     - **AWS S3** (recommended)
     - **Cloudinary** (easy setup)
     - **Vercel Blob Storage** (new, integrated)

## 🔄 Alternative: Re-upload on Vercel

If you prefer not to commit videos to git:
1. Deploy your site to Vercel
2. Log in to admin panel on Vercel
3. Re-upload videos via the admin interface

This keeps your git repo clean but requires manual re-upload.

## ✅ Recommended: Run the Script

Just run:
```bash
./sync-videos-to-vercel.sh
```

It handles everything automatically! 🎉

