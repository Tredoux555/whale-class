# ⚠️ REMEMBER: Push & Deploy After Every Change!

## Quick Deploy

**After making ANY changes, run:**

```bash
./deploy.sh "Description of changes"
```

Or manually:
```bash
git add .
git commit -m "Your message"
git push origin main
```

## 📋 Workflow

1. Make changes ✅
2. Test locally (`npm run dev`) ✅
3. **PUSH TO GITHUB** (`git push origin main`) ⚠️ **DON'T FORGET!**
4. Vercel auto-deploys (1-2 minutes) ✅

## 🚀 Vercel Auto-Deploy

- ✅ Enabled: Pushes to `main` branch auto-deploy
- ✅ Check: https://vercel.com/dashboard
- ✅ Site: https://whale-class.vercel.app

**Every code change = Push + Deploy!**

See `AUTO-DEPLOY.md` for full details.

