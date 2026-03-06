# RAZ Reading Tracker Enhancement — MAR 4, 2026

## Summary

Enhanced the RAZ Reading Tracker with 3-photo snap flow and Absent status.

**3 Photos in Succession:**
- Photo 1: "Book Read" (the book the child read)
- Photo 2: "Signature" (parent signature confirming reading)
- Photo 3: "New Book" (the new book given to the child)

**Snap-Snap-Snap Flow:**
- Teacher taps photo slot → camera opens
- After photo 1, UI shows pulsing border on photo 2 slot + auto-opens camera after 800ms
- After photo 2, UI shows pulsing border on photo 3 slot + auto-opens camera after 800ms
- After photo 3, flow ends (3 photos complete)
- Can interrupt at any point by manually tapping a different photo slot

**Absent Status:**
- New 4th status button: "Absent" (🚫)
- When "Absent" selected, photo row hides and card opacity reduced to 0.7
- Photos remain captured if child transitions to/from absent
- Status buttons always accessible to change status

## Changes Made

### Database (Migration 135)

```sql
-- New column for 3rd photo
ALTER TABLE raz_reading_records
ADD COLUMN IF NOT EXISTS new_book_photo_url TEXT;

-- Updated status constraint (4 values now)
ALTER TABLE raz_reading_records
ADD CONSTRAINT raz_reading_records_status_check
CHECK (status IN ('read', 'not_read', 'no_folder', 'absent'));
```

### API Route Updates

**File:** `/api/montree/raz/upload/route.ts`
- Handles new photoType 'new_book' → maps to `new_book_photo_url` column
- Validates photoType (must be 'book', 'signature', or 'new_book')

**File:** `/api/montree/raz/route.ts`
- POST endpoint: Validates status against 4 valid values
- PATCH endpoint: Added `new_book_photo_url` to updateable fields, validates status

### Frontend Redesign

**File:** `/app/montree/dashboard/raz/page.tsx`

**Key Changes:**
1. **Photo Grid**: 3-column grid (was 2-column)
   - Each photo is a separate tappable button
   - Photos labeled: "Book Read" 📚, "Signature" ✍️, "New Book" 🎁

2. **Auto-Prompt Flow**:
   - After each photo upload, determines next photo in sequence
   - Shows pulsing amber border on next photo slot (CSS animation)
   - Opens camera automatically after 800ms delay
   - User can interrupt by tapping any photo slot manually
   - Pending timeouts are cancelled if user taps a different child

3. **Absent Status**:
   - 4-button status grid (was 3-button)
   - Absent button: gray styling (#6b7280)
   - When absent: photos row hidden, card opacity 0.7
   - All buttons remain clickable to change status

4. **Stats Bar**: 5 columns (was 4)
   - Added "Absent" count tracking

5. **State Management**:
   - `nextPhotoQueue`: Tracks which child/photo slot should pulse next
   - `autoPromptTimeoutRef`: Stores setTimeout ID for cleanup
   - Cleanup on unmount + when user taps different photo slot

## Audit Results

### Cycle 1: Bugs & Edge Cases ✅
- Fixed response error handling in toggleStatus
- Fixed nextPhotoQueue cleanup when clicking different child's photos
- Fixed disabled button logic (cleaner onClick)
- Added file input reset safety

### Cycle 2: UX Flow ✅
- Snap-snap-snap flow tested end-to-end
- 800ms auto-prompt delay allows visual feedback
- Timeout cancellation prevents ghost prompts when user taps manually
- Cleanup on unmount prevents memory leaks

### Cycle 3: Data Integrity ✅
- All 3 photo columns correctly mapped (book_photo_url, signature_photo_url, new_book_photo_url)
- Status validation on both POST and PATCH routes
- Database constraint enforces 4 valid statuses
- Absent status properly hides photo row
- Status buttons always accessible

## Deployment Checklist

1. **Run Migration 135:**
   ```bash
   psql $DATABASE_URL -f migrations/135_enhance_raz_tracker.sql
   ```

2. **Verify columns:**
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'raz_reading_records'
   AND column_name IN ('new_book_photo_url', 'status');
   ```

3. **Push code:**
   ```bash
   git add -A
   git commit -m "Enhance RAZ tracker: 3-photo flow + Absent status"
   git push origin main
   ```

4. **Test in staging:**
   - Open RAZ tracker page
   - Tap photo slot → camera opens
   - After capturing: next slot pulses → camera auto-opens
   - Repeat for all 3 photos
   - Click "Absent" → photos hide, card dims
   - Click back to "Read" → photos reappear

## Files Modified

- `app/montree/dashboard/raz/page.tsx` (complete rewrite, ~430 lines)
- `app/api/montree/raz/route.ts` (added status validation, new_book_photo_url handling)
- `app/api/montree/raz/upload/route.ts` (photoType mapping for new_book)
- `migrations/135_enhance_raz_tracker.sql` (NEW)

## Known Behaviors

- **Snap-snap-snap**: Automatic camera prompt after each photo (800ms). User can interrupt by tapping another slot or pressing back.
- **Absent visibility**: Photos completely hidden when absent, but status buttons remain fully accessible.
- **Photo persistence**: If child marked absent, then returned to "read" status, photos remain intact (they were never deleted, just hidden).
- **Mobile-first**: All touch targets are 90px tall, 3-column layout responsive to viewport width.

## Future Enhancements (Deferred)

- [ ] Book title input field (already in schema)
- [ ] Notes field (already in schema)
- [ ] Bulk status change (select multiple children)
- [ ] Photo gallery view (review before submitting)
- [ ] Email parent links for signed photos
