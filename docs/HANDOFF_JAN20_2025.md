# 🐋 Whale Platform Handoff - January 20, 2025

## Current State: v77 LIVE on www.teacherpotato.xyz

---

## ✅ What Was Built This Session

### Student Dashboard - Work Row Touch Targets (v76-77)

The student dashboard work rows now have **three distinct touch targets**:

```
┌─────────────────────────────────────────────────────┐
│  [C]    [○]     Parts of a Plant           📷 2  ∨  │
│   ↑      ↑              ↑                           │
│ HOLD   TAP           TAP                            │
│ wheel  status        expand                         │
└─────────────────────────────────────────────────────┘
```

| Element | Action | Result |
|---------|--------|--------|
| **Area icon** (C, L, M, P, S) | **HOLD 500ms** | Opens iOS-style wheel picker |
| **Status badge** (○, P, Pr, M) | **TAP** | Cycles: Not Started → Presented → Practicing → Mastered |
| **Work name / rest of row** | **TAP** | Expands dropdown with Notes, Demo, Capture, Remove |

### iOS-Style Wheel Picker (v75)

When holding the area icon, a smooth wheel picker opens with:
- **Momentum physics** - exponential decay (325ms time constant)
- **3D barrel effect** - perspective transforms, rotateX
- **Haptic feedback** - 1ms vibration on item change
- **Velocity tracking** - 100ms sampling with moving average
- Works filtered by the area you held (C = Cultural, L = Language, etc.)

### Work Selection Behavior

- Selecting from wheel **REPLACES** the current work in that area
- Only **ONE work per area** displayed at a time
- Old work is deleted, new work is added to weekly assignments

### Remove Button (v77)

In the expanded dropdown panel:
- **"🗑️ Remove from this week"** button at bottom
- Confirmation dialog before deletion
- Removes work from weekly assignments

---

## 📁 Key Files Modified

```
/Users/tredouxwillemse/Desktop/whale/
├── app/montree/dashboard/student/[id]/page.tsx  ← Main student dashboard
└── docs/
    ├── HANDOFF_JAN20_2025.md                    ← This file
    └── SESSION_76_NOTES.md                      ← Session notes
```

---

## 🔧 Technical Details

### Physics State (useRef)
```javascript
wheelPhysics.current = {
  offset: 0,           // Current scroll offset (px)
  velocity: 0,         // Current velocity (px/s)
  amplitude: 0,        // Momentum launch amplitude
  target: 0,           // Target snap position
  timestamp: 0,        // For velocity tracking
  animationId: null,   // requestAnimationFrame ID
  ticker: null,        // 100ms velocity tracker
}
```

### Constants
- `ITEM_HEIGHT`: 44px (iOS standard)
- `TIME_CONSTANT`: 325ms (iOS decay)
- `VELOCITY_THRESHOLD`: 10px/s
- `VISIBLE_ITEMS`: 5

### API Endpoints Used
- `GET /api/classroom/child/[id]/week` - Fetch weekly assignments
- `POST /api/weekly-planning/assignments` - Add work to week
- `DELETE /api/weekly-planning/assignments/[id]` - Remove work from week
- `POST /api/weekly-planning/progress` - Update status/notes
- `GET /api/montree/curriculum/works?area=X` - Fetch works by area

---

## 🧪 Testing Checklist

1. **Status cycling**: Tap ○ badge → cycles P → Pr → M → ○
2. **Row expansion**: Tap work name → dropdown opens with Notes, Demo, Capture, Remove
3. **Wheel picker**: Hold area icon (C/L/M/P/S) for 500ms → wheel opens
4. **Wheel physics**: Flick up/down → momentum scrolling with natural deceleration
5. **Work selection**: Select work from wheel → replaces current work in that area
6. **Remove work**: Tap "Remove from this week" → confirmation → work deleted

---

## 🚀 Deployment

- **Live URL**: https://www.teacherpotato.xyz
- **Railway**: Auto-deploys from `main` branch
- **Latest commit**: `9a2c954` (v77)

---

## 📋 What's Next (User's Priorities)

Per user's top-of-mind from memory:
1. **Whale Platform** is PRIMARY FOCUS until production-perfect
2. Jan 16 presentation deadline (PASSED - verify current status)
3. Multi-user auth system in place (super_admin, school_admin, teacher, parent)
4. Weekly planning system complete with docx upload → Claude parsing

### Potential Next Features
- Parent view/reports
- More polish on teacher dashboard
- Session history/analytics
- Media gallery improvements

---

## 🔑 Access Credentials

- **Admin**: Tredoux / 870602
- **Teacher**: any name / 123
- **Teacher portal**: /teacher/login

---

## 📝 Session Git History

```
9a2c954 feat: add Remove button in expanded panel (v77)
d4797f7 fix: separate touch targets - area=wheel, status=cycle, name=expand (v76)
fa7d3f9 fix: selecting work from wheel adds to weekly assignments (v75.1)
6ee1ca6 feat: iOS-style wheel picker with momentum physics (v75)
```

---

## ⚠️ Known Issues / Notes

1. **Swipe-to-delete** was attempted but reverted - conflicts with touch targets
2. **Wheel picker** only shows works from the held area (by design)
3. **Selecting same work** that's already displayed shows "Already showing" toast

---

*Last updated: January 20, 2025, 20:45 Beijing Time*
