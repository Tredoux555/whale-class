# Student Photo Gallery

A beautiful, functional photo gallery browser for teachers to view a student's photos organized chronologically and by work/area.

## Features

### 1. Chronological Display
- All photos displayed in reverse chronological order (newest first)
- Shows date and time taken for each photo
- Supports filtering by different views

### 2. Organization Modes

#### All Photos (Default View)
- Groups photos by Work + Area combination
- Shows area icon, work name, and photo count for each group
- Beautiful gradient headers for visual distinction

#### By Area Filter
- Filter tabs for each Montessori area (Practical Life, Sensorial, Math, Language, Cultural)
- Quick selection buttons showing photo count per area
- Displays all photos within selected area

#### By Work Filter
- Browse photos by specific curriculum work
- Shows count of photos per work
- Helps track progress on specific activities

### 3. Photo Interaction

#### View Details
- Click any photo to open a full-screen detail view
- Shows:
  - Full-size image
  - Date and time captured
  - Teacher who captured it
  - Associated area and work
  - Caption (if added)
  - Any tags
  - Child assignment

#### Selection Mode
- Toggle "Select" button to enable/disable selection mode
- Checkboxes on each photo for bulk selection
- "Select All" / "Deselect All" actions
- Selection counter showing how many photos are selected

### 4. Report Integration (Future)
- Selected photos can be added to reports
- "Add to Report" button saves selections for later use in student reports
- Selection state managed locally (can be wired to reports endpoint)

## File Structure

```
/app/montree/dashboard/[childId]/gallery/
├── page.tsx                 # Main gallery page component
└── README.md               # This file

/components/montree/media/
├── PhotoDetailView.tsx     # Read-only photo detail modal
├── MediaGallery.tsx        # Photo grid display
└── MediaCard.tsx           # Individual photo card
```

## Component Props

### Gallery Page
- Automatically fetches child's photos from `/api/montree/media?child_id={childId}`
- Manages:
  - Photo fetching and sorting
  - Filter tab state
  - Photo detail modal
  - Selection mode and selected photo IDs

### PhotoDetailView
- Read-only modal displaying photo details
- Props:
  - `media: MontreeMedia | null` - Photo to display
  - `childName?: string` - Child's name for display
  - `isOpen: boolean` - Modal visibility
  - `onClose: () => void` - Close handler

## API Integration

### GET /api/montree/media
Fetches photos with enhanced data structure:

```typescript
{
  success: true,
  media: [
    {
      id: string;
      child_id: string;
      captured_at: string;          // ISO timestamp
      storage_path: string;
      thumbnail_path: string | null;
      caption: string | null;
      captured_by: string;          // Teacher name
      media_type: 'photo' | 'video';
      tags: string[];
      work_id: string | null;
      area: string | null;          // From joined work table
      work_name: string | null;     // Work name from joined work table
      ...
    },
    // ... more photos
  ],
  total: number;
  limit: number;
  offset: number;
}
```

Query Parameters:
- `child_id` - Filter by student (required for gallery view)
- `limit` - Number of photos (default: 50, gallery uses 1000)
- `offset` - Pagination offset
- `area` - Filter by area
- `untagged_only` - Show only untagged photos

## Styling & Design

### Color Scheme
- Emerald/Teal green theme (matches Montree design)
- Gradient headers for grouped sections
- Blue accents for selection mode
- Subtle shadows and rounded corners

### Responsive
- Mobile-first design
- Full-width on small screens
- Max-width container on desktop
- Touch-friendly buttons and controls

### Dark Mode Ready
- Uses CSS variables for easy theming
- White background with light grays
- High contrast for accessibility

## Usage

### Access the Gallery
1. Navigate to a student's dashboard
2. Click the "📷 Gallery" tab (added to tab bar)
3. View all photos organized by work/area

### Filter Photos
1. **All Photos**: Shows grouped view (default)
2. **By Area**: Select an area from the tabs
3. **By Work**: Select a work from the tabs

### Select Photos for Report
1. Click "Select" button in header
2. Checkboxes appear on each photo
3. Click individual photos or use "Select All"
4. Click "Add to Report" to save selection

### View Photo Details
1. Click any photo to open detail view
2. See full image, metadata, caption, and tags
3. Close to return to gallery

## Future Enhancements

### Report Integration
- Wire "Add to Report" button to save selections
- Store selected photo IDs in report context
- Add ability to include captions in reports

### Export Features
- Download selected photos as ZIP
- Create PDF album with selected photos
- Share photos with parents

### Advanced Filtering
- Date range picker
- Search by caption
- Filter by teacher
- Filter by tags

### Editing Features
- Add/edit captions directly in gallery
- Bulk tag assignment
- Bulk work assignment
- Organize into albums

## Data Structure

Photos are stored with the following metadata:
- `captured_at`: When photo was taken (for sorting)
- `captured_by`: Teacher's name
- `work_id`: Link to curriculum work
- `child_id`: Student assigned to photo
- `caption`: Optional teacher notes
- `tags`: Array of subject tags
- `area`: Montessori area (from work table)
- `work_name`: Display name of work (from work table)

## Error Handling

- Graceful loading states while fetching photos
- Empty state if student has no photos
- Error toast if photo fetch fails
- Fallback images if photo URL can't load

## Performance Notes

- Photos loaded with pagination (default 1000)
- Lazy loading of full-size images on detail view
- Thumbnail URLs for grid display
- Sorted server-side (most recent first)

## Accessibility

- Semantic HTML structure
- ARIA labels on buttons
- Keyboard navigable
- High color contrast
- Touch-friendly (min 44px targets)
