# Architecture Diagram - Refactored Curriculum Page

## Component Tree

```
CurriculumPage (278 lines)
│
├── useEffect (Auth & Session)
├── useEffect (Fetch Curriculum)
│
├── useCurriculumDragDrop Hook
│   ├── draggedWork state
│   ├── dragOverId state
│   ├── reordering state
│   ├── scrollContainerRef
│   ├── autoScrollRef
│   └── handlers (5 drag, 2 scroll)
│
├── Layout
│   ├── <Toaster /> (sonner)
│   │
│   ├── <Header>
│   │   └── Back button + Title + Add button
│   │
│   ├── <Main>
│   │   ├── Loading spinner (if loading)
│   │   │
│   │   ├── Empty state
│   │   │   └── Import curriculum button
│   │   │
│   │   └── Curriculum loaded
│   │       ├── Import/Re-import button
│   │       │
│   │       ├── Area selection cards
│   │       │   └── onClick → setSelectedArea
│   │       │
│   │       ├── <TeachingToolsSection /> (49 lines)
│   │       │   ├── Language Guide link
│   │       │   ├── 3-Part Cards button
│   │       │   └── Vocab Flashcards button
│   │       │
│   │       └── <CurriculumWorkList /> (265 lines)
│   │           ├── props: selectedArea, works, expandedWork, etc.
│   │           ├── onDragStart → hook
│   │           ├── onDragOver → hook
│   │           ├── onDragLeave → hook
│   │           ├── onDrop → hook (reorder + API)
│   │           ├── onDragEnd → hook
│   │           │
│   │           └── [Work Items]
│   │               ├── Work header (collapsible)
│   │               │   ├── Drag handle
│   │               │   ├── Work name
│   │               │   ├── Age range badge
│   │               │   ├── Edit button → onEditWork(work)
│   │               │   └── Delete button → onDeleteWork(work)
│   │               │
│   │               └── Expanded details
│   │                   ├── Quick guide section
│   │                   ├── Video link (if available)
│   │                   ├── Teacher notes
│   │                   ├── Parent explanation
│   │                   ├── Aims grid (direct/indirect)
│   │                   ├── Materials list
│   │                   ├── Readiness indicators
│   │                   ├── Why it matters section
│   │                   └── Skill tags
│   │
│   ├── <EditWorkModal /> (281 lines)
│   │   ├── controlled by: editingWork state
│   │   ├── internal state:
│   │   │   ├── editForm (9 fields)
│   │   │   ├── generating (AI)
│   │   │   └── saving
│   │   │
│   │   ├── Form fields
│   │   │   ├── Name input
│   │   │   ├── Chinese name input
│   │   │   ├── Age range input
│   │   │   ├── Description textarea
│   │   │   ├── Why it matters textarea
│   │   │   ├── Direct aims textarea
│   │   │   ├── Indirect aims textarea
│   │   │   ├── Materials textarea
│   │   │   └── Teacher notes textarea
│   │   │
│   │   ├── AI Generator
│   │   │   ├── Button → handleGenerateAI()
│   │   │   └── Loading spinner
│   │   │
│   │   └── Actions
│   │       ├── Cancel → onClose()
│   │       └── Save → handleSaveEdit() + onSaved()
│   │
│   ├── <AddWorkModal /> (existing)
│   │   └── controlled by: showAddModal state
│   │
│   ├── Floating Add Button (mobile)
│   │   └── onClick → setShowAddModal(true)
│   │
│   └── Bottom Navigation
│       ├── Home button
│       ├── Curriculum button (active)
│       └── Progress button
```

## Data Flow

### Initialization
```
ComponentMount
  ↓
useEffect[1] → Check localStorage for session
  ↓
setSession(localStorage.montree_session)
  ↓
useEffect[2] → If session exists
  ↓
fetchCurriculum()
  ↓
API: GET /api/montree/curriculum?classroom_id=...
  ↓
setCurriculum() + setByArea()
  ↓
Render area cards
```

