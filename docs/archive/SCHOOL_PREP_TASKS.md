# School Prep Tasks - Tredoux
## Date: 2025-12-30

---

## PRIORITY 1: English Area Setup (MUST DO)

### Classroom Physical Setup
- [ ] Arrange English learning materials on shelves
- [ ] Label all materials clearly
- [ ] Create word walls / vocabulary displays
- [ ] Set up reading corner
- [ ] Organize phonics materials
- [ ] Prepare writing station

### Progress Tracking System (Whale Admin)
**Build in Whale Admin Panel:**
- [ ] Student roster with English level assignments
- [ ] Weekly work assignments per child
- [ ] Progress checkboxes for completed work
- [ ] Print view for individual child worksheets

---

## PRIORITY 2: Child Progress Print Tool (MUST HAVE)

### English Work Sheet (Per Child)
Create printable page showing:
```
┌─────────────────────────────────────────┐
│  [Child Name]          Date: _________  │
│  Class: ___________                     │
├─────────────────────────────────────────┤
│  ENGLISH WORK THIS WEEK                 │
│                                         │
│  □ Phonics: ________________________    │
│  □ Reading: ________________________    │
│  □ Writing: ________________________    │
│  □ Vocabulary: _____________________    │
│  □ Comprehension: __________________    │
│                                         │
│  Teacher Notes:                         │
│  _____________________________________  │
│                                         │
└─────────────────────────────────────────┘
```

### Implementation in Whale
Location: teacherpotato.xyz admin panel
1. Add "Print Child Sheet" button
2. Generate PDF/printable HTML
3. Include assigned work from database
4. One page per child

---

## PRIORITY 3: Montessori Assessment Videos (MUST DO)

### Videos to Watch
- [ ] List all required assessment videos
- [ ] Create checklist in Whale
- [ ] Track completion status
- [ ] Note key points for assessment

### Video Tracking in Whale
- Add video completion checkboxes
- Progress bar showing % complete
- Quick access to incomplete videos

---

## NICE TO HAVE: Montessori Work Sheet

### Add to Child Print Page (Optional)
```
┌─────────────────────────────────────────┐
│  MONTESSORI WORK                        │
│                                         │
│  Practical Life:                        │
│  □ _________________________________    │
│                                         │
│  Sensorial:                             │
│  □ _________________________________    │
│                                         │
│  Math:                                  │
│  □ _________________________________    │
│                                         │
│  Language:                              │
│  □ _________________________________    │
│                                         │
│  Cultural:                              │
│  □ _________________________________    │
└─────────────────────────────────────────┘
```

---

## WHALE PROJECT TASKS

### Admin Panel Updates Needed
1. **Student Management**
   - Add/edit students
   - Assign English level
   - Assign weekly work

2. **Work Assignment System**
   - Create work templates
   - Assign to individual children
   - Track completion

3. **Print Function**
   - Generate child work sheets
   - PDF export
   - Batch print all children

4. **Video Tracking**
   - Montessori assessment video list
   - Completion checkboxes
   - Progress tracking

### Database Schema (if needed)
```sql
-- Student work assignments
CREATE TABLE student_work (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  work_type VARCHAR(50), -- 'english', 'montessori'
  work_description TEXT,
  assigned_date DATE,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE
);
```

---

## HANDOFF TO WEB CLAUDE

### Whale Project Info
- URL: https://teacherpotato.xyz
- Repo: ~/Documents/GitHub/whale-class
- See: HANDOFF_DEC29_2025.md in whale-class folder

### Tasks for Web Claude
1. Fix story admin login (500 error)
2. Add student work assignment feature
3. Add print child sheet function
4. Add video tracking for assessment prep

### Guardian Connect
- See: ~/Documents/GitHub/guardian-connect/HANDOFF_DEC30_2025.md
- Fix Railway deployment
- Test login once backend works
