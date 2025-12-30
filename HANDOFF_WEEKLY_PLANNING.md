# 🐋 WHALE CLASS - WEEKLY PLANNING SYSTEM HANDOFF
## December 30, 2025

---

## 📦 INSTALLATION REQUIRED

Run these commands before testing:

```bash
cd ~/Documents/GitHub/whale-class
npm install mammoth react-dropzone
```

---

## 🗄️ DATABASE MIGRATION REQUIRED

Run this SQL in Supabase SQL Editor:
- File: `migrations/012_weekly_planning_system.sql`

This creates:
- 20 Whale Class children (Rachel, YueZe, Lucky, Austin, MingXi, Leo, Joey, Eric, Jimmy, Kevin, NiuNiu, Amy, MaoMao, Henry, Segina, Gengerlyn, Hayden, Kayla, Stella, KK)
- `work_translations` table (Chinese→English mapping for 60+ Montessori works)
- `weekly_plans` table (uploaded documents)
- `weekly_assignments` table (child-work assignments with progress)
- Video URLs added to curriculum_roadmap

---

## 🆕 NEW FILES CREATED

### API Routes
- `/app/api/weekly-planning/upload/route.ts` - Upload & translate .docx plans
- `/app/api/weekly-planning/list/route.ts` - List existing plans
- `/app/api/weekly-planning/assignments/route.ts` - Get assignments for classroom view
- `/app/api/weekly-planning/progress/route.ts` - Update progress status

### Pages
- `/app/admin/weekly-planning/page.tsx` - Upload interface with drag-drop
- `/app/admin/classroom/page.tsx` - iPad-friendly progress tracking

### Documentation
- `/WEEKLY_PLANNING_SYSTEM.md` - Full implementation guide with video URLs

---

## 🖥️ ADMIN DASHBOARD UPDATED

Added 2 new cards:
1. **📅 Weekly Planning** - Upload plans, track progress  
2. **🎯 Classroom View** - iPad-friendly progress tracking

---

## 🔧 HOW IT WORKS

### 1. Upload Weekly Plan
1. Go to `/admin/weekly-planning`
2. Select week number (auto-detects current week)
3. Drag & drop your Chinese .docx file
4. System uses Claude API to:
   - Extract text from document
   - Translate work names using known translations
   - Match works to curriculum database
   - Create assignments for each child

### 2. Track Progress in Classroom
1. Go to `/admin/classroom`
2. Select the week from dropdown
3. Filter by curriculum area (optional)
4. **Tap status badge to cycle: ○ → P → Pr → M**
   - ○ Not started
   - P Presented
   - Pr Practicing  
   - M Mastered
5. Tap ▶️ to watch training video for any work

### 3. Progress Status Meanings
| Status | Symbol | Meaning |
|--------|--------|---------|
| Not Started | ○ | Work not yet introduced |
| Presented | P | First introduction given |
| Practicing | Pr | Working independently |
| Mastered | M | Full understanding demonstrated |

---

## 🎥 VIDEO RESOURCES INCLUDED

50+ curated YouTube videos from:
- My Works Montessori (AMS certified)
- Global Montessori Network (AMI + AMS)
- Info Montessori (Traditional AMI)
- Montessori Guide (AMI documentary)
- Sustainable Montessori (Math operations)

All 5 areas covered:
- Practical Life: Food prep, dressing frames, cleaning
- Sensorial: Trinomial, Binomial, Pink Tower, Cylinders
- Mathematics: Golden Beads, Stamp Game, Number Rods
- Language: Sandpaper Letters, Pink/Blue/Green Series
- Culture: Globes, Maps, Parts of animals/plants

---

## 🧪 TESTING CHECKLIST

- [ ] Run migration SQL in Supabase
- [ ] Install npm packages (mammoth, react-dropzone)
- [ ] Upload Week 17 .docx file
- [ ] Verify translations appear correctly
- [ ] Test progress cycling in Classroom View
- [ ] Verify videos play in modal

---

## 🔮 NEXT STEPS (Future Phases)

### Phase 3: Reports
- AI-generated parent reports
- Natural language summaries
- Export to .docx format

### Enhancements
- Offline support (PWA)
- Parent portal with read-only progress view
- Bulk video assignment to curriculum

---

## 📁 FILE STRUCTURE

```
whale-class/
├── app/
│   ├── admin/
│   │   ├── weekly-planning/
│   │   │   └── page.tsx          # Upload interface
│   │   ├── classroom/
│   │   │   └── page.tsx          # Progress tracking
│   │   └── page.tsx              # Dashboard (updated)
│   └── api/
│       └── weekly-planning/
│           ├── upload/route.ts
│           ├── list/route.ts
│           ├── assignments/route.ts
│           └── progress/route.ts
├── migrations/
│   └── 012_weekly_planning_system.sql
└── WEEKLY_PLANNING_SYSTEM.md
```

---

## 🚀 QUICK START

```bash
# 1. Install dependencies
npm install mammoth react-dropzone

# 2. Run migration in Supabase SQL Editor
# Copy content from migrations/012_weekly_planning_system.sql

# 3. Start dev server
npm run dev

# 4. Go to http://localhost:3000/admin
# 5. Click "Weekly Planning" card
# 6. Upload your Week 17 .docx file
```

---

**Questions? The WEEKLY_PLANNING_SYSTEM.md has detailed video URLs and implementation notes.**
