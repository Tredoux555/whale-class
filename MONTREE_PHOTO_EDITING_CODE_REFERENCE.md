# Montree Photo Editing - Code Reference

## Complete Code Overview

All files have been implemented and integrated. Here's a quick reference to each component and its key functions.

---

## Component Files

### 1. PhotoEditModal.tsx (NEW)
**Purpose:** Modal form for editing photo metadata

**Key Props:**
```typescript
interface PhotoEditModalProps {
  media: MontreeMedia | null;
  childName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedMedia: MontreeMedia) => void;
}
```

**Key State:**
```typescript
const [formData, setFormData] = useState<EditFormData>({
  caption: string;
  work_id: string | null;
  tags: string[];
  child_id: string | null;
});
```

**Key Functions:**
- `handleAddTag()` - Adds tag to list
- `handleRemoveTag()` - Removes tag from list
- `handleSave()` - API call to PATCH /api/montree/media

---

### 2. DeleteConfirmDialog.tsx (NEW)
**Purpose:** Confirmation dialog for deleting photos

**Key Props:**
```typescript
interface DeleteConfirmDialogProps {
  isOpen: boolean;
  count?: number;        // 1 for single, N for bulk
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;  // Loading state
}
```

**Renders:**
- "Delete Photo?" for single (count=1)
- "Delete X Photos?" for bulk (count>1)
- Warning: "This action cannot be undone"
- Delete and Cancel buttons

---

## API Integration

### Update Photo Metadata
```typescript
const response = await fetch('/api/montree/media', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: media.id,
    caption: formData.caption || null,
    work_id: formData.work_id || null,
    tags: formData.tags,
    child_id: formData.child_id || null,
  })
});
const result = await response.json();
// result.media contains updated photo
```

### Delete Single Photo
```typescript
const response = await fetch(`/api/montree/media?id=${photoId}`, {
  method: 'DELETE',
});
// response: { success: true, deletedCount: 1 }
```

### Delete Multiple Photos
```typescript
const ids = ['id1', 'id2', 'id3'];
const response = await fetch(`/api/montree/media?ids=${ids.join(',')}`, {
  method: 'DELETE',
});
// response: { success: true, deletedCount: 3 }
```

---

## Gallery Page Key Functions

### Single Delete Handler
```typescript
const handleDeletePhoto = async () => {
  if (!photoToDelete) return;
  setIsDeleting(true);
  try {
    const response = await fetch(
      `/api/montree/media?id=${photoToDelete.id}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to delete');
    setPhotos(photos.filter(p => p.id !== photoToDelete.id));
    toast.success('Photo deleted successfully');
    setPhotoToDelete(null);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to delete');
  } finally {
    setIsDeleting(false);
  }
};
```

### Bulk Delete Handler
```typescript
const handleBulkDelete = async () => {
  if (selectedIds.size === 0) return;
  setIsDeleting(true);
  try {
    const idsArray = Array.from(selectedIds);
    const response = await fetch(
      `/api/montree/media?ids=${idsArray.join(',')}`,
      { method: 'DELETE' }
    );
    if (!response.ok) throw new Error('Failed to delete photos');
    setPhotos(photos.filter(p => !selectedIds.has(p.id)));
    toast.success(`${selectedIds.size} photos deleted successfully`);
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    setSelectionMode(false);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to delete');
  } finally {
    setIsDeleting(false);
  }
};
```

### Edit Save Handler
```typescript
const handlePhotoUpdated = (updatedMedia: MontreeMedia) => {
  const updatedPhotos = photos.map(p =>
    p.id === updatedMedia.id ? updatedMedia : p
  );
  setPhotos(updatedPhotos);
  setEditingPhoto(null);
  setSelectedPhoto(updatedMedia as GalleryItem);
};
```

---

## Component Integration Points

### Selection Toolbar - Delete Selected Button
```typescript
{selectionMode && selectedIds.size > 0 && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
    <button onClick={() => setShowBulkDeleteConfirm(true)}>
      🗑️ Delete Selected
    </button>
  </div>
)}
```

### MediaGallery - Edit/Delete Callbacks
```typescript
<MediaGallery
  media={items}
  onMediaEdit={(media) => setEditingPhoto(media as GalleryItem)}
  onMediaDelete={(media) => setPhotoToDelete(media as GalleryItem)}
  showActions={!selectionMode}
  // ... other props
/>
```

### Modal Integrations
```typescript
{/* Photo Detail Modal */}
<PhotoDetailView
  onEdit={() => {
    setEditingPhoto(selectedPhoto);
    setSelectedPhoto(null);
  }}
  onDelete={() => {
    setPhotoToDelete(selectedPhoto);
    setSelectedPhoto(null);
  }}
/>

{/* Photo Edit Modal */}
<PhotoEditModal
  media={editingPhoto}
  onSave={handlePhotoUpdated}
/>

{/* Delete Confirmation Dialogs */}
<DeleteConfirmDialog
  isOpen={!!photoToDelete}
  count={1}
  onConfirm={handleDeletePhoto}
  isDeleting={isDeleting}
