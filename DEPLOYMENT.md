# Deployment Guide for Whale Class Platform

## 🚀 GitHub Setup

### 1. Create a GitHub Repository

1. Go to https://github.com/new
2. Repository name: `whale-class` (or your preferred name)
3. Description: "Whale Class kindergarten learning videos platform"
4. Choose **Private** (recommended for security)
5. **Don't** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### 2. Push Your Code to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
cd /Users/tredouxwillemse/Desktop/whale
git remote add origin https://github.com/YOUR_USERNAME/whale-class.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## ☁️ Vercel Deployment

### 1. Connect to Vercel

1. Go to https://vercel.com
2. Sign up/Login with your GitHub account
3. Click "Add New Project"
4. Import your `whale-class` repository
5. Vercel will auto-detect Next.js settings

### 2. Configure Environment Variables

In Vercel project settings, add these environment variables:

- **ADMIN_SECRET**: `whale-class-secret-change-in-production` (or generate a new one)
- **ADMIN_USERNAME**: `Tredoux`
- **ADMIN_PASSWORD**: `870602`

**To add environment variables:**
1. Go to your project in Vercel
2. Click "Settings" → "Environment Variables"
3. Add each variable for "Production", "Preview", and "Development"
4. Click "Save"

### 3. Deploy

1. Vercel will automatically deploy when you push to GitHub
2. Or click "Deploy" button manually
3. Wait for deployment to complete
4. Your site will be live at: `https://your-project-name.vercel.app`

## 📝 Important Notes

### Video Storage

- Videos are stored in `public/videos/` directory
- For production, consider using cloud storage:
  - **AWS S3** (recommended)
  - **Cloudinary**
  - **Vercel Blob Storage**

### Data Storage

- Video metadata is stored in `data/videos.json`
- For production, consider using:
  - **Vercel Postgres**
  - **MongoDB Atlas**
  - **Supabase**

### Security

- ✅ Environment variables are secure (not in git)
- ✅ Admin password is protected
- ⚠️ Change `ADMIN_SECRET` to a strong random string in production
- ⚠️ Consider using a database for user management in production

## 🔧 Post-Deployment

1. **Test the deployment:**
   - Visit your Vercel URL
   - Test admin login
   - Upload a test video
   - Verify PWA installation on mobile

2. **Custom Domain (Optional):**
   - Go to Vercel project settings
   - Click "Domains"
   - Add your custom domain

3. **Monitor:**
   - Check Vercel dashboard for deployment status
   - Monitor logs for any errors

## 🐛 Troubleshooting

- **Build fails**: Check Vercel build logs
- **Environment variables not working**: Make sure they're set for the correct environment
- **Videos not uploading**: Check file size limits (Vercel has limits)
- **PWA not working**: Ensure manifest.json and icons are in public folder

## 📱 PWA Installation

After deployment, users can install the app:
- **iOS**: Safari → Share → "Add to Home Screen"
- **Android**: Chrome → Menu → "Install App"

Your Whale Class platform will be live! 🐋

