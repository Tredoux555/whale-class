# 🚀 Quick Setup: GitHub + Vercel

## Option 1: Use the Setup Script (Easiest)

```bash
cd /Users/tredouxwillemse/Desktop/whale
./setup-github.sh
```

The script will guide you through:
1. Creating a GitHub repository
2. Connecting your local repo
3. Pushing to GitHub
4. Instructions for Vercel

## Option 2: Manual Setup

### GitHub Setup

1. **Create Repository:**
   - Go to: https://github.com/new
   - Name: `whale-class`
   - Make it **Private**
   - **Don't** add README, .gitignore, or license
   - Click "Create repository"

2. **Connect and Push:**
   ```bash
   cd /Users/tredouxwillemse/Desktop/whale
   git remote add origin https://github.com/YOUR_USERNAME/whale-class.git
   git push -u origin main
   ```

### Vercel Setup

1. **Sign up/Login:**
   - Go to: https://vercel.com
   - Sign in with GitHub

2. **Import Project:**
   - Click "Add New Project"
   - Select your `whale-class` repository
   - Vercel auto-detects Next.js

3. **Add Environment Variables:**
   In Vercel project settings → Environment Variables, add:
   ```
   ADMIN_SECRET = whale-class-secret-change-in-production
   ADMIN_USERNAME = Tredoux
   ADMIN_PASSWORD = 870602
   ```
   Set for: Production, Preview, Development

4. **Deploy:**
   - Click "Deploy"
   - Wait ~2 minutes
   - Your site is live! 🎉

## Your Live URLs

After deployment:
- **Main Site**: `https://whale-class.vercel.app` (or your custom domain)
- **Admin**: `https://whale-class.vercel.app/admin/login`

## Next Steps

- ✅ Code is committed and ready
- ✅ Vercel config is ready
- ⏭️ Create GitHub repo
- ⏭️ Push to GitHub
- ⏭️ Deploy on Vercel

Run `./setup-github.sh` to get started!

