#!/bin/bash
# Quick deploy script for Whale Class
# Usage: ./deploy.sh "Commit message"

cd /Users/tredouxwillemse/Desktop/whale

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No changes to commit"
    exit 0
fi

# Get commit message
COMMIT_MSG="${1:-Update: $(date +'%Y-%m-%d %H:%M:%S')}"

echo "🚀 Deploying Whale Class..."
echo "📝 Commit message: $COMMIT_MSG"
echo ""

# Add all changes
git add .

# Commit
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
    echo "✅ Committed changes"
    
    # Push to GitHub
    echo "📤 Pushing to GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Successfully pushed to GitHub!"
        echo "☁️  Vercel will auto-deploy (check dashboard)"
        echo "🌐 Site: https://whale-class.vercel.app"
    else
        echo "❌ Push failed - check your connection"
        exit 1
    fi
else
    echo "❌ Commit failed"
    exit 1
fi

