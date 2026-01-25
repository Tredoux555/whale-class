# SESSION 93 HANDOFF
## Capacitor Setup + Disk Cleanup + Desktop Organization
## Date: January 26, 2026

---

# 🎯 THE MISSION

**"Schools buy the app. They own their data. Forever."**

Montree = Montessori progress tracking where schools pay once, own forever. Data lives on THEIR devices. Works offline. No vendor lock-in.

---

# ✅ SESSION 93 ACCOMPLISHMENTS

## 1. Capacitor Native Setup
| Task | Status |
|------|--------|
| Static build config | ✅ `npm run build:native` works |
| 122 pages generated | ✅ Output in `out/` folder |
| iOS platform added | ✅ `npx cap add ios` |
| iOS sync complete | ✅ `npx cap sync ios` |
| ios/ folder created | ✅ Xcode project ready |

## 2. Disk Cleanup (MASSIVE)
| Before | After | Freed |
|--------|-------|-------|
| 7.9GB | 115GB | **102GB** |

**Deleted:**
- iPhone backup: 65GB (MobileSync)
- Cursor caches: 10GB
- Claude VM bundles: 10GB
- iOS Simulators: 6GB
- Photo analysis cache: 12GB
- npm cache, Chrome cache, build folders: ~3GB

## 3. Desktop Organization
| Before | After |
|--------|-------|
| 40 scattered folders | 6 organized folders |

**New Structure:**
```
~/Desktop/
├── ACTIVE/          → whale, jeffy-mvp (WORK HERE)
├── TEACHING/        → All Montessori/school materials
├── BUSINESS/        → Jeffy business docs
├── CODE-ARCHIVE/    → Old code projects (can delete)
├── PERSONAL/        → Music
└── ARCHIVE/         → Old misc files
```

---

# 📁 CRITICAL FILE PATHS

```
PROJECT ROOT:     ~/Desktop/ACTIVE/whale
BRAIN FILE:       ~/Desktop/ACTIVE/whale/brain.json
MISSION CONTROL:  ~/Desktop/ACTIVE/whale/docs/mission-control/
IOS PROJECT:      ~/Desktop/ACTIVE/whale/ios/
STATIC OUTPUT:    ~/Desktop/ACTIVE/whale/out/

JEFFY PROJECT:    ~/Desktop/ACTIVE/jeffy-mvp
JEFFY MISSION:    ~/Desktop/ACTIVE/jeffy-mvp/docs/mission-control/
```

---

# 🔧 KEY FILES MODIFIED/CREATED

## next.config.ts (DUAL MODE)
```typescript
// Supports two modes via CAPACITOR_BUILD env var:
// - Web (default): output: 'standalone' for Railway with API routes
// - Native (CAPACITOR_BUILD=true): output: 'export' for static Capacitor build
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';
```

## package.json scripts
```json
{
  "build:native": "bash scripts/build-native.sh",
  "cap:sync": "npx cap sync",
  "cap:ios": "npm run build:native && npx cap sync ios && npx cap open ios",
  "cap:android": "npm run build:native && npx cap sync android && npx cap open android"
}
```

## scripts/build-native.sh
- Temporarily moves dynamic routes that break static export
- Runs `CAPACITOR_BUILD=true npx next build`
- Restores dynamic routes after build

## lib/platform.ts (NEW)
```typescript
import { Capacitor } from '@capacitor/core';
export function isNative(): boolean { return Capacitor.isNativePlatform(); }
export function isWeb(): boolean { return !isNative(); }
export function getPlatform(): 'ios' | 'android' | 'web' { ... }
```

## Dynamic Route Splits
Two dynamic routes were split into server + client components for static export compatibility:

**Reports:**
- `app/montree/dashboard/reports/[id]/page.tsx` → Server wrapper
- `app/montree/dashboard/reports/[id]/ReportDetailClient.tsx` → Client component

**Games:**
- `app/games/[gameId]/page.tsx` → Server wrapper with generateStaticParams
- `app/games/[gameId]/GamePageClient.tsx` → Client component

---

# 🖥️ BUILD COMMANDS

```bash
# Navigate to project
cd ~/Desktop/ACTIVE/whale

# Web development
npm run dev

# Web production build (for Railway)
npm run build

# Native static build (for Capacitor)
npm run build:native

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Full iOS workflow
npm run cap:ios
```

---

# 📱 CAPACITOR CONFIG

**File:** `capacitor.config.json`
```json
{
  "appId": "xyz.teacherpotato.montree",
  "appName": "Montree",
  "webDir": "out",
  "plugins": {
    "CapacitorSQLite": {
      "iosDatabaseLocation": "Library/CapacitorDatabase"
    }
  }
}
```

**Installed Plugins:**
- @capacitor/core
- @capacitor/ios
- @capacitor/android
- @capacitor/filesystem
- @capacitor/preferences
- @capacitor-community/sqlite

---

# 🧪 TEST DATA

```
URL:           /montree/login
Login Code:    whaleclass-7a4b
Teacher:       Tredoux
Students:      18
School:        Beijing International School
Classroom:     Whale Class 🐋
```

---

# ⏳ CURRENT STATE: WAITING FOR XCODE

