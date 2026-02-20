# Quick Reference Guide - Curriculum Page Refactoring

## File Locations and Quick Links

### Type Definitions
**File**: `/components/montree/curriculum/types.ts`
```typescript
export interface Work { /* 24 properties */ }
export interface EditFormData { /* 9 properties */ }
export const AREA_ICONS: Record<string, string>
export const AREA_COLORS: Record<string, string>
```

### Components

#### 1. EditWorkModal
**File**: `/components/montree/curriculum/EditWorkModal.tsx` (281 lines)
**Usage**:
```tsx
<EditWorkModal
  editingWork={editingWork}
  onClose={() => setEditingWork(null)}
  onSaved={fetchCurriculum}
  selectedArea={selectedArea || undefined}
/>
```
**Responsibility**: Edit modal with form, AI generation, and save logic

#### 2. TeachingToolsSection
**File**: `/components/montree/curriculum/TeachingToolsSection.tsx` (49 lines)
**Usage**:
```tsx
<TeachingToolsSection />
```
**Responsibility**: Display teaching tools links (Language Guide, 3-Part Cards, Vocab Flashcards)

#### 3. CurriculumWorkList
**File**: `/components/montree/curriculum/CurriculumWorkList.tsx` (265 lines)
**Usage**:
```tsx
<CurriculumWorkList
  selectedArea={selectedArea}
  works={byArea[selectedArea]}
  expandedWork={expandedWork}
  setExpandedWork={setExpandedWork}
  onEditWork={setEditingWork}
  onDeleteWork={deleteWork}
  reordering={reordering}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
  onDragEnd={handleDragEnd}
  draggedWork={draggedWork}
  dragOverId={dragOverId}
  scrollContainerRef={scrollContainerRef}
  startAutoScroll={startAutoScroll}
  stopAutoScroll={stopAutoScroll}
/>
```
**Responsibility**: Render draggable work items with expandable details

### Hooks

#### useCurriculumDragDrop
**File**: `/hooks/useCurriculumDragDrop.ts` (163 lines)
**Usage**:
```tsx
const {
  draggedWork,
  dragOverId,
  reordering,
  scrollContainerRef,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
  startAutoScroll,
  stopAutoScroll,
} = useCurriculumDragDrop({
  selectedArea,
  byArea,
  setByArea,
  session,
  fetchCurriculum,
});
```
**Responsibility**: Manage all drag-drop state and logic

## Main Page Structure

**File**: `/app/montree/dashboard/curriculum/page.tsx` (278 lines)

### State Management
```tsx
// Session & Auth
const [session, setSession] = useState<any>(null);

// Data
const [curriculum, setCurriculum] = useState<Work[]>([]);
const [byArea, setByArea] = useState<Record<string, Work[]>>({});

// UI
const [selectedArea, setSelectedArea] = useState<string | null>(null);
const [expandedWork, setExpandedWork] = useState<string | null>(null);

// Modals
const [editingWork, setEditingWork] = useState<Work | null>(null);
const [showAddModal, setShowAddModal] = useState(false);

// Loading
const [loading, setLoading] = useState(true);
const [importing, setImporting] = useState(false);
```

### Key Functions
```tsx
const fetchCurriculum = async () => { /* ... */ }
const handleImportCurriculum = async () => { /* ... */ }
const deleteWork = async (work: Work) => { /* ... */ }
```

## Component Hierarchy

```
CurriculumPage
├── Header
├── Main
│   ├── Area Selection Cards
│   ├── TeachingToolsSection
│   └── CurriculumWorkList
│       └── [Work Items] (managed by drag-drop hook)
├── EditWorkModal
├── AddWorkModal
├── Floating Add Button
└── Bottom Navigation
```

## Data Flow Examples

### Opening Edit Modal
```
User clicks edit button in work item
  ↓
CurriculumWorkList calls onEditWork(work)
  ↓
page.tsx: setEditingWork(work)
  ↓
EditWorkModal receives editingWork prop
  ↓
Modal renders with work data
```

### Saving Edited Work
```
User clicks Save in EditWorkModal
  ↓
EditWorkModal.handleSaveEdit()
  ↓
API call to /api/montree/curriculum/update
  ↓
EditWorkModal calls onSaved()
  ↓
page.tsx: fetchCurriculum()
  ↓
EditWorkModal calls onClose()
  ↓
Modal closes
```

