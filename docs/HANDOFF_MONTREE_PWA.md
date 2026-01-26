# MONTREE PWA - HANDOFF DOCUMENT
## Session 99 → Future Sessions
## Date: 2026-01-26

---

## 🎯 THE PIVOT

**FROM:** Native iOS app (Capacitor/Ionic) fighting App Store  
**TO:** Progressive Web App (PWA) with direct school payments

**WHY:**
- Apple takes 30% → Direct payments = 0%
- App Store review delays → Instant deploys
- Schools don't find software on App Store anyway
- Web app already works beautifully
- HK company collects payments directly

---

## 📍 WHAT EXISTS (KEEP)

### Web App: `~/Desktop/ACTIVE/whale/app/montree/`
```
app/montree/
├── page.tsx                    # Landing page
├── welcome/page.tsx            # Success/welcome screen
├── login/page.tsx              # Teacher login
├── onboarding/page.tsx         # 3-step school setup (542 lines!)
├── demo/
│   ├── page.tsx                # Demo entry
│   ├── disclaimer/page.tsx     # Privacy disclaimer
│   ├── tutorial/page.tsx       # Full interactive tutorial
│   └── zohan/page.tsx          # Personalized demo
├── dashboard/
│   ├── page.tsx                # Teacher dashboard
│   ├── progress/page.tsx       # Progress tracking (285 lines)
│   ├── reports/page.tsx        # Parent reports (301 lines)
│   ├── media/page.tsx          # Photo gallery
│   ├── games/                  # 20+ educational games
│   └── settings/page.tsx
├── admin/                      # School admin panel
├── parent/                     # Parent portal
└── games/                      # Standalone games
```

### Live at: `teacherpotato.xyz/montree`

### Supporting Code:
- `whale/components/montree/` - Reusable components
- `whale/lib/montree/` - Database utilities, types
- `whale/app/api/montree/` - API routes (needs creation)

---

## 🚫 WHAT TO ABANDON

### Native App: `~/Desktop/ACTIVE/montree-mobile/`
- Don't delete yet (has good reference code)
- But stop developing it
- Tutorial.tsx (838 lines) can be referenced for PWA offline

---

## 🏗️ WHAT TO BUILD

### Phase 1: Supabase Multi-Tenant Schema

```sql
-- Schools (top level)
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classrooms belong to schools
CREATE TABLE classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🌳',
  color TEXT DEFAULT '#10b981',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teachers belong to classrooms
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  login_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children belong to classrooms
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress records
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  work_id TEXT NOT NULL,
  status INT DEFAULT 0, -- 0=not started, 1=presented, 2=practicing, 3=mastered
  updated_by UUID REFERENCES teachers(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photos (stored in Supabase Storage)
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  work_id TEXT,
  storage_path TEXT NOT NULL,
  taken_by UUID REFERENCES teachers(id),
  taken_at TIMESTAMPTZ DEFAULT NOW()
);

-- Observations/notes
CREATE TABLE observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  work_id TEXT,
  note TEXT NOT NULL,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 2: Row Level Security (RLS)

```sql
-- Teachers can only see their classroom's data
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers see own classroom children"
ON children FOR ALL
USING (
  classroom_id IN (
    SELECT classroom_id FROM teachers 
    WHERE login_code = current_setting('app.teacher_code', true)
  )
);

-- Same pattern for progress, photos, observations
```

### Phase 3: PWA Setup

Add to `whale/public/`:
```
manifest.json     # App manifest (name, icons, theme)
sw.js             # Service worker for offline
```

Add to `whale/app/layout.tsx`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#10b981" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

### Phase 4: Offline Sync Service

```typescript
// whale/lib/montree/sync.ts

// Queue changes locally when offline
// Sync to Supabase when online
// Handle conflicts (last-write-wins with timestamps)
```

### Phase 5: Update Onboarding Flow

Current onboarding saves to localStorage.
Update to:
1. Create school in Supabase
2. Create classrooms in Supabase  
3. Create teachers with codes in Supabase
4. Show success with copyable codes

---

## 🛤️ USER FLOWS

### Flow 1: New School Onboarding
```
montree.app → "Set Up Your School" → 
Step 1: School name → 
Step 2: Add classrooms (emoji + color) →
Step 3: Add teachers → 
Step 4: Success + login codes
```

### Flow 2: Demo (unchanged)
```
montree.app → "Preview Demo" → 
Disclaimer → Tutorial (offline, fake data)
```

### Flow 3: Teacher Login
```
montree.app → "Teacher Login" →
Enter 6-digit code → Dashboard
```

### Flow 4: Daily Use
```
Dashboard → Tap child → 
Update progress / Take photo / Add note →
Auto-syncs to Supabase when online
```

---

## 💰 BUSINESS MODEL

| Item | Details |
|------|---------|
| Pricing | ~$50-100/year per school (or per classroom) |
| Payments | Direct to HK company bank account |
| Invoicing | Monthly/annual invoices to schools |
| Payment methods | Bank transfer, Stripe, PayPal |
| Apple cut | 0% (not on App Store) |

---

## 📁 FILE LOCATIONS

| What | Where |
|------|-------|
| Web app | `~/Desktop/ACTIVE/whale/app/montree/` |
| Components | `~/Desktop/ACTIVE/whale/components/montree/` |
| Lib/utils | `~/Desktop/ACTIVE/whale/lib/montree/` |
| API routes | `~/Desktop/ACTIVE/whale/app/api/montree/` (create) |
| Native (reference only) | `~/Desktop/ACTIVE/montree-mobile/` |

---

## ✅ NEXT SESSION CHECKLIST

1. [ ] Create Supabase tables (schema above)
2. [ ] Add RLS policies
3. [ ] Create API routes for CRUD
4. [ ] Update onboarding to save to Supabase
5. [ ] Update teacher login to use Supabase
6. [ ] Add PWA manifest + service worker
7. [ ] Test multi-teacher photo sync
8. [ ] Add "Export All Data" button for schools

---

## 🔑 KEY PRINCIPLES

1. **Schools own their data** - Export anytime, RLS keeps it private
2. **Offline-first** - Works without internet, syncs when available
3. **Zero App Store** - Direct relationship with schools
4. **You see nothing** - RLS means you can't access school data
5. **One-time or annual fee** - Not per-student like competitors

---

## 📊 COMPETITOR COMPARISON

| Feature | Transparent Classroom | Montree |
|---------|----------------------|---------|
| Pricing | $2-4/student/month | ~$50-100/school/year |
| Data ownership | They host | Schools own (export anytime) |
| Offline | Limited | Full offline + sync |
| App Store | Yes (30% cut) | No (PWA) |
| Montessori-specific | Yes | Yes |

---

## 🐋 WHALE ADMIN TOOLS (KEEP SEPARATE)

The `/admin` tools at `teacherpotato.xyz/admin` are for YOUR classroom (Whale Class).
These are separate from Montree and should stay that way:
- Card generator
- Label maker  
- Video manager
- Weekly planning
- etc.

Montree = product for other schools
Whale Admin = your personal teaching tools

---

**END OF HANDOFF**