### User Selects Area
```
User clicks area card
  ↓
setSelectedArea(area)
  ↓
<CurriculumWorkList /> renders with byArea[area]
```

### User Expands Work
```
User clicks work item
  ↓
setExpandedWork(work.id)
  ↓
Details section shows
```

### User Edits Work
```
User clicks ✏️ button
  ↓
CurriculumWorkList → onEditWork(work)
  ↓
page.tsx: setEditingWork(work)
  ↓
<EditWorkModal /> receives editingWork prop
  ↓
Modal initializes editForm with work data
  ↓
User modifies form fields
  ↓
User clicks "Save Changes"
  ↓
EditWorkModal.handleSaveEdit()
  ↓
API: POST /api/montree/curriculum/update
  ↓
On success:
  ├─ EditWorkModal.onSaved() called
  ├─ page.tsx: fetchCurriculum()
  ├─ Data refreshes
  └─ EditWorkModal.onClose() hides modal
```

### User Deletes Work
```
User clicks 🗑️ button
  ↓
CurriculumWorkList → onDeleteWork(work)
  ↓
page.tsx: deleteWork(work)
  ↓
Confirmation dialog shown
  ↓
If confirmed:
  ├─ API: POST /api/montree/curriculum/delete
  ├─ On success: fetchCurriculum()
  ├─ Data refreshes
  └─ Toast: "Work deleted"
```

### User Drags to Reorder
```
User starts dragging work item
  ↓
CurriculumWorkList.onDragStart(e, work)
  ↓
useCurriculumDragDrop.handleDragStart(e, work)
  ↓
setDraggedWork(work)
  ↓
Work becomes semi-transparent (CSS)
  ↓
User hovers over target
  ↓
CurriculumWorkList.onDragOver(e, targetId)
  ↓
useCurriculumDragDrop.handleDragOver(e, targetId)
  ├─ setDragOverId(targetId)
  └─ Check proximity to scroll edges
      ├─ If near top: startAutoScroll('up', speed)
      ├─ If near bottom: startAutoScroll('down', speed)
      └─ Otherwise: stopAutoScroll()
  ↓
requestAnimationFrame loop scrolls container
  ↓
User releases mouse
  ↓
CurriculumWorkList.onDrop(e, targetWork)
  ↓
useCurriculumDragDrop.handleDrop(e, targetWork)
  ├─ Reorder array locally
  ├─ setByArea() updates UI immediately
  ├─ setReordering(true)
  ├─ API: POST /api/montree/curriculum/reorder
  │   └─ Send: {items: [{id, sequence}, ...]}
  ├─ setReordering(false)
  └─ On success: toast.success('Order saved!')
  ↓
User sees updated order immediately
  ↓
Server confirms persistence
```

### Auto-Scroll During Drag
```
Drag over container near edge
  ↓
handleDragOver checks mouse position
  ↓
Calculate distance from edge (edgeThreshold = 60px)
  ↓
If mouseY < rect.top + edgeThreshold:
  ├─ proximity = 1 - (mouseY - rect.top) / edgeThreshold
  ├─ speed = baseSpeed * Math.max(0.5, proximity)
  └─ startAutoScroll('up', speed)
  ↓
stopAutoScroll() cancels previous animation
  ↓
requestAnimationFrame(() => {
  ├─ scrollContainerRef.current.scrollTop -= speed
  └─ Continue until drag leave or outside threshold
})
```

## State Dependencies