Xcode is downloading (~12GB). Once installed:

```bash
# 1. Set Xcode command line tools
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer

# 2. Open iOS project
cd ~/Desktop/ACTIVE/whale
npx cap open ios

# 3. In Xcode:
#    - Select iPhone simulator (top left dropdown)
#    - Click ▶️ Play button
#    - Watch Montree load!
```

---

# 📋 PHASE 2 ROADMAP (Sessions 94-101)

| Session | Focus | Description |
|---------|-------|-------------|
| **94** | SQLite integration | Add database, create schema |
| **95** | Data layer swap | Abstract Supabase → SQLite |
| **96** | Photo storage | Capacitor Filesystem API |
| **97** | Offline-first | Complete local operation |
| **98** | Optional sync | iCloud/Google Drive/NAS choice |
| **99** | Native polish | iOS/Android tweaks |
| **100** | App Store prep | Icons, screenshots, descriptions |
| **101** | LAUNCH 🚀 | Submit to stores |

---

# 🏗️ DATA LAYER ARCHITECTURE (Coming in 94-95)

```
┌─────────────────────────────────────────────────────────────┐
│                         UI LAYER                            │
│            (Same React components for web & native)          │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │    DATA LAYER     │
                    │   (Abstracted)    │
                    └─────────┬─────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
      ┌───────▼───────┐               ┌───────▼───────┐
      │   WEB MODE    │               │  NATIVE MODE  │
      │   Supabase    │               │    SQLite     │
      │   (Cloud)     │               │   (Local)     │
      └───────────────┘               └───────┬───────┘
                                              │
                                      ┌───────▼───────┐
                                      │ Device Storage │
                                      │  (Their Data)  │
                                      └───────────────┘
```

**Key abstraction pattern:**
```typescript
// lib/data/index.ts
import { isNative } from '@/lib/platform';
import * as supabase from './supabase';
import * as sqlite from './sqlite';

export const db = isNative() ? sqlite : supabase;

// Usage anywhere:
import { db } from '@/lib/data';
const children = await db.getChildren(classroomId);
```

---

# ⚠️ INSTRUCTIONS FOR NEXT SESSION

## CRITICAL: SEGMENT YOUR WORK

Break every task into small chunks. After each chunk:

1. **TEST** - Verify it works
2. **SAVE** - Update brain.json with timestamp
3. **COMMIT** - Git commit the progress

Example brain.json update:
```json
{
  "session": 94,
  "lastUpdated": "2026-01-27T10:15:00+08:00",
  "checkpoints": [
    { "time": "10:00", "task": "SQLite package installed" },
    { "time": "10:15", "task": "Schema file created" },
    { "time": "10:30", "task": "Database init working" }
  ]
}
```

## SAVE BRAIN EVERY 5 MINUTES DURING BUILDS

Don't lose progress. The rule:
1. Do small piece of work
2. Test it
3. Update brain.json with what was done
4. Repeat

## IF YOU GLITCH

All context is in:
- `brain.json` - Current state
- This handoff doc - Full context
- Git history - Code changes

## SESSION 94 SPECIFIC TASKS

**Goal:** SQLite integration

1. **Verify Xcode works** (5 min)
   - `npx cap open ios`
   - Build and run in simulator
   - Confirm app loads
   - ✅ CHECKPOINT: Update brain.json

2. **Create SQLite schema** (15 min)
   - File: `lib/db/sqlite-schema.ts`
   - Tables: schools, classrooms, teachers, children, works, progress
   - ✅ CHECKPOINT: Update brain.json

3. **Create SQLite service** (20 min)
   - File: `lib/db/sqlite.ts`
   - Initialize database
   - CRUD operations
   - ✅ CHECKPOINT: Update brain.json

4. **Test SQLite on device** (15 min)
   - Create test page
   - Write data, read data
   - Verify persistence
   - ✅ CHECKPOINT: Update brain.json

5. **Git commit + Final brain update**

---

# 📝 DOCS CREATED THIS SESSION

```
/docs/DISK_CLEANUP_PLAN.md       - Initial cleanup analysis
/docs/SPACE_HOGS_ANALYSIS.md     - Deep Library analysis
/docs/DESKTOP_ORGANIZATION_PLAN.md - Desktop structure plan
/docs/SESSION_93_HANDOFF.md      - THIS FILE
```

---

# 🔐 PROTECTED FILES (NEVER DELETE)

```
~/Desktop/ACTIVE/whale/brain.json
~/Desktop/ACTIVE/whale/docs/mission-control/
~/Desktop/ACTIVE/jeffy-mvp/docs/mission-control/
```

---

# ✅ SESSION 93 COMPLETE CHECKLIST

- [x] Static build working (122 pages)
- [x] iOS platform added
- [x] iOS project synced
- [x] Disk cleaned (102GB freed)
- [x] Desktop organized (40 → 6 folders)
- [x] Xcode downloading
- [x] Handoff document created
- [ ] Xcode installed → Test in simulator (waiting)

---

*Handoff created: January 26, 2026*
*Session: 93*
*Next: Session 94 - SQLite Integration*
*Project: ~/Desktop/ACTIVE/whale*
