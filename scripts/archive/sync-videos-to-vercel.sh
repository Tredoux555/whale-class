#!/bin/bash
# Script to sync local videos to Vercel via GitHub

echo "🐋 Syncing Videos to Vercel"
echo "============================"
echo ""

# Check if videos exist
if [ ! -d "public/videos" ] || [ -z "$(ls -A public/videos 2>/dev/null)" ]; then
    echo "❌ No videos found in public/videos/"
    exit 1
fi

echo "📹 Found videos:"
ls -lh public/videos/ | tail -n +2 | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

# Check if data/videos.json exists
if [ ! -f "data/videos.json" ]; then
    echo "❌ No videos.json found in data/"
    exit 1
fi

echo "📝 Video metadata found in data/videos.json"
echo ""

# Backup .gitignore
cp .gitignore .gitignore.backup
echo "✅ Backed up .gitignore"

# Temporarily allow videos and data in git
echo ""
echo "📦 Preparing to commit videos..."

# Remove videos and data from .gitignore temporarily
sed -i '' '/^\/public\/videos\/$/d' .gitignore
sed -i '' '/^\/data\/$/d' .gitignore

echo "✅ Temporarily removed videos and data from .gitignore"
echo ""

# Add videos and data
git add public/videos/ data/videos.json
echo "✅ Added videos and metadata to git"

# Check file sizes (GitHub has 100MB limit per file)
echo ""
echo "📊 Checking file sizes..."
large_files=$(find public/videos -type f -size +95M)
if [ -n "$large_files" ]; then
    echo "⚠️  Warning: Some files are close to GitHub's 100MB limit:"
    echo "$large_files"
    read -p "Continue anyway? (y/n): " continue_choice
    if [ "$continue_choice" != "y" ]; then
        echo "Cancelled. Restoring .gitignore..."
        mv .gitignore.backup .gitignore
        exit 1
    fi
fi

# Commit
echo ""
read -p "Commit and push to GitHub? (y/n): " push_choice
if [ "$push_choice" != "y" ]; then
    echo "Cancelled. Restoring .gitignore..."
    mv .gitignore.backup .gitignore
    git reset HEAD public/videos/ data/videos.json
    exit 1
fi

git commit -m "Add uploaded videos and metadata for Vercel deployment" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Committed videos and metadata"
    echo ""
    echo "🚀 Pushing to GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully pushed to GitHub!"
        echo ""
        echo "☁️  Vercel will auto-deploy if auto-deploy is enabled"
        echo "   Check your Vercel dashboard for deployment status"
        echo ""
        echo "📝 Note: Videos are now in git. For production, consider:"
        echo "   - Using cloud storage (AWS S3, Cloudinary)"
        echo "   - Using Vercel Blob Storage"
        echo ""
    else
        echo "❌ Push failed. Videos are committed locally but not pushed."
    fi
else
    echo "❌ Commit failed"
fi

# Restore .gitignore
echo ""
echo "🔄 Restoring .gitignore..."
mv .gitignore.backup .gitignore
echo "✅ .gitignore restored (videos won't be tracked in future commits)"

echo ""
echo "✨ Done! Your videos should be on Vercel after deployment completes."