### Reordering Works via Drag-Drop
```
User drags work item
  ↓
useCurriculumDragDrop.handleDragStart(e, work)
  ↓
User hovers over target
  ↓
useCurriculumDragDrop.handleDragOver(e, workId)
  ↓
Auto-scroll triggers if near edges
  ↓
User drops on target
  ↓
useCurriculumDragDrop.handleDrop(e, targetWork)
  ↓
Local state updated immediately
  ↓
API call to /api/montree/curriculum/reorder
  ↓
fetchCurriculum() refreshes data
```

## Common Patterns

### Using the Hook
```tsx
const dragDropProps = useCurriculumDragDrop({
  selectedArea,
  byArea,
  setByArea,
  session,
  fetchCurriculum,
});
```

### Passing to Component
```tsx
<CurriculumWorkList
  // ... other props
  onDragStart={dragDropProps.handleDragStart}
  onDragOver={dragDropProps.handleDragOver}
  // ... etc
/>
```

### Form Handling in Modal
```tsx
const [editForm, setEditForm] = useState<EditFormData>({
  name: '',
  name_chinese: '',
  // ... etc
});

// Update form
setEditForm({...editForm, name: newValue})

// Split on newlines for arrays
direct_aims: editForm.direct_aims.split('\n').filter(s => s.trim())
```

## Imports Cheat Sheet

### In page.tsx
```tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import AddWorkModal from '@/components/montree/AddWorkModal';
import EditWorkModal from '@/components/montree/curriculum/EditWorkModal';
import TeachingToolsSection from '@/components/montree/curriculum/TeachingToolsSection';
import CurriculumWorkList from '@/components/montree/curriculum/CurriculumWorkList';
import { Work, AREA_ICONS, AREA_COLORS } from '@/components/montree/curriculum/types';
import { useCurriculumDragDrop } from '@/hooks/useCurriculumDragDrop';
```

### In component files
```tsx
// EditWorkModal.tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Work, EditFormData } from './types';

// TeachingToolsSection.tsx
import { useRouter } from 'next/navigation';

// CurriculumWorkList.tsx
import { Work, AREA_COLORS, AREA_ICONS } from './types';

// useCurriculumDragDrop.ts
import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Work } from '@/components/montree/curriculum/types';
```

## Constants Reference

### AREA_ICONS
```typescript
{
  practical_life: '🧹',
  sensorial: '👁️',
  mathematics: '🔢',
  language: '📚',
  cultural: '🌍'
}
```

### AREA_COLORS (Tailwind)
```typescript
{
  practical_life: 'from-green-400 to-emerald-500',
  sensorial: 'from-orange-400 to-amber-500',
  mathematics: 'from-blue-400 to-indigo-500',
  language: 'from-pink-400 to-rose-500',
  cultural: 'from-purple-400 to-violet-500'
}
```

## API Endpoints Used

| Endpoint | Method | Used In |
|----------|--------|---------|
| `/api/montree/curriculum` | GET | fetchCurriculum() |
| `/api/montree/curriculum` | POST | handleImportCurriculum() |
| `/api/montree/curriculum/update` | POST | EditWorkModal |
| `/api/montree/curriculum/delete` | POST | deleteWork() |
| `/api/montree/curriculum/reorder` | POST | handleDrop() (hook) |
| `/api/montree/curriculum/generate-description` | POST | handleGenerateAI() |

## Testing Tips

### Unit Testing Components
```tsx
// EditWorkModal.tsx
- Test form field updates
- Test AI generation trigger
- Test form submission
- Test close/cancel

// TeachingToolsSection.tsx
- Test navigation buttons
- Test download link

// CurriculumWorkList.tsx
- Test work item rendering
- Test expand/collapse
- Test edit/delete button callbacks
- Test drag-drop visual feedback
```

### Integration Testing
```tsx
// Full workflow test
- Load curriculum
- Select area
- Expand work item
- Click edit
- Modify form
- Save changes
- Verify data refresh
```

## Performance Considerations

1. **EditWorkModal**: Manages its own state to avoid parent re-renders
2. **TeachingToolsSection**: Lightweight, minimal re-renders
3. **CurriculumWorkList**: Receives callbacks, doesn't fetch data
4. **useCurriculumDragDrop**: Encapsulates complex logic away from main component
5. **Main page**: Only re-renders on data changes or modal state

Consider adding `React.memo()` to presentational components if needed:
```tsx
export default React.memo(TeachingToolsSection);
export default React.memo(CurriculumWorkList);
```
