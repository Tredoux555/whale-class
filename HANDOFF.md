# WHALE HANDOFF - February 2, 2026
## Session 136: Parent Portal Auth - BLOCKED

---

## 🚨 PRIORITY 1: Parent Invite Codes Not Working

### The Problem
Teacher generates invite code → Parent enters code → **"Could not find child record"**

### What We Know
- The invite code IS being found (otherwise error would be "Invalid access code")
- The `child_id` in the invite doesn't match any child in `montree_children`
- Debug endpoint created but NOT YET DEPLOYED (git lock issues)

### Files Ready to Push
```
app/api/montree/debug/parent-link/route.ts  (NEW - debug endpoint)
public/montree-parent/*                      (NEW - PWA icons)
HANDOFF.md, CLAUDE.md                        (updated)
```

---

## 🔧 DEBUGGING STRATEGY (Start Here Next Session)

### Step 1: Push the pending changes
```bash
cd ~/whale
rm -f .git/HEAD.lock .git/index.lock
git add -A
git commit -m "Add parent link debug endpoint"
git push origin main
```

### Step 2: Check Supabase directly
Go to https://supabase.com/dashboard → Select project → SQL Editor

**Query 1: See all invites**
```sql
SELECT id, child_id, invite_code, is_active, created_at
FROM montree_parent_invites
ORDER BY created_at DESC
LIMIT 10;
```

**Query 2: See all children**
```sql
SELECT id, name, nickname, classroom_id
FROM montree_children
LIMIT 20;
```

**Query 3: Check if Austin exists and get his ID**
```sql
SELECT id, name FROM montree_children WHERE name ILIKE '%austin%';
```

**Query 4: Check if the invite's child_id exists**
```sql
-- Replace CHILD_ID with the child_id from Query 1
SELECT * FROM montree_children WHERE id = 'CHILD_ID_FROM_INVITE';
```

### Step 3: Test locally with logging
Run `npm run dev` and test the flow:
1. Go to Austin's page → Click Invite Parent → Note the code
2. Open browser console, check Network tab
3. Go to `/montree/parent` → Enter the code
4. Check the API response in Network tab

### Step 4: Add verbose logging (if needed)
In `/app/api/montree/parent/auth/access-code/route.ts`, add after line 47:
```typescript
console.log('Found invite:', JSON.stringify(invite, null, 2));
console.log('Looking for child_id:', invite.child_id);
```

And after line 77:
```typescript
console.log('Child lookup result:', { child, childError });
```

---

## 🎯 LIKELY ROOT CAUSES

### Cause 1: Child ID Mismatch
The invite was created with a child_id that doesn't exist. This could happen if:
- Child was deleted after invite was created
- UUID was corrupted during insert
- Wrong child_id was passed to the API

### Cause 2: Different Supabase Projects
Local and production might point to different Supabase databases:
- Check Railway env vars: `NEXT_PUBLIC_SUPABASE_URL`
- Should be: `https://dmfncjjtsoxrnvcdnvjq.supabase.co`

### Cause 3: RLS Policy Blocking
Even with service role, check if there's something weird:
```sql
SELECT * FROM pg_policies WHERE tablename = 'montree_children';
```

---

## 📁 KEY FILES FOR THIS ISSUE

| File | Purpose |
|------|---------|
| `app/api/montree/invites/route.ts` | Generates invite codes (line 68: `child_id: childId`) |
| `app/api/montree/parent/auth/access-code/route.ts` | Validates codes (line 76: child lookup) |
| `app/api/montree/debug/parent-link/route.ts` | Debug endpoint (NOT DEPLOYED YET) |
| `supabase/migrations/095_parent_portal.sql` | Creates `montree_parent_invites` table |

---

## ✅ COMPLETED THIS SESSION

1. Unified parent auth to use `montree_parent_invites` table
2. Fixed Suspense wrapper issues for Next.js 16 build
3. Created PWA icons for parent portal (not linked yet)
4. Created debug endpoint (not deployed yet)
5. Ran migrations 095 and 096

---

## 🗂️ DATABASE SCHEMA

```sql
-- Parent invites (where codes are stored)
montree_parent_invites (
  id UUID PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES montree_children(id),
  invite_code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

-- Children (what we're trying to look up)
montree_children (
  id UUID PRIMARY KEY,
  name TEXT,
  nickname TEXT,
  classroom_id UUID
)
```

---

## 🚀 DEPLOYMENT

**Production:** https://teacherpotato.xyz/montree
**Supabase:** https://dmfncjjtsoxrnvcdnvjq.supabase.co
**Railway:** Auto-deploys on push to main

---

*Updated: February 2, 2026 18:20*
*Status: BLOCKED - Parent auth not working*
*Next: Debug locally, find root cause*
