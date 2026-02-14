# Handoff: Social Media Video Uploads (Feb 13, 2026)

## Summary

Uploaded the branded onboarding video (`Montree_Onboarding_Social_BRANDED.mp4`) to Instagram, Facebook, and TikTok. Deleted old un-branded versions (which had macOS dock icons visible) on Facebook and TikTok before uploading the new ones. Also fixed the dock visibility issue in the video itself by extending the branded bottom bar.

## Video Fix — Dock Icon Removal

The original square video (`Montree_Onboarding_Social_1080.mp4`) had macOS dock icons visible at rows ~825-862 of the frame. The branded bottom bar originally started at y=877, leaving the dock exposed.

**Fix:** Created a new larger bottom bar (`bot_bar_v2.png`, 1080×260px) overlaid at y=820, fully covering rows 820-1079 including the dock area. The top bar (`top_bar.png`, 1080×202px) remained unchanged at y=0.

**ffmpeg command used:**
```bash
ffmpeg -y -i "Montree_Onboarding_Social_1080.mp4" \
  -i top_bar.png -i bot_bar_v2.png \
  -filter_complex "[0:v][1:v]overlay=0:0[tmp];[tmp][2:v]overlay=0:820[final]" \
  -map "[final]" -map "0:a" \
  -c:v libx264 -preset fast -crf 20 -c:a aac -b:a 128k -movflags +faststart \
  Montree_Onboarding_Social_BRANDED.mp4
```

**Output:** `Promo Videos/Video 2 - Onboarding/Final/Montree_Onboarding_Social_BRANDED.mp4` (7.3MB, 1080×1080, 3:02)

**New bottom bar design (`bot_bar_v2.png`):**
- 1080×260px, dark teal (#0D3330) background
- Subtle gradient at top edge (20px) for smooth blend with video
- Emerald accent line at y=25
- 3 feature columns: "Track Progress", "Photo Reports", "Curriculum Tools" (with green dots)
- "Try Montree FREE" emerald pill button
- "montree.xyz" URL
- "Made for Montessori teachers" tagline

## Platform Uploads

### Instagram — ✅ Posted as Reel
- **Account:** @montreexyz
- **Type:** Reel
- **Caption:** Standard caption with hashtags (see below)
- **Status:** Successfully shared

### Facebook — ✅ Posted as Reel
- **Page:** facebook.com/montreexyz
- **Type:** Reel
- **Old video:** Deleted (had dock icons visible, posted ~1h earlier)
- **Caption:** Standard caption with hashtags
- **Status:** Successfully posted

### TikTok — ✅ Posted as Video
- **Account:** @montreexyz
- **Old video (7606195647494065430):** Deleted via ⋯ menu → Delete
- **New video:** Uploaded via TikTok Studio, 1080P, 3:02
- **Privacy:** Changed from Private → Public after upload
- **Content check:** Passed ("No issues found")
- **Caption:** Standard caption with hashtags
- **Status:** Successfully posted, public

### LinkedIn — ❌ Blocked by CAPTCHA
- Navigated to linkedin.com but hit reCAPTCHA security check
- Cannot complete CAPTCHAs — requires human interaction
- **Action needed:** User must complete CAPTCHA, then LinkedIn page setup + video upload can proceed

## Caption Used (All Platforms)

```
Your complete Montessori classroom — set up in 3 minutes. 🌿

Montree lets you track every child's journey across all 5 areas, document learning with photos, and share progress with parents. No app install needed.

Try it free → montree.xyz

#Montessori #MontessoriTeacher #ClassroomManagement #EdTech #TeacherTools #EarlyChildhood #MontessoriMethod
```

## Current Social Media Presence

| Platform | Handle | Videos | Status |
|----------|--------|--------|--------|
| Instagram | @montreexyz | Onboarding reel | ✅ Live |
| Facebook | facebook.com/montreexyz | Onboarding reel | ✅ Live |
| TikTok | @montreexyz | Intro (0:57) + Onboarding (3:02) | ✅ Live |
| LinkedIn | — | — | ❌ Needs setup (CAPTCHA blocked) |
| YouTube | — | — | ❌ Not yet started |

## Pending Tasks

1. **LinkedIn** — Complete CAPTCHA → create company page → upload both videos (intro + onboarding)
2. **YouTube** — Upload intro video as Short + onboarding as regular video (use `YOUTUBE_SEO_UPLOAD_GUIDE.md`)
3. **Join Montessori social media groups** across all platforms
