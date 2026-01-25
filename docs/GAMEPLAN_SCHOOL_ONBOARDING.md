# GAMEPLAN: School Onboarding System

## Overview

Build the onboarding funnel so schools can self-serve signup → setup → usage.
Web-first, native-ready.

---

## PHASE 1: Database Foundation (1 session)

### Tasks
1. **Audit existing tables** - Check what we have vs what we need
2. **Create migration** - New tables with RLS
3. **Test RLS** - Verify isolation works

### Deliverables
- [ ] Migration file: `064_school_onboarding.sql`
- [ ] RLS policies on all tenant tables
- [ ] `auth.school_id()` helper function

### Risk: LOW
Just database changes, doesn't affect existing functionality.

---

## PHASE 2: Principal Signup Flow (1-2 sessions)

### Tasks
1. **Signup page** `/montree/signup`
   - School name input
   - Principal email + password
   - Creates: school record, user, links them
   
2. **Email confirmation** 
   - Use Supabase magic link
   - Redirect to setup wizard

3. **Setup wizard** `/montree/admin/setup`
   - Welcome screen
   - Optional: logo upload, timezone
   - Redirect to classroom management

### Deliverables
- [ ] `/montree/signup` page
- [ ] `/api/schools/create` endpoint
- [ ] `/montree/admin/setup` wizard
- [ ] Email template customization

### Risk: LOW
New pages, doesn't touch existing flows.

---

## PHASE 3: Classroom Management (1 session)

### Tasks
1. **Classrooms page** `/montree/admin/classrooms`
   - Grid view (like Supabase tables)
   - "+ Add Classroom" button
   - Edit/delete classrooms

2. **Add classroom modal**
   - Name (required)
   - Icon picker (emoji)
   - Color picker

### UI Reference
```
┌─────────────────────────────────────────────────┐
│  Classrooms                      [+ Add Class]  │
├─────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 🐋       │  │ 🐼       │  │ 🦁       │      │
│  │ Whale    │  │ Panda    │  │ Lion     │      │
│  │ Tredoux  │  │ [Empty]  │  │ [Empty]  │      │
│  │ 22 kids  │  │ 0 kids   │  │ 0 kids   │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

### Deliverables
- [ ] `/montree/admin/classrooms` page
- [ ] Add/edit/delete classroom API
- [ ] Emoji picker component

### Risk: LOW
New functionality.

---

## PHASE 4: Teacher Invitations (1-2 sessions)

### Tasks
1. **Teachers page** `/montree/admin/teachers`
   - List of teachers with status (pending/active)
   - "+ Invite Teacher" button
   - Resend invite option

2. **Invite flow**
   - Enter email
   - Select classroom to assign
   - Send invite email
   
3. **Accept invite** `/montree/accept-invite`
   - Validate token
   - Set password form
   - Link user to school + classroom
   - Redirect to dashboard

### Deliverables
- [ ] `/montree/admin/teachers` page
- [ ] `/api/teachers/invite` endpoint
- [ ] `/montree/accept-invite` page
- [ ] `/api/teachers/accept` endpoint
- [ ] Email template for invite

### Risk: MEDIUM
Involves auth flow - need careful testing.

---

## PHASE 5: Connect to Existing Dashboard (1 session)

### Tasks
1. **Filter by school_id**
   - Dashboard only shows this school's students
   - Works/progress scoped to school

2. **Teacher → Classroom binding**
   - Teacher sees only their classroom
   - Can add students to their classroom

3. **Empty states**
   - "Add your first student" prompt
   - Guide new teachers

### Deliverables
- [ ] Dashboard respects school_id filter
- [ ] Teacher scoped to classroom
- [ ] Empty state UI

### Risk: MEDIUM
Touches existing code - needs testing.

---

## PHASE 6: Student Management Polish (1 session)

### Tasks
1. **Add student quick form**
   - Name (required)
   - DOB (optional)
   - Photo capture (optional)

2. **CSV import**
   - Template download
   - Bulk upload students

3. **Student transfer**
   - Move between classrooms
   - Remove from classroom (soft delete)

### Deliverables
- [ ] Quick add student modal
- [ ] CSV import/export
- [ ] Transfer student UI

### Risk: LOW
Enhancement to existing features.

---

## TOTAL ESTIMATE

| Phase | Sessions | Risk |
|-------|----------|------|
| 1. Database | 1 | LOW |
| 2. Signup Flow | 1-2 | LOW |
| 3. Classrooms | 1 | LOW |
| 4. Teacher Invites | 1-2 | MEDIUM |
| 5. Connect Dashboard | 1 | MEDIUM |
| 6. Student Polish | 1 | LOW |

**Total: 6-8 sessions**

---

## RECOMMENDED ORDER

### Session A (Next)
- Phase 1: Database migration
- Phase 3: Classroom management UI

### Session B
- Phase 2: Principal signup flow

### Session C
- Phase 4: Teacher invitation system

### Session D
- Phase 5: Connect to existing dashboard
- Phase 6: Polish

---

## WHAT TO BUILD FIRST

Start with **Phase 1 + Phase 3** because:

1. **Database first** - Foundation for everything
2. **Classrooms UI** - Visible progress, tests the pattern
3. **Low risk** - Doesn't touch auth yet
4. **Satisfying** - You'll see something working

Then signup flow, then invites.

---

## NATIVE APP NOTES

Everything we build now will work in native because:

1. **UUIDs** - Same IDs work offline
2. **Soft deletes** - PowerSync needs this
3. **updated_at** - Conflict resolution
4. **RLS** - Same security in sync

When we go native:
- PowerSync replaces direct Supabase calls
- Local SQLite for instant loading
- Sync happens in background
- Same UI components work

---

## NEXT ACTION

**Ready to start Phase 1?**

I'll:
1. Check existing tables in your codebase
2. Create the migration file
3. You run it in Supabase
4. Build the classrooms UI

Say "go" and we start.
