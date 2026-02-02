# Whale-Class / Montree - Developer Brain

## Project Overview
Next.js 14 app with two systems:
- **Whale Class** (`/admin/*`) - Mock data, not connected to database
- **Montree** (`/montree/*`) - Real SaaS multi-tenant school management

---

## 🎯 CURRENT STATUS (Feb 2, 2026)

**Parent portal is READY TO TEST on production.**

### What Was Fixed
- Migration 095 applied to Supabase (tables were missing)
- Code deployed to Railway
- Debug endpoint available

### Next Step
Test the full flow from PRODUCTION (not localhost):
1. `teacherpotato.xyz/montree/dashboard` → Open child → Invite Parent
2. `teacherpotato.xyz/montree/parent` → Enter new code

---

## 🔐 Parent Auth System

### How It Works
```
Teacher: Clicks "Invite Parent" → API generates 6-char code → Saved to montree_parent_invites
Parent: Enters code at /montree/parent → API validates → Sets cookie → Redirects to dashboard
```

### Database Tables
```sql
montree_parent_invites (
  id UUID PRIMARY KEY,
  child_id UUID REFERENCES montree_children(id),
  invite_code TEXT UNIQUE,  -- e.g., "ABC123"
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ    -- 30 days from creation
)
```

### Key API Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/montree/invites` | POST | Generate invite code |
| `/api/montree/parent/auth/access-code` | POST | Validate code, create session |
| `/api/montree/debug/parent-link` | GET | Debug: trace code→child linkage |

### Key Files
- `app/api/montree/invites/route.ts` - Code generation
- `app/api/montree/parent/auth/access-code/route.ts` - Code validation
- `app/montree/parent/page.tsx` - Parent login page

---

## 🗄️ Database

### Supabase Project
- URL: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`
- Both localhost and production use THIS SAME database

### Key Tables
- `montree_schools` - Schools
- `montree_classrooms` - Classrooms
- `montree_children` - Students
- `montree_teachers` - Teachers
- `montree_works` - Curriculum works
- `montree_child_work_progress` - Progress tracking
- `montree_parent_invites` - Parent invite codes ← NEW

### Whale Class Data
- Classroom ID: `945c846d-fb33-4370-8a95-a29b7767af54`
- 20 students: Amy, Austin, Eric, Gengerlyn, Hayden, Henry, Jimmy, Joey, Kayla, Kevin, KK, Leo, Lucky, MaoMao, MingXi, NiuNiu, Rachel, Segina, Stella, YueZe

---

## 🚀 Deployment

### Railway
- Auto-deploys on push to `main`
- Production URL: `https://teacherpotato.xyz`

### Environment Variables (Railway)
```
NEXT_PUBLIC_SUPABASE_URL=https://dmfncjjtsoxrnvcdnvjq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
ADMIN_PASSWORD=...
```

---

## 📱 Key Routes

### Teacher Portal
| Route | Purpose |
|-------|---------|
| `/montree/dashboard` | Class list |
| `/montree/dashboard/[childId]` | Child week view |
| `/montree/dashboard/[childId]/progress` | All works |
| `/montree/dashboard/capture` | Photo/video capture |

### Parent Portal
| Route | Purpose |
|-------|---------|
| `/montree/parent` | Login (enter code) |
| `/montree/parent/dashboard` | Parent home |
| `/montree/parent/photos` | Child's photos |
| `/montree/parent/milestones` | Progress timeline |

---

## 🐛 Debug Tools

### Parent Link Debug
```
GET /api/montree/debug/parent-link?code=ABC123
```
Returns: invite data, child lookup result, sample children

### Supabase SQL Editor
Direct database queries at: https://supabase.com/dashboard

---

## 📋 Known Issues

1. **PWA icons not linked** - Icons exist in `/public/montree-parent/` but manifest not added to layout
2. **RLS policies permissive** - Parent tables use "Allow all" - needs refinement
3. **Email sending not tested** - Resend integration ready but not verified

---

## 🔧 Local Development

```bash
cd ~/whale
npm run dev
# Access at http://localhost:3000
```

Both local and production connect to the SAME Supabase database.
