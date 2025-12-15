# 🎥 How to Use Video Discovery - Step by Step

## 🌐 Access Points

Your server is running on **port 3001**. Here are the links:

1. **Demo Page:** http://localhost:3001/video-discovery-demo.html
   - Interactive demo with buttons
   - Shows statistics
   - Can trigger discovery

2. **Video Management Dashboard:** http://localhost:3001/admin/video-management
   - Full admin interface
   - Review and approve videos
   - Trigger discovery

3. **Admin Dashboard:** http://localhost:3001/admin
   - Main admin panel
   - Link to video management

---

## 🚀 Quick Start (3 Steps)

### Step 1: Open Video Management
Go to: **http://localhost:3001/admin/video-management**

(You may need to login first at: http://localhost:3001/admin/login)

### Step 2: Click "🔍 Discover Videos"
- Button is in the top-right corner
- Click it to start discovery
- Confirm the dialog
- Wait 2-3 minutes

### Step 3: Review & Approve
- Go to "Pending" tab
- Review each video
- Click "Approve" for good videos
- Videos appear automatically!

---

## 🎬 What Happens When You Click "Discover Videos"

```
1. System checks all 74 curriculum works
   ↓
2. For each work without a video:
   - Searches YouTube: "Montessori [Work Name] tutorial"
   - Finds 10 best matches
   - Scores each video (0-100)
   - Saves best match (score ≥ 60)
   ↓
3. Results:
   - 52-59 videos found (70-80% coverage)
   - Videos saved to database
   - Status: "Pending" (awaiting approval)
   ↓
4. You review in admin dashboard
   ↓
5. Approved videos appear on curriculum pages!
```

---

## 📊 Expected Results

After discovery completes:

- **Total Videos:** 52-59
- **Pending Approval:** 52-59 (all new videos)
- **Approved:** 0 (until you approve them)
- **Coverage:** 70-80% of curriculum works

---

## 🎯 Video Scoring Guide

When reviewing videos, use these scores:

- **85-100 (Green):** ⭐⭐⭐ Excellent - Auto-approve candidates
- **75-84 (Blue):** ⭐⭐ Good - Approve these
- **60-74 (Yellow):** ⭐ Acceptable - Review first
- **<60 (Red):** ❌ Poor - Usually reject

---

## 🔧 Alternative: Trigger via API

If you prefer command line:

```bash
# Trigger discovery
curl -X POST http://localhost:3001/api/youtube/discover-all \
  -H "Content-Type: application/json" \
  -d '{"forceAll": false, "minScore": 60, "autoApprove": false}'

# Check statistics
curl http://localhost:3001/api/youtube/discover-all

# List pending videos
curl http://localhost:3001/api/admin/videos?status=pending
```

---

## ✅ Next Steps

1. **Run Discovery:** Click "🔍 Discover Videos"
2. **Review Videos:** Check "Pending" tab
3. **Approve Videos:** Click "Approve" for good ones
4. **View Results:** Visit curriculum work pages to see videos!

---

## 🎉 That's It!

The system is fully automated. You just need to:
- Click one button
- Review videos
- Approve good ones

Everything else happens automatically! ✨
