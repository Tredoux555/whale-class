#!/bin/bash
# GitHub and Vercel Setup Script for Whale Class

echo "🐋 Whale Class - GitHub & Vercel Setup"
echo "======================================"
echo ""

# Check if git remote already exists
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ Git remote 'origin' already configured:"
    git remote -v
    echo ""
    read -p "Do you want to update it? (y/n): " update_remote
    if [ "$update_remote" != "y" ]; then
        echo "Keeping existing remote."
        exit 0
    fi
fi

echo "📝 Step 1: Create a GitHub Repository"
echo "-------------------------------------"
echo "1. Go to: https://github.com/new"
echo "2. Repository name: whale-class (or your choice)"
echo "3. Description: Whale Class kindergarten learning videos platform"
echo "4. Choose PRIVATE (recommended)"
echo "5. DO NOT initialize with README, .gitignore, or license"
echo "6. Click 'Create repository'"
echo ""
read -p "Press Enter after you've created the repository..."

echo ""
echo "📝 Step 2: Enter Your GitHub Repository URL"
echo "--------------------------------------------"
echo "Example: https://github.com/yourusername/whale-class.git"
read -p "GitHub repository URL: " repo_url

if [ -z "$repo_url" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

# Remove existing origin if it exists
git remote remove origin 2>/dev/null

# Add new origin
git remote add origin "$repo_url"

echo ""
echo "✅ Git remote configured!"
echo ""
echo "📤 Step 3: Pushing to GitHub..."
echo "--------------------------------"

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "☁️  Step 4: Deploy to Vercel"
    echo "----------------------------"
    echo "1. Go to: https://vercel.com"
    echo "2. Sign up/Login with GitHub"
    echo "3. Click 'Add New Project'"
    echo "4. Import your 'whale-class' repository"
    echo "5. Add environment variables:"
    echo "   - ADMIN_SECRET: whale-class-secret-change-in-production"
    echo "   - ADMIN_USERNAME: Tredoux"
    echo "   - ADMIN_PASSWORD: 870602"
    echo "6. Click 'Deploy'"
    echo ""
    echo "🎉 Your Whale Class platform will be live!"
else
    echo ""
    echo "❌ Push failed. Please check:"
    echo "   - Repository URL is correct"
    echo "   - You have access to the repository"
    echo "   - GitHub credentials are configured"
fi

