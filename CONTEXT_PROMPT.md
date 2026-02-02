# Context Prompt - Paste this to start a new session

---

## Project: Montree (Montessori Progress Tracking)

**Repo:** `whale` at `/path/to/whale` (or wherever you cloned it)
**Live URL:** https://teacherpotato.xyz/montree
**Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind

---

## Current Status: Testing Week COMPLETE ✅

All 6 phases of Testing Week preparation are done and deployed:

1. ✅ Capture retake bug fix + note save toast
2. ✅ Photo management (edit/delete/area filter/bulk actions)
3. ✅ Video capture (30s max, MediaRecorder API)
4. ✅ Teacher summary with Guru AI integration
5. ✅ Curriculum drag-drop reordering
6. ✅ Parent portal enhancements (announcements, photos, milestones)

---

## Quick Reference

### Key Files to Read First
```
brain.json          - Project state + session history
HANDOFF.md          - Current handoff with all URLs
docs/PROGRESS_DATA_FLOW.md - How progress tracking works
```

### Teacher Portal URLs
- Dashboard: `/montree/dashboard`
- Capture: `/montree/dashboard/capture`
- Media: `/montree/dashboard/media`
- Curriculum: `/montree/dashboard/curriculum`
- Child Summary: `/montree/dashboard/[childId]/summary`

### Parent Portal URLs
- Login: `/montree/parent/login`
- Signup: `/montree/parent/signup?code=XXXX-XXXX`
- Dashboard: `/montree/parent/dashboard`
- Photos: `/montree/parent/photos`
- Milestones: `/montree/parent/milestones`

### Parent Invite Flow
1. Teacher goes to `/montree/dashboard/[childId]`
2. Clicks "👨‍👩‍👧 Invite Parent" button
3. Generates invite code (XXXX-XXXX, valid 30 days)
4. Shares signup link with parent
5. Parent creates account with invite code + email + password

---

## Database Conventions
- `montree_media` - Photos/videos (has `parent_visible` boolean)
- `montree_child_progress` - Work status per child
- `montree_classroom_curriculum_works` - Classroom-specific curriculum
- Area in progress table = STRING key (e.g., 'practical_life')
- Area in curriculum tables = UUID foreign key

---

## Start Here

Read `brain.json` and `HANDOFF.md` first, then ask what I need help with!
