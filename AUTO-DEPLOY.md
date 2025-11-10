# 🚀 Auto-Deploy Workflow

## ⚠️ IMPORTANT: Always Push and Deploy After Changes

**Every time you make changes to the code, you MUST:**

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

2. **Push to GitHub:**
   ```bash
   git push origin main
   ```

3. **Vercel will auto-deploy** (usually takes 1-2 minutes)

## ✅ Quick Deploy Script

Create a script to automate this process:

```bash
#!/bin/bash
# deploy.sh - Quick deploy script

cd /Users/tredouxwillemse/Desktop/whale

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
    echo "No changes to commit"
    exit 0
fi

# Commit all changes
git add .
git commit -m "${1:-Update: $(date +'%Y-%m-%d %H:%M:%S')}"

# Push to GitHub
git push origin main

echo "✅ Pushed to GitHub - Vercel will auto-deploy!"
```

**Usage:**
```bash
./deploy.sh "Add new feature"
# or
./deploy.sh  # Uses timestamp as commit message
```

## 📝 Workflow Checklist

After making ANY changes:

- [ ] Test locally (`npm run dev`)
- [ ] Commit changes (`git add . && git commit -m "message"`)
- [ ] Push to GitHub (`git push origin main`)
- [ ] Check Vercel dashboard for deployment
- [ ] Verify changes on live site

## 🔄 Vercel Auto-Deploy

Vercel automatically deploys when you push to GitHub:
- ✅ Push to `main` branch → Auto-deploys
- ✅ Usually takes 1-2 minutes
- ✅ Check status at: https://vercel.com/dashboard

## 🚨 If Auto-Deploy Doesn't Work

1. **Check Vercel Settings:**
   - Go to project Settings → Git
   - Ensure "Automatic deployments from Git" is enabled

2. **Manual Redeploy:**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment

3. **Check Build Logs:**
   - View deployment logs in Vercel
   - Fix any build errors

## 💡 Pro Tips

- **Always test locally first** before pushing
- **Use descriptive commit messages**
- **Push frequently** (don't wait for many changes)
- **Check Vercel dashboard** after pushing
- **Monitor deployment status** for errors

## 📋 Remember

**Every code change = Push + Deploy**

Don't forget to push your changes! 🐋

