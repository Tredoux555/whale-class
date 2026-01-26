# MONTREE SESSION 99 - HANDOFF
## Date: 2026-01-26
## Status: 🔄 MAJOR PIVOT - Native → PWA

---

## 🎯 THE BIG DECISION

**PIVOT FROM NATIVE TO PWA**

| Before | After |
|--------|-------|
| Native iOS (Capacitor/Ionic) | Progressive Web App |
| App Store distribution | Direct web (montree.app) |
| Apple takes 30% | 0% - Direct to HK company |
| Complex build process | Simple Next.js deploys |
| montree-mobile/ codebase | whale/app/montree/ codebase |

**WHY:**
- Web app already works beautifully
- Schools don't find software on App Store
- Apple's 30% cut is massive (vs 2-3% payment processing)
- HK company collects payments directly
- Instant deploys vs App Store review delays

---

## 💰 BUSINESS MODEL

| Item | Details |
|------|---------|
| Company | HK Limited (Tredoux ready to activate) |
| Pricing | ~$50-100/school/year |
| Payments | Direct invoice, bank transfer, Stripe |
| Apple cut | 0% |
| Competitors | Transparent Classroom charges $2-4/student/month |

---

## 🏗️ ARCHITECTURE DECISION

**Multi-tenant Supabase with Row Level Security**

```
One Supabase instance
  └── schools (RLS by school_id)
       └── classrooms
            └── teachers (login codes)
            └── children
                 └── progress
                 └── photos
                 └── observations
```

- Schools can't see each other's data (RLS)
- You can't see their data either (privacy promise)
- Export button lets schools download everything
- Zero-friction onboarding (no school IT setup needed)

---

## 📁 CODEBASE

**ACTIVE (keep developing):**
```
~/Desktop/ACTIVE/whale/app/montree/    ← Web app (THE product)
~/Desktop/ACTIVE/whale/app/api/montree/ ← API routes
~/Desktop/ACTIVE/whale/lib/montree/     ← Utilities
```

**ABANDONED (reference only):**
```
~/Desktop/ACTIVE/montree-mobile/        ← Native app (STOP)
```

---

## 🌐 LIVE URLS

| URL | What it does |
|-----|--------------|
| teacherpotato.xyz/montree | Landing (minimalist) |
| teacherpotato.xyz/montree/demo | Welcome → Demo flow |
| teacherpotato.xyz/montree/demo/disclaimer | Privacy notice |
| teacherpotato.xyz/montree/demo/tutorial | 14-step interactive tutorial |
| teacherpotato.xyz/montree/demo/setup | Redirects to onboarding |
| teacherpotato.xyz/montree/onboarding | 3-step school setup |
| teacherpotato.xyz/montree/login | Teacher login |
| teacherpotato.xyz/montree/dashboard | Teacher dashboard |

---

## ✅ FIXED THIS SESSION

1. **Created /montree/demo/setup** - Was 404, now redirects to /onboarding
2. **Created /api/montree/children** - Returns 6 demo students for tutorial
3. **Added demo fallback in tutorial** - Uses demo students when DB empty
4. **Minimalist landing page** - Dark gradient, single "Begin →" CTA
5. **Video Manager API** - /api/admin/video-manager CRUD operations

---

## 🚀 NEXT STEPS (Priority Order)

### Phase 1: Supabase Multi-tenant
```sql
CREATE TABLE schools (id, name, slug, created_at);
CREATE TABLE classrooms (id, school_id, name, icon, color);
CREATE TABLE teachers (id, classroom_id, name, login_code);
CREATE TABLE children (id, classroom_id, name, photo_url);
CREATE TABLE progress (id, child_id, work_id, status, updated_by);
CREATE TABLE photos (id, child_id, storage_path, taken_by);
```

### Phase 2: Row Level Security
- Teachers only see their classroom
- Schools isolated from each other

### Phase 3: Update Onboarding
- Currently saves to localStorage
- Change to create records in Supabase
- Generate real login codes

### Phase 4: PWA Features
- manifest.json
- Service worker for offline
- "Add to Home Screen" prompt

### Phase 5: Photo Sync
- Camera capture
- Upload to school's Supabase bucket
- Multi-teacher sees all photos

---

## 🔑 KEY FILES

| File | Purpose |
|------|---------|
| app/montree/page.tsx | Landing (minimalist dark) |
| app/montree/demo/page.tsx | Welcome gate |
| app/montree/demo/tutorial/page.tsx | 14-step tutorial (1100+ lines) |
| app/montree/onboarding/page.tsx | 3-step school setup (543 lines) |
| app/montree/dashboard/page.tsx | Teacher dashboard |
| app/montree/dashboard/progress/page.tsx | Progress tracking |
| app/api/montree/children/route.ts | Demo students API |
| docs/HANDOFF_MONTREE_PWA.md | Full architecture doc |

---

## 🧠 MEMORY UPDATES MADE

- MONTREE = PWA (not native)
- Schools pay HK company directly
- No App Store, no 30% cut
- Supabase multi-tenant with RLS
- Handoff: whale/docs/HANDOFF_MONTREE_PWA.md

---

## 📋 QUICK START NEXT SESSION

1. Read this handoff
2. Read whale/docs/HANDOFF_MONTREE_PWA.md for full architecture
3. Start with Supabase schema creation
4. Test at teacherpotato.xyz/montree

---

**The vision is clear. The path is set. Build the future of Montessori.**

🌳