/>

<DeleteConfirmDialog
  isOpen={showBulkDeleteConfirm}
  count={selectedIds.size}
  onConfirm={handleBulkDelete}
  isDeleting={isDeleting}
/>
```

---

## Styling Classes

### Edit/Delete Buttons on Hover
```css
/* Container */
absolute top-2 left-2 right-2 flex gap-2 
opacity-0 group-hover:opacity-100 transition-opacity

/* Edit Button */
flex-1 px-2 py-1 bg-emerald-500 text-white rounded text-xs 
font-medium hover:bg-emerald-600

/* Delete Button */
flex-1 px-2 py-1 bg-red-500 text-white rounded text-xs 
font-medium hover:bg-red-600
```

### Modal Headers
```css
flex items-center justify-between p-4 border-b 
bg-gradient-to-r from-emerald-50 to-teal-50
```

### Confirmation Dialog
```css
fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4
bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl
w-16 h-16 bg-red-100 rounded-full flex items-center justify-center
```

---

## State Management Pattern

### Gallery Page State
```typescript
// Photo management
const [photos, setPhotos] = useState<GalleryItem[]>([]);
const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
const [editingPhoto, setEditingPhoto] = useState<GalleryItem | null>(null);
const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);

// UI state
const [filterTab, setFilterTab] = useState<FilterTab>('all');
const [selectedArea, setSelectedArea] = useState<string | null>(null);
const [selectedWork, setSelectedWork] = useState<string | null>(null);
const [selectionMode, setSelectionMode] = useState(false);

// Bulk operations
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

// Loading states
const [loading, setLoading] = useState(true);
const [isDeleting, setIsDeleting] = useState(false);
```

---

## Type Definitions

### Edit Form Data
```typescript
interface EditFormData {
  caption: string;
  work_id: string | null;
  tags: string[];
  child_id: string | null;
}
```

### Gallery Items
```typescript
interface GalleryItem extends MontreeMedia {
  area?: string;      // Computed from work
  work_name?: string; // Computed from work
}
```

### Grouped Photos
```typescript
interface GroupedPhotos {
  [key: string]: GalleryItem[];
}
```

---

## Error Handling Pattern

All async operations follow this pattern:

```typescript
try {
  setIsLoading(true);
  const response = await fetch(...);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Operation failed');
  }
  // Process response
  toast.success('Success message');
} catch (err) {
  console.error('Error:', err);
  toast.error(err instanceof Error ? err.message : 'Unknown error');
} finally {
  setIsLoading(false);
}
```

---

## Event Flow

### Edit Flow
```
User clicks Edit
  ↓
setEditingPhoto(photo)
  ↓
PhotoEditModal opens with current data
  ↓
User edits form fields
  ↓
User clicks Save
  ↓
API PATCH /api/montree/media
  ↓
handlePhotoUpdated called
  ↓
Photos array updated
  ↓
Modal closes
  ↓
Gallery refreshes with new data
```

### Delete Flow
```
User clicks Delete
  ↓
setPhotoToDelete(photo)
  ↓
DeleteConfirmDialog appears
  ↓
User confirms
  ↓
API DELETE /api/montree/media?id=xxx
  ↓
handleDeletePhoto called
  ↓
Photos array filtered
  ↓
Dialog closes
  ↓
Gallery refreshes
```

### Bulk Delete Flow
```
User clicks "Delete Selected"
  ↓
setShowBulkDeleteConfirm(true)
  ↓
DeleteConfirmDialog appears with count
  ↓
User confirms
  ↓
API DELETE /api/montree/media?ids=id1,id2,id3
  ↓
handleBulkDelete called
  ↓
Photos filtered, state reset
  ↓
Selection mode exits
  ↓
Gallery refreshes
```

---

## Debugging Tips

### Check Photo Data
```typescript
// Console: Log current photos
console.log('Photos:', photos);

// Console: Log editing photo
console.log('Editing:', editingPhoto);

// Console: Log selected for deletion
console.log('To Delete:', photoToDelete);
```

### Check API Responses
```
Network Tab:
- PATCH /api/montree/media (Update)
  Request: { id, caption, work_id, tags, child_id }
  Response: { success: true, media: {...} }

- DELETE /api/montree/media?id=xxx (Single delete)
  Response: { success: true, deletedCount: 1 }

- DELETE /api/montree/media?ids=id1,id2 (Bulk delete)
  Response: { success: true, deletedCount: 2 }
```

### Check Component State
```
React DevTools:
- editingPhoto: null (not editing)
- photoToDelete: null (not deleting)
- isDeleting: false (not loading)
- selectedIds: Set(0) (no selection)
- selectionMode: false (not in selection mode)
```

---

## Performance Notes

✅ Minimal re-renders - proper dependency arrays
✅ Efficient list operations - filter, map
✅ Lazy loading - available data fetched in modal
✅ Bulk operations - single API call for multiple
✅ Event handling - proper stopPropagation
✅ State updates - batched updates where possible

---

**Code Reference Complete**
