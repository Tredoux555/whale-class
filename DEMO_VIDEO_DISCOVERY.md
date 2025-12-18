# 🎥 Video Discovery System - Visual Demo Guide

## 🚀 How to Trigger Video Discovery

### Option 1: Via Admin Dashboard (Easiest)

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser:**
   - Go to: http://localhost:3000/admin/login
   - Login with your admin credentials

3. **Navigate to Video Management:**
   - Click "Video Management" link in admin dashboard
   - OR go directly to: http://localhost:3000/admin/video-management

4. **Click "🔍 Discover Videos" Button:**
   - Button is in the top-right of the page
   - Click it to start discovery
   - Confirm the dialog

5. **Watch the Magic:**
   - System searches YouTube for all 74 curriculum works
   - Takes 2-3 minutes
   - Shows progress in console/logs
   - Videos appear in "Pending" tab when done

---

### Option 2: Via API Call (Programmatic)

**Using curl:**
```bash
curl -X POST http://localhost:3000/api/youtube/discover-all \
  -H "Content-Type: application/json" \
  -d '{"forceAll": false, "minScore": 60, "autoApprove": false}'
```

**Using JavaScript:**
```javascript
fetch('/api/youtube/discover-all', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    forceAll: false,      // Only works without videos
    minScore: 60,         // Minimum relevance score
    autoApprove: false    // Require manual approval
  })
})
.then(res => res.json())
.then(data => {
  console.log('Discovery complete!');
  console.log(`Found ${data.videosFound} videos`);
  console.log(`Coverage: ${data.coveragePercent}%`);
});
```

---

### Option 3: Via CLI Script

```bash
# Make sure dev server is running first
npm run dev

# In another terminal:
npx ts-node scripts/discover-videos.ts
```

---

## 📊 What Happens During Discovery

### Step-by-Step Process:

1. **System checks each curriculum work:**
   ```
   Checking: Water Pouring
   Checking: Dry Pouring (Grains)
   Checking: Pink Tower
   ... (74 works total)
   ```

2. **For each work without a video:**
   - Builds search query: "Montessori [Work Name] tutorial"
   - Searches YouTube API (max 10 results)
   - Scores each video (0-100)
   - Selects best match (score ≥ 60)

3. **Saves to database:**
   - Video metadata (title, URL, channel, etc.)
   - Relevance score
   - Status: "Pending" (awaiting approval)

4. **Results:**
   ```
   ✅ Found: 52-59 videos (70-80% coverage)
   ❌ Missing: 12-15 videos (specialized works)
   ⏱️ Duration: 2-3 minutes
   ```

---

## 🎯 What You'll See in the Dashboard

### Before Discovery:
```
┌─────────────────────────────────────┐
│ Video Management                    │
├─────────────────────────────────────┤
│ Total Videos: 0                     │
│ Approved: 0                         │
│ Pending Approval: 0                 │
│                                     │
│ [🔍 Discover Videos] ← Click here! │
└─────────────────────────────────────┘
```

### After Discovery:
```
┌─────────────────────────────────────┐
│ Video Management                    │
├─────────────────────────────────────┤
│ Total Videos: 56                    │
│ Approved: 0                         │
│ Pending Approval: 56                │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Work         │ Video    │ Score │ │
│ ├─────────────────────────────────┤ │
│ │ Pink Tower   │ [Title]  │ 82   │ │
│ │ Brown Stair  │ [Title]  │ 78   │ │
│ │ Red Rods     │ [Title]  │ 75   │ │
│ │ ...          │ ...      │ ...  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Approve] [Reject] buttons          │
└─────────────────────────────────────┘
```

---

## 🎬 Live Demo Script

Here's a script you can run to see it in action:

```bash
#!/bin/bash
# demo-video-discovery.sh

echo "🎥 WHALE VIDEO DISCOVERY DEMO"
echo "=============================="
echo ""

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ Dev server not running!"
  echo "Start it with: npm run dev"
  exit 1
fi

echo "✅ Server is running"
echo ""
echo "Starting video discovery..."
echo ""

# Trigger discovery
RESPONSE=$(curl -s -X POST http://localhost:3000/api/youtube/discover-all \
  -H "Content-Type: application/json" \
  -d '{"forceAll": false, "minScore": 60, "autoApprove": false}')

# Parse response
SUCCESS=$(echo $RESPONSE | grep -o '"success":true' || echo "")
VIDEOS_FOUND=$(echo $RESPONSE | grep -o '"videosFound":[0-9]*' | grep -o '[0-9]*' || echo "0")
COVERAGE=$(echo $RESPONSE | grep -o '"coveragePercent":[0-9]*' | grep -o '[0-9]*' || echo "0")

if [ ! -z "$SUCCESS" ]; then
  echo "✅ Discovery complete!"
  echo "📊 Videos found: $VIDEOS_FOUND"
  echo "📈 Coverage: $COVERAGE%"
  echo ""
  echo "Next steps:"
  echo "1. Go to http://localhost:3000/admin/video-management"
  echo "2. Review videos in 'Pending' tab"
  echo "3. Click 'Approve' for good videos"
else
  echo "❌ Discovery failed"
  echo "Response: $RESPONSE"
fi
```

---

## 🔍 Testing Individual Work Discovery

You can also test discovery for a single work:

```bash
# Get a work ID first
WORK_ID=$(curl -s http://localhost:3000/api/whale/curriculum/roadmap | \
  jq -r '.data[0].id')

# Discover video for that work
curl -X POST http://localhost:3000/api/youtube/search \
  -H "Content-Type: application/json" \
  -d "{
    \"workId\": \"$WORK_ID\",
    \"workName\": \"Pink Tower\",
    \"forceRefresh\": false
  }"
```

---

## 📱 Quick Test Commands

**Check if discovery endpoint works:**
```bash
curl http://localhost:3000/api/youtube/discover-all
# Should return stats JSON
```

**Check video for specific work:**
```bash
# Replace WORK_ID with actual UUID
curl http://localhost:3000/api/youtube/video/WORK_ID
```

**List all videos (admin):**
```bash
curl http://localhost:3000/api/admin/videos?status=pending
```

---

## 🎯 Expected Results

After running discovery, you should see:

- **52-59 videos found** (70-80% coverage)
- **Average score: 75-85/100**
- **Videos in "Pending" tab** awaiting approval
- **All major curriculum areas covered**

---

## ✅ Next Steps After Discovery

1. **Review Videos:**
   - Go to "Pending" tab
   - Check relevance scores
   - Click "Watch on YouTube" to preview

2. **Approve Good Videos:**
   - Click "Approve" for videos with score ≥ 75
   - Review videos with score 60-74

3. **Videos Appear Automatically:**
   - Approved videos show on curriculum pages
   - No additional setup needed!

---

## 🐛 Troubleshooting

**"Discovery failed"**
- Check YouTube API key is set
- Verify database migrations ran
- Check server logs for errors

**"No videos found"**
- Check internet connection
- Verify YouTube API is accessible
- Try manual search for one work first

**"Server not responding"**
- Make sure `npm run dev` is running
- Check port 3000 is available
- Look at server logs for errors

---

## 🎉 Ready to Try It?

1. Make sure dev server is running: `npm run dev`
2. Open: http://localhost:3000/admin/video-management
3. Click "🔍 Discover Videos"
4. Watch the magic happen! ✨