### Main Page State
```
session          → Determined from localStorage
  └─ Used by: fetchCurriculum, deleteWork, drag-drop hook

curriculum      → All works across all areas
  └─ Used by: Rendering area cards, count display

byArea          → Works grouped by area
  └─ Used by: CurriculumWorkList, selectedArea filtering
  └─ Updated by: setByArea (from hook for reordering)

loading         → Initial fetch in progress
  └─ Used by: Loading spinner

importing       → Import curriculum in progress
  └─ Used by: Import button disabled state

selectedArea    → Currently selected area
  └─ Used by: CurriculumWorkList visibility, defaultArea
  └─ Controls: Which area's works are shown

expandedWork    → Currently expanded work ID
  └─ Used by: CurriculumWorkList expansion state

editingWork     → Currently editing work
  └─ Controls: EditWorkModal visibility
  └─ Used by: Modal initialization

showAddModal    → Add work modal visibility
  └─ Controls: AddWorkModal display
```

### Drag-Drop Hook State
```
draggedWork     → Work being dragged
  └─ Used by: Visual feedback (opacity, scale)

dragOverId      → ID of work under cursor
  └─ Used by: Visual feedback (ring, offset)

reordering      → API call in progress
  └─ Used by: Reordering indicator

scrollContainerRef → Reference to scroll container
  └─ Used by: Auto-scroll calculation

autoScrollRef   → Animation frame ID
  └─ Used by: Canceling previous scroll
```

### EditWorkModal State
```
editForm        → Form field values
  └─ Updated by: onChange handlers
  └─ Used by: Form inputs, API payload

generating      → AI generation in progress
  └─ Used by: Generate button disabled state

saving          → Save in progress
  └─ Used by: Save button disabled state
```

## Props Flow

### CurriculumWorkList Props (13 props)
```
Input Props:
- selectedArea: string
- works: Work[]
- expandedWork: string | null
- draggedWork: Work | null
- dragOverId: string | null
- reordering: boolean
- scrollContainerRef: React.RefObject<HTMLDivElement>

Callbacks (State Setters):
- setExpandedWork: (id) => void
- onEditWork: (work) => void          [→ setEditingWork]
- onDeleteWork: (work) => void        [→ deleteWork()]

Drag-Drop Handlers:
- onDragStart: (e, work) => void
- onDragOver: (e, workId) => void
- onDragLeave: () => void
- onDrop: (e, work) => void
- onDragEnd: () => void

Utilities:
- startAutoScroll: (dir, speed) => void
- stopAutoScroll: () => void
```

### EditWorkModal Props (4 props)
```
Input Props:
- editingWork: Work | null
- selectedArea?: string

Callbacks:
- onClose: () => void           [→ setEditingWork(null)]
- onSaved: () => void           [→ fetchCurriculum()]
```

### TeachingToolsSection Props
```
None (uses useRouter internally)
```

## API Integration Points

| Endpoint | Method | Caller | Payload | Response |
|----------|--------|--------|---------|----------|
| `/api/montree/curriculum` | GET | fetchCurriculum | `?classroom_id=...` | `{curriculum, byArea}` |
| `/api/montree/curriculum` | POST | handleImportCurriculum | `{classroom_id, action}` | `{success, seeded}` |
| `/api/montree/curriculum/update` | POST | EditWorkModal.save | `{work_id, name, ...}` | `{success}` |
| `/api/montree/curriculum/delete` | POST | deleteWork | `{work_id}` | `{success}` |
| `/api/montree/curriculum/reorder` | POST | useCurriculumDragDrop.drop | `{classroom_id, area_id, items}` | `{success}` |
| `/api/montree/curriculum/generate-description` | POST | EditWorkModal.generate | `{work_name, teacher_notes, area}` | `{description, why_it_matters}` |

## Performance Characteristics

```
Initial Render: O(1) - Just loading spinner
After Fetch: O(n) - n = total works rendered in CurriculumWorkList
On Area Select: O(m) - m = works in selected area
On Item Expand: O(1) - CSS toggle for single item
On Edit Open: O(1) - Modal state update
On Drag: O(m) - During drag-over, handler called frequently
On Drop: O(m log m) - Reorder (worst case)
```

Consider adding:
- `React.memo()` for TeachingToolsSection (rarely updates)
- Virtual scrolling if work lists exceed 100 items
- Debounced drag handlers if performance issues
