# Handoff: Social Media Group Posting Campaign

**Date:** Feb 14, 2026
**Status:** 17/20+ groups posted, pending memberships still not approved

---

## What Was Done

### Video Uploads (Complete)
- Instagram @montreexyz — Onboarding reel + Intro reel ✅
- Facebook facebook.com/montreexyz — Onboarding reel + Intro reel ✅
- TikTok @montreexyz — Onboarding video + Intro video ✅
- LinkedIn — Blocked by CAPTCHA ❌

### Tutorial Video Branding (Complete)
- `Montree_Tutorial_Social_BRANDED.mp4` (70MB, 1080×1080) — branded with Montree overlays
- `Montree_Tutorial_Youtube_BRANDED.mp4` (86MB, 1920×1080) — YouTube version
- Iterative design: 3 rounds of overlay refinement (V1→V2→V3 minimalist)

### Bug Fix (Complete)
- `html2canvas` → `html2canvas-pro` in FeedbackButton.tsx (Tailwind CSS v4 `lab()` color function compatibility)

### Facebook Group Reel Sharing (17 groups done)

**Reel URL:** https://www.facebook.com/reel/1437788707724055

**Caption used (no hashtags — hashtags trigger autocomplete dropdown that interferes with posting):**
```
I'm a Montessori teacher and I built Montree, a free classroom management app for tracking progress across all 5 areas, generating parent reports with photos, and planning curriculum. Free for schools to use.

Try it at montree.xyz

Follow us: Instagram @montreexyz | TikTok @montreexyz | facebook.com/montreexyz
```

**Groups successfully posted to (17):**

| # | Group | Members |
|---|-------|---------|
| 1 | Montessori activities | 157K |
| 2 | Montessori Works at home and in schools | 121K |
| 3 | McDaniels International Montessori (Virtual) | ~88K |
| 4 | Montessori Matters | 78K |
| 5 | MONTESSORI TEACHING METHODOLOGY | 72K |
| 6 | ...MONTESSORI... | 61K |
| 7 | Montessori Teachers International | 56K |
| 8 | Montessori at HOME | 51K |
| 9 | Montessori Materials For School | 43K |
| 10 | Everything About Montessori | 22K |
| 11 | Montessori Teacher Training | 21K |
| 12 | Montessori ideas and materials | 17K |
| 13 | Montessori Worldwide | ~10K |
| 14 | Montessori ideas and materials - share/buy/sell | ~8K |
| 15 | Montessori - South Africa | ~5K |
| 16 | Global Montessori Teacher Training Institute | ~5K |
| 17 | Montessori Research Interest Group | Unknown |

**Estimated combined reach: ~815K+ members** (conservative estimate)

---

## Groups Still Available in Share List (not yet posted)

**NONE** — All visible groups in the share list have been posted to (as of Feb 14, 2026).

## Groups with Pending Membership (searched but not accessible)

Searched on Feb 14, 2026 — none of these groups appeared in search results, indicating membership is still pending or they haven't been joined:

- Montessori at Home 3-6 years (33K)
- Montessori Materials for Sale (32K)
- AMI Montessori Discussions (21K)
- Montessori Cool Things (19K)

---

## Workflow for Posting Reel to a Group

1. Navigate to `https://www.facebook.com/reel/1437788707724055`
2. Click the Share button (arrow icon, around coordinates 593, 265)
3. Click "Group" in the share menu
4. Either scroll the list to find unposted groups, OR use the search input to search by name
5. Click on the group
6. Use `find` tool to locate the text input ("Create a public post…"), click on it via ref
7. Type the standard caption (above)
8. Press `cmd+Home` to verify full text from the beginning
9. Click the "Post" button
10. Wait 3 seconds, take screenshot to confirm

**IMPORTANT NOTES:**
- Do NOT use hashtags — Facebook's hashtag autocomplete dropdown causes Escape key to dismiss the entire dialog
- Always verify caption with `cmd+Home` before posting — text can get truncated
- The "Share to a group" list only shows groups where membership is approved
- Groups not in the list = membership still pending (skip them)
- Use `find` tool to reliably locate text inputs (Facebook's DOM changes frequently)

---

## Pending Work

- [x] Post to remaining groups in the share list — ✅ DONE (Feb 14, 2026)
  - Posted to Montessori Research Interest Group
  - Posted to McDaniels International Montessori (Virtual)
  - All other visible groups were already posted
- [ ] Search for and join NEW Montessori Facebook groups (requires manual browsing + join requests)
- [ ] Monitor pending membership approvals (4 groups with 33K-72K members each)
- [ ] Post reel to newly approved groups when membership is accepted
- [ ] LinkedIn upload (blocked by CAPTCHA — needs manual intervention)
- [ ] YouTube uploads (intro + tutorial videos)

## Next Steps (Future Sessions)

To expand reach further, consider:
1. Searching Facebook for additional large Montessori groups not yet joined
2. Joining groups and waiting for approval (may take days/weeks)
3. Exploring international Montessori groups (non-English speaking countries)
4. Consider paid Facebook ads to supplement organic group reach
