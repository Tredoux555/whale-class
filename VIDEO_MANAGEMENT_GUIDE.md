# 🎥 Video Management Dashboard - User Guide

## 📍 Access the Dashboard

**URL:** http://localhost:3000/admin/video-management

**Note:** You need to be logged in as admin to access this page.

---

## 🎯 How It Works

### 1. **Dashboard Overview**

When you first open the page, you'll see:

- **Header Section:**
  - Title: "Video Management"
  - "🔍 Discover Videos" button (starts automated discovery)
  - "Back to Admin" button

- **Statistics Cards:**
  - **Total Videos:** All videos in the system
  - **Approved:** Videos that are approved and visible
  - **Pending Approval:** Videos waiting for your review

- **Filter Tabs:**
  - **All:** Shows all videos
  - **Approved:** Shows only approved videos
  - **Pending:** Shows only videos waiting for approval

### 2. **Discover Videos**

Click the **"🔍 Discover Videos"** button to:

1. Automatically search YouTube for all 74 curriculum works
2. Score each video by relevance (0-100)
3. Save best matches to database
4. Takes 2-3 minutes to complete

**What happens:**
- System searches YouTube for each curriculum work
- Scores videos based on:
  - Title match (20 points)
  - Description match (20 points)
  - Channel authority (15 points)
  - Duration 5-15 min (15 points)
  - View count (10 points)
  - Recency (15 points)
  - Engagement (5 points)
- Saves videos with score ≥ 60
- Videos appear in "Pending" tab for your review

### 3. **Review and Approve Videos**

In the video list table, you'll see:

**Columns:**
- **Work:** Curriculum work name and area
- **Video:** Video title, channel name, and "Watch on YouTube" link
- **Score:** Relevance score (0-100)
  - 🟢 Green: 85+ (Excellent)
  - 🔵 Blue: 75-84 (Good)
  - 🟡 Yellow: 60-74 (Acceptable)
  - 🔴 Red: <60 (Poor)
- **Status:** ✅ Approved or ⏳ Pending
- **Actions:** Approve/Reject buttons

**Actions:**
- **Approve:** Click "Approve" to make video visible on curriculum pages
- **Reject:** Click "Reject" to remove video from system
- **Deactivate:** For approved videos, click "Deactivate" to hide it

### 4. **Video Display on Curriculum Pages**

Once approved, videos automatically appear on curriculum work pages:

- Embedded YouTube player
- Video title and channel name
- Duration and view count
- Relevance score
- "Watch on YouTube" link

---

## 🚀 Step-by-Step Workflow

### First Time Setup:

1. **Run Discovery:**
   - Click "🔍 Discover Videos"
   - Wait 2-3 minutes
   - System finds 52-59 videos (70-80% coverage)

2. **Review Videos:**
   - Go to "Pending" tab
   - Review each video:
     - Check score (higher is better)
     - Click "Watch on YouTube" to preview
     - Approve good videos
     - Reject bad videos

3. **Verify Display:**
   - Visit any curriculum work page
   - Approved videos appear automatically

### Ongoing Maintenance:

- **Daily:** System automatically searches for new videos (cron job)
- **Weekly:** Review new pending videos in dashboard
- **Monthly:** Optional - refresh cache to find better videos

---

## 📊 Understanding Scores

### Score Breakdown:

- **85-100 (Excellent):** ⭐⭐⭐
  - Perfect match, highly relevant
  - Usually auto-approved candidates
  - Official Montessori channels

- **75-84 (Good):** ⭐⭐
  - Strong match, relevant content
  - Good quality demonstrations
  - Recommended for approval

- **60-74 (Acceptable):** ⭐
  - Acceptable match, may be useful
  - Review before approving
  - Check video quality manually

- **<60 (Poor):** ❌
  - Low relevance
  - Usually rejected automatically
  - May need manual search

---

## 🎨 Features

### Smart Discovery:
- ✅ Automatically finds best videos
- ✅ Scores by relevance
- ✅ Caches results for 30 days
- ✅ Avoids duplicate searches

### Admin Control:
- ✅ Approve/reject videos
- ✅ View all videos in one place
- ✅ Filter by status
- ✅ See relevance scores

### User Experience:
- ✅ Videos appear automatically
- ✅ Embedded YouTube player
- ✅ Mobile responsive
- ✅ "Watch on YouTube" option

---

## 🔧 Troubleshooting

### "No videos found"
- Run discovery first
- Check YouTube API key is set
- Verify database migration ran

### "Videos not showing on pages"
- Make sure videos are approved
- Check work has approved video
- Hard refresh browser (Ctrl+Shift+R)

### "Discovery failed"
- Check YouTube API key
- Verify internet connection
- Check server logs for errors

---

## ✅ Best Practices

1. **Review Before Approving:**
   - Always watch video before approving
   - Check if it matches the curriculum work
   - Verify video quality

2. **Score Guidelines:**
   - Approve videos with score ≥ 75
   - Review videos with score 60-74
   - Reject videos with score < 60

3. **Regular Maintenance:**
   - Review pending videos weekly
   - Approve high-scoring videos quickly
   - Reject low-quality videos

---

## 🎉 You're Ready!

The video management dashboard is now set up and ready to use. Start by clicking "🔍 Discover Videos" to find videos for all your curriculum works!





