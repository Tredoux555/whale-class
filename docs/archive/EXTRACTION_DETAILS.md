# Curriculum Page Extraction Details

## Before and After Comparison

### Original Structure (919 lines)
```
page.tsx (919 lines)
├── Imports
├── Work Interface (25 lines)
├── AREA_ICONS constant
├── AREA_COLORS constant
├── CurriculumPage Component
│   ├── State declarations (15+ state variables)
│   ├── useEffect hooks
│   ├── fetchCurriculum()
│   ├── handleImportCurriculum()
│   ├── openEditModal()              [EXTRACTED]
│   ├── handleGenerateAI()           [EXTRACTED]
│   ├── handleSaveEdit()             [EXTRACTED]
│   ├── deleteWork()
│   ├── stopAutoScroll()             [EXTRACTED]
│   ├── startAutoScroll()            [EXTRACTED]
│   ├── handleDragStart()            [EXTRACTED]
│   ├── handleDragOver()             [EXTRACTED]
│   ├── handleDragLeave()            [EXTRACTED]
│   ├── handleDrop()                 [EXTRACTED]
│   ├── handleDragEnd()              [EXTRACTED]
│   ├── JSX Return
│   │   ├── Header
│   │   ├── Main Content
│   │   │   ├── No Curriculum State
│   │   │   ├── Area Cards
│   │   │   ├── Teaching Tools Section [EXTRACTED]
│   │   │   ├── Selected Area Works    [EXTRACTED]
│   │   │   │   └── 220+ lines of work list JSX
│   │   │   │       ├── Drag-drop handlers
│   │   │   │       ├── Work item rendering
│   │   │   │       └── Expanded details
│   │   │   └── Edit Modal (155 lines)  [EXTRACTED]
│   │   ├── Add Work Modal
│   │   ├── Floating Add Button
│   │   └── Bottom Navigation
```

### New Structure (Modular)

#### Main Page (278 lines - 70% reduction)
```
page.tsx
├── Imports (11 lines total)
│   ├── React hooks
│   ├── next/navigation
│   ├── sonner toast
│   ├── AddWorkModal
│   ├── EditWorkModal         [IMPORTED]
│   ├── TeachingToolsSection  [IMPORTED]
│   ├── CurriculumWorkList    [IMPORTED]
│   ├── types                 [IMPORTED]
│   └── useCurriculumDragDrop [IMPORTED]
├── CurriculumPage Component
│   ├── State (7 variables)
│   │   ├── router
│   │   ├── session
│   │   ├── curriculum
│   │   ├── byArea
│   │   ├── loading
│   │   ├── importing
│   │   ├── selectedArea
│   │   ├── expandedWork
│   │   ├── editingWork
│   │   └── showAddModal
│   ├── useCurriculumDragDrop hook usage
│   ├── useEffect (2 hooks)
│   ├── fetchCurriculum()
│   ├── handleImportCurriculum()
│   ├── deleteWork()
│   └── JSX Return (~120 lines)
│       ├── Toaster
│       ├── Header
│       ├── Main
│       │   ├── No Curriculum UI
│       │   ├── Area Cards
│       │   ├── <TeachingToolsSection />
│       │   └── <CurriculumWorkList />
│       ├── <EditWorkModal />
│       ├── <AddWorkModal />
│       ├── Floating Add Button
│       └── Bottom Navigation
```

#### EditWorkModal (281 lines)
- Manages its own `editForm` state
- Handles AI generation and saving
- Form field validation
- API calls for updates
- Self-contained with minimal props

#### TeachingToolsSection (49 lines)
- Language Guide link
- 3-Part Cards navigation
- Vocab Flashcards navigation
- Uses useRouter internally

#### CurriculumWorkList (265 lines)
- Work item rendering
- Drag-drop visual feedback
- Expandable details
- Quick guide display
- Teacher notes and aims display
- Materials and tags
- Edit/delete buttons
- Auto-scroll integration

#### useCurriculumDragDrop Hook (163 lines)
- Drag-drop state management
- All drag handlers
- Auto-scroll logic
- API calls for reordering
- Encapsulates complex drag behavior

