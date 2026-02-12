# Handoff: Promo Video Production (Feb 12-13, 2026)

## Summary

Took the raw screen recording `Final Edit Montree Intro.mp4` (1728×1080, 54s, 30fps) and produced optimized social media videos with Montree branding, captions, and SEO metadata.

## Outputs (all in `Promo Videos/`)

| File | Specs | Purpose |
|------|-------|---------|
| `Montree_Shorts_9x16.mp4` | 1080×1920, 57.9s, 2.9MB | YouTube Shorts / Instagram Reels / TikTok |
| `Montree_Social_Square.mp4` | 1080×1080, 57.9s, 2.6MB | Instagram feed / Facebook / LinkedIn |
| `Montree_Thumbnail.png` | 1280×720, 117KB | YouTube thumbnail |
| `YOUTUBE_SEO_UPLOAD_GUIDE.md` | — | Title, description, tags, upload settings, social captions |

## What was done

### Video Processing
- **Source crop**: Removed macOS menu bar (top 25px) and dock (bottom 55px). Kept Chrome tab/address bar to preserve webcam face overlay.
- **Captions burned in**: SRT file synced to speech, styled with Poppins Bold white text on semi-transparent dark teal background box. Positioned at bottom of video content area.
- **Shorts (9:16)**: Source scaled to 1040px wide, centered on 1080×1920 dark teal canvas. Branded top bar (Montree icon + "Montessori Classroom Management, Simplified" + "Watch how easy it is ↓") and bottom bar (3 feature bullets + "Try Montree FREE" CTA button + montree.xyz). 1.5s branded intro card, 2.5s branded outro card with full feature list. Fade in/out transitions.
- **Square (1:1)**: Source scaled to 1080px wide, centered on 1080×1080 dark teal canvas. Branded bottom bar (Montree logo + montree.xyz). Same intro/outro cards adapted to square format.

### Branded Assets Created
- `shorts_top_bar.png` (1080×380) — persistent top overlay for Shorts
- `shorts_bottom_bar.png` (1080×520) — persistent bottom overlay for Shorts
- `shorts_intro.png` / `shorts_outro.png` (1080×1920) — intro/outro cards for Shorts
- `square_intro.png` / `square_outro.png` (1080×1080) — intro/outro cards for Square
- `square_bottom_bar.png` (1080×80) — bottom bar for Square
- All assets use Montree brand: dark teal (#0D3330) background, emerald (#4ADE80) accents, Poppins font family

### SEO & Social Media
- YouTube title, description with hashtags, full tag list
- Upload settings (category, visibility, age restriction, etc.)
- Ready-to-paste captions for Instagram/TikTok, LinkedIn/Facebook, Twitter/X

### Thumbnail
- 1280×720 with app screenshot (emerald glow frame), "Montessori Made Easy" title, CTA button, feature pills, presenter face circle with emerald ring
- **Known issue**: Face extraction coordinates slightly off — webcam circle in source video is at approximately (800, 110) in the 1728×1080 frame. Script is `build_thumbnail_v2.py` in session directory. Fix: adjust `cx, cy, r` values and re-run.

## Source Files

- **Original video**: `Final Edit Montree Intro.mp4` (3.4MB, 1728×1080, 54s)
- **Captions**: SRT file uploaded by user (16 subtitle entries, ~54s coverage)
- **Brand assets used**: `public/montree-icon-only.png` (800×800), `public/montree-logo-hd.png` (4096×4096)
- **Build scripts**: `build_assets.py` (all overlay images), `build_thumbnail_v2.py` (thumbnail)

## Known Issues / Future Work

1. **Thumbnail face**: Webcam face extraction in bottom-left corner is slightly off. Needs manual coordinate tuning in `build_thumbnail_v2.py` (line: `cx, cy, r = 800, 110, 85`).
2. **Browser chrome visible**: Chrome tab bar and address bar show in the video because cropping them would cut the webcam face overlay. Could be fixed by extracting the webcam circle as a separate overlay and compositing it onto a chrome-free crop — more complex but doable.
3. **macOS dock partially visible**: Tiny dock icons visible at the very bottom edge of the video frame. Barely noticeable at playback size.
4. **Promo Videos folder cleanup**: Old files need manual deletion (VM can't delete from mounted folder). Keep only: `Montree_Shorts_9x16.mp4`, `Montree_Social_Square.mp4`, `Montree_Thumbnail.png`, `YOUTUBE_SEO_UPLOAD_GUIDE.md`.

## Upload Plan

User plans to have Sonnet upload the Shorts to YouTube using the SEO guide. The guide contains everything needed: title, description, tags, settings, and the thumbnail.