#### types.ts (50 lines)
- Work interface
- EditFormData interface
- AREA_ICONS constant
- AREA_COLORS constant

## Code Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Main page.tsx | 919 lines | 278 lines | -70% |
| Components | 0 | 3 | +3 |
| Custom hooks | 0 | 1 | +1 |
| Type files | 0 | 1 | +1 |
| Total lines (all files) | 919 | 1036 | +12.7% |
| Functions in page | 8 | 3 | -62.5% |
| State variables | 15+ | 10 | -33% |
| Cognitive complexity | High | Low | Lower |

## State Management Flow

### Before (All in one component)
```
page.tsx
├── Session state
├── Curriculum state
├── UI state (selectedArea, expandedWork, etc)
├── Edit state (editingWork, editForm, etc)
├── Drag-drop state (draggedWork, dragOverId, etc)
├── Modal states (showAddModal)
└── Loading states (loading, importing, saving, generating, reordering)
```

### After (Distributed)
```
page.tsx (page-level only)
├── Session state
├── Curriculum state
├── selectedArea
├── expandedWork
├── editingWork
├── showAddModal

EditWorkModal
├── editForm state
├── generating state
├── saving state

useCurriculumDragDrop (hook)
├── draggedWork
├── dragOverId
├── reordering
├── scrollContainerRef
└── autoScrollRef

CurriculumWorkList (props-driven)
└── Receives state, callbacks via props
```

## Data Flow

### Curriculum Loading
```
page.tsx fetchCurriculum()
→ API call
→ setCurriculum() + setByArea()
```

### Work Editing
```
page.tsx: <CurriculumWorkList onEditWork={setEditingWork} />
→ User clicks edit button
→ CurriculumWorkList passes work to onEditWork callback
→ page.tsx sets editingWork state
→ <EditWorkModal editingWork={editingWork} />
→ Modal opens with work data
→ User saves
→ EditWorkModal calls onSaved prop
→ page.tsx calls fetchCurriculum()
→ Modal closes via onClose prop
```

### Work Reordering
```
CurriculumWorkList: onDragStart callback
→ useCurriculumDragDrop handleDragStart
→ User drags work item
→ handleDragOver updates dragOverId, triggers auto-scroll
→ User drops on target
→ handleDrop reorders locally, makes API call
→ Server updates sequence numbers
→ fetchCurriculum refreshes data
```

## Import Dependencies

### EditWorkModal.tsx imports:
- React hooks: useState
- sonner: toast
- ./types: Work, EditFormData

### TeachingToolsSection.tsx imports:
- next/navigation: useRouter

### CurriculumWorkList.tsx imports:
- ./types: Work, AREA_COLORS, AREA_ICONS

### useCurriculumDragDrop.ts imports:
- React hooks: useState, useCallback, useRef
- sonner: toast
- types: Work

### page.tsx imports:
- React hooks: useState, useEffect
- next/navigation: useRouter
- sonner: Toaster, toast
- AddWorkModal
- EditWorkModal
- TeachingToolsSection
- CurriculumWorkList
- types: Work, AREA_ICONS, AREA_COLORS
- useCurriculumDragDrop

## TypeScript Types

All types are defined in `/components/montree/curriculum/types.ts`:

```typescript
// Primary data type
interface Work { 24 properties }

// Form data type
interface EditFormData { 9 properties }

// Constants
const AREA_ICONS: Record<string, string>
const AREA_COLORS: Record<string, string>
```

All components import from types.ts to ensure consistency.

## Browser APIs Used

### Drag and Drop
- DataTransfer API (effectAllowed, setData, dropEffect)
- DragEvent properties (clientY, preventDefault)

### DOM Manipulation
- ScrollTop for auto-scrolling
- getBoundingClientRect for boundary detection

### Animation
- requestAnimationFrame for smooth scrolling
- CSS transitions (Tailwind)

### Network
- Fetch API for curriculum operations
- JSON serialization

### Storage
- localStorage for session persistence
