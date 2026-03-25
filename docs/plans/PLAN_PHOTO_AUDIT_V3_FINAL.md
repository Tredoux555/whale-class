# Photo Audit Page — Plan v3 FINAL

## Overview
Page at `/montree/dashboard/photo-audit` for teachers/principals to review and correct Smart Capture classifications during early school onboarding.

## Audit Findings Addressed (from Plan v2 audit)
- CRITICAL: Cross-classroom exposure → teachers CANNOT pass classroom_id param
- CRITICAL: Cache key old format → two-query approach (new + old locale format)
- CRITICAL: WorkWheelPicker needs curriculum data → pre-load on mount
- CRITICAL: Area picker missing → use simple button grid (5 area buttons)
- CRITICAL: Mobile batch bar collision → fixed bottom with z-40, dismiss X
- HIGH: Confidence null → explicit AMBER, not RED
- HIGH: Rate limit 30/min → batch delay 2500ms (24/min safe)
- HIGH: Date range change → reset pagination to page 0
- HIGH: Empty .in() array → early return with empty response
- HIGH: Corrections body fields → document exact required fields

---

## Files to Create (3 new)

### 1. `app/api/montree/audit/photos/route.ts` (~200 lines)

**GET — Fetch photos with confidence for audit view**

Query params:
- zone: 'all'|'green'|'amber'|'red'|'untagged' (default 'all')
- date_from: ISO date (default 7 days ago)
- date_to: ISO date (default now)
- limit: 1-200 (default 100)
- offset: number (default 0)
- classroom_id: string (PRINCIPALS ONLY — ignored for teachers)

**Implementation (step by step):**

```typescript
// Step 1: Auth
const auth = await verifySchoolRequest(request);
if (auth instanceof NextResponse) return auth;

// Step 2: Determine effectiveClassroomId (SECURITY-CRITICAL)
let effectiveClassroomId: string | null;
if (auth.role === 'teacher' || auth.role === 'homeschool_parent') {
  // Teachers ALWAYS use their own classroom — NEVER accept from query
  effectiveClassroomId = auth.classroomId ?? null;
  if (!effectiveClassroomId) {
    return NextResponse.json({ error: 'No classroom assigned' }, { status: 403 });
  }
} else {
  // Principals can filter by classroom (optional)
  const reqClassroom = url.searchParams.get('classroom_id');
  if (reqClassroom) {
    // Verify classroom belongs to principal's school
    const { data: cl } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', reqClassroom)
      .eq('school_id', auth.schoolId)
      .maybeSingle();
    if (!cl) return NextResponse.json({ error: 'Classroom not found' }, { status: 404 });
    effectiveClassroomId = reqClassroom;
  } else {
    effectiveClassroomId = null; // All classrooms in school
  }
}

// Step 3: Date range (captured_at with created_at fallback)
const dateFrom = url.searchParams.get('date_from') || new Date(Date.now() - 7*86400000).toISOString();
const dateTo = url.searchParams.get('date_to') || new Date().toISOString();

// Step 4: Query media with COALESCE date logic
let mediaQuery = supabase
  .from('montree_media')
  .select('id, child_id, work_id, storage_path, thumbnail_path, captured_at, created_at, caption, auto_crop, classroom_id', { count: 'exact' })
  .eq('school_id', auth.schoolId)  // ALWAYS scope to school
  .eq('media_type', 'photo')
  .gte('created_at', dateFrom)     // Use created_at as reliable fallback
  .lte('created_at', dateTo)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

if (effectiveClassroomId) {
  mediaQuery = mediaQuery.eq('classroom_id', effectiveClassroomId);
}

// Zone pre-filter: untagged = work_id IS NULL
const zone = url.searchParams.get('zone') || 'all';
if (zone === 'untagged') {
  mediaQuery = mediaQuery.is('work_id', null);
} else if (zone !== 'all') {
  mediaQuery = mediaQuery.not('work_id', 'is', null); // green/amber/red all have work_id
}

const { data: mediaRows, count: totalCount, error: mediaErr } = await mediaQuery;
if (mediaErr) return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
if (!mediaRows || mediaRows.length === 0) {
  return NextResponse.json({
    success: true, photos: [], total: 0,
    counts: { green: 0, amber: 0, red: 0, untagged: 0 },
    limit, offset
  });
}
```

```typescript
// Step 5: Parallel enrichment queries (3 queries)
const childIds = [...new Set(mediaRows.map(m => m.child_id).filter(Boolean))];
const workIds = [...new Set(mediaRows.map(m => m.work_id).filter(Boolean))];

const [childResult, workResult, confidenceResult] = await Promise.allSettled([
  // Query A: Child names
  childIds.length > 0
    ? supabase.from('montree_children').select('id, name').in('id', childIds)
    : Promise.resolve({ data: [] }),
  
  // Query B: Work names + areas
  workIds.length > 0
    ? supabase.from('montree_classroom_curriculum_works')
        .select('work_id, name, area_key')
        .in('work_id', workIds)
        .eq('school_id', auth.schoolId)
    : Promise.resolve({ data: [] }),
  
  // Query C: Confidence data (TWO-FORMAT approach)
  // New format: photo:{media_id}:{child_id}
  (async () => {
    const newKeys = mediaRows
      .filter(m => m.child_id)
      .map(m => `photo:${m.id}:${m.child_id}`);
    
    if (newKeys.length === 0) return { data: [] };
    
    // Query 1: New format (exact match)
    const { data: newFormat } = await supabase
      .from('montree_guru_interactions')
      .select('question, context_snapshot')
      .in('question', newKeys);
    
    // Query 2: Old locale-suffixed format (LIKE fallback)
    // Only for media NOT found in new format
    const foundMediaIds = new Set(
      (newFormat || []).map(r => r.question.split(':')[1])
    );
    const missingMedia = mediaRows.filter(m => !foundMediaIds.has(m.id) && m.child_id);
    
    let oldFormat: any[] = [];
    if (missingMedia.length > 0 && missingMedia.length <= 50) {
      // Only do LIKE queries for small batches (expensive)
      const oldResults = await Promise.allSettled(
        missingMedia.map(m =>
          supabase
            .from('montree_guru_interactions')
            .select('question, context_snapshot')
            .like('question', `photo:${m.id}:${m.child_id}:%`)
            .limit(1)
            .maybeSingle()
        )
      );
      oldFormat = oldResults
        .filter(r => r.status === 'fulfilled' && r.value?.data)
        .map(r => (r as any).value.data);
    }
    
    return { data: [...(newFormat || []), ...oldFormat] };
  })()
]);

// Step 6: Build lookup maps
const childMap = new Map<string, string>();
if (childResult.status === 'fulfilled') {
  for (const c of (childResult.value as any).data || []) {
    childMap.set(c.id, c.name);
  }
}

const workMap = new Map<string, { name: string; area: string }>();
if (workResult.status === 'fulfilled') {
  for (const w of (workResult.value as any).data || []) {
    workMap.set(w.work_id, { name: w.name, area: w.area_key });
  }
}

const confidenceMap = new Map<string, { confidence: number | null; scenario: string | null }>();
if (confidenceResult.status === 'fulfilled') {
  for (const r of (confidenceResult.value as any).data || []) {
    const parts = r.question.split(':');
    const mediaId = parts[1]; // photo:{mediaId}:{childId}[:locale]
    const snapshot = r.context_snapshot || {};
    const confidence = snapshot.sonnet_confidence ?? snapshot.haiku_confidence ?? null;
    confidenceMap.set(mediaId, {
      confidence,
      scenario: snapshot.scenario || null
    });
  }
}
```

```typescript
// Step 7: Zone classification + response assembly
function classifyZone(workId: string | null, confidence: number | null): string {
  if (!workId) return 'untagged';
  if (confidence === null || confidence === undefined) return 'amber'; // No AI data = needs review
  if (confidence >= 0.85) return 'green';
  if (confidence >= 0.50) return 'amber';
  return 'red';
}

const counts = { green: 0, amber: 0, red: 0, untagged: 0 };
const photos = mediaRows.map(m => {
  const conf = confidenceMap.get(m.id);
  const work = m.work_id ? workMap.get(m.work_id) : null;
  const photoZone = classifyZone(m.work_id, conf?.confidence ?? null);
  counts[photoZone as keyof typeof counts]++;
  
  return {
    id: m.id,
    child_id: m.child_id,
    child_name: childMap.get(m.child_id) || 'Unknown',
    classroom_id: m.classroom_id,
    work_id: m.work_id,
    work_name: work?.name || null,
    area: work?.area || null,
    confidence: conf?.confidence ?? null,
    scenario: conf?.scenario ?? null,
    zone: photoZone,
    thumbnail_path: m.thumbnail_path || m.storage_path,
    auto_crop: m.auto_crop,
    captured_at: m.captured_at || m.created_at,
  };
});

// Step 8: Client-side zone filter for green/amber/red
// (untagged already filtered server-side for efficiency)
const filtered = zone === 'all' || zone === 'untagged'
  ? photos
  : photos.filter(p => p.zone === zone);

return NextResponse.json({
  success: true,
  photos: filtered,
  total: totalCount || 0,
  counts,
  limit,
  offset,
}, {
  headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
});
```

---

### 2. `app/montree/dashboard/photo-audit/page.tsx` (~700 lines)

**State:**
```typescript
const [photos, setPhotos] = useState<AuditPhoto[]>([]);
const [counts, setCounts] = useState({ green: 0, amber: 0, red: 0, untagged: 0 });
const [loading, setLoading] = useState(true);
const [zone, setZone] = useState<'all'|'green'|'amber'|'red'|'untagged'>('all');
const [dateRange, setDateRange] = useState('7d'); // '24h'|'7d'|'30d'|'all'
const [page, setPage] = useState(0);
const [curriculum, setCurriculum] = useState<Record<string, Work[]>>({});

// Correction state
const [correctingPhoto, setCorrectingPhoto] = useState<AuditPhoto | null>(null);
const [pickerArea, setPickerArea] = useState<string>('');
const [pickerOpen, setPickerOpen] = useState(false);
const [showAreaPicker, setShowAreaPicker] = useState(false);

// Batch state
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [batchProcessing, setBatchProcessing] = useState(false);
const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
```

**Curriculum pre-load (on mount):**
```typescript
useEffect(() => {
  // Load curriculum for WorkWheelPicker — same pattern as gallery
  fetch('/api/montree/curriculum')
    .then(r => r.json())
    .then(data => {
      const byArea: Record<string, Work[]> = {};
      for (const w of data.works || []) {
        if (!byArea[w.area_key]) byArea[w.area_key] = [];
        byArea[w.area_key].push(w);
      }
      setCurriculum(byArea);
    })
    .catch(() => {}); // Non-fatal — picker just won't work
}, []);
```

**Fetch photos (zone/date/page changes):**
```typescript
const fetchPhotos = useCallback(async () => {
  setLoading(true);
  const dateFrom = dateRange === '24h' ? new Date(Date.now() - 86400000).toISOString()
    : dateRange === '7d' ? new Date(Date.now() - 7*86400000).toISOString()
    : dateRange === '30d' ? new Date(Date.now() - 30*86400000).toISOString()
    : '2020-01-01T00:00:00Z'; // 'all'
  
  try {
    const res = await fetch(
      `/api/montree/audit/photos?zone=${zone}&date_from=${dateFrom}&limit=100&offset=${page * 100}`
    );
    if (!res.ok) throw new Error('fetch failed');
    const data = await res.json();
    setPhotos(data.photos);
    setCounts(data.counts);
  } catch {
    toast.error(t('audit.fetchError'));
  } finally {
    setLoading(false);
  }
}, [zone, dateRange, page, t]);

useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

// Zone/date change resets pagination
const handleZoneChange = (z: typeof zone) => { setZone(z); setPage(0); };
const handleDateChange = (d: typeof dateRange) => { setDateRange(d); setPage(0); };
```

**Area Picker (simple 5-button grid — no separate component needed):**
```tsx
{showAreaPicker && (
  <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
       onClick={() => setShowAreaPicker(false)}>
    <div className="bg-white rounded-xl p-6 mx-4 max-w-sm"
         onClick={e => e.stopPropagation()}>
      <h3 className="font-bold mb-4">{t('audit.chooseArea')}</h3>
      <div className="grid grid-cols-2 gap-3">
        {['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'].map(area => (
          <button key={area}
            className="p-3 rounded-lg text-sm font-medium border-2"
            style={{ borderColor: AREA_CONFIG[area].color, color: AREA_CONFIG[area].color }}
            onClick={() => {
              setPickerArea(area);
              setShowAreaPicker(false);
              setPickerOpen(true); // Opens WorkWheelPicker with this area
            }}>
            {t(`area.${area}`)}
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

**Single correction flow:**
```typescript
const handleCorrect = (photo: AuditPhoto) => {
  setCorrectingPhoto(photo);
  if (!photo.area) {
    setShowAreaPicker(true); // No area → pick area first
  } else {
    setPickerArea(photo.area);
    setPickerOpen(true); // Has area → go straight to work picker
  }
};

const handleWorkSelected = async (work: Work) => {
  if (!correctingPhoto) return;
  setPickerOpen(false);
  
  try {
    const res = await fetch('/api/montree/guru/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_id: correctingPhoto.id,
        child_id: correctingPhoto.child_id,
        original_work_name: correctingPhoto.work_name || 'Unknown',
        original_work_id: correctingPhoto.work_id || '',
        original_area: correctingPhoto.area || '',
        original_confidence: correctingPhoto.confidence || 0,
        corrected_work_name: work.name,
        corrected_work_id: work.id,
        corrected_area: pickerArea,
      }),
    });
    if (!res.ok) throw new Error('correction failed');
    
    // Optimistic update: move to GREEN
    setPhotos(prev => prev.map(p =>
      p.id === correctingPhoto.id
        ? { ...p, work_id: work.id, work_name: work.name, area: pickerArea, zone: 'green', confidence: 1.0 }
        : p
    ));
    toast.success(t('audit.corrected'));
  } catch {
    toast.error(t('audit.correctionFailed'));
  }
  setCorrectingPhoto(null);
};
```

**Single confirm flow:**
```typescript
const handleConfirm = async (photo: AuditPhoto) => {
  try {
    const res = await fetch('/api/montree/guru/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_id: photo.id,
        child_id: photo.child_id,
        original_work_name: photo.work_name || '',
        original_work_id: photo.work_id || '',
        original_area: photo.area || '',
        original_confidence: photo.confidence || 0,
        action: 'confirm',
      }),
    });
    if (!res.ok) throw new Error('confirm failed');
    
    // Optimistic: mark as confirmed (move to green)
    setPhotos(prev => prev.map(p =>
      p.id === photo.id ? { ...p, zone: 'green', confidence: 1.0 } : p
    ));
    toast.success(t('audit.confirmed'));
  } catch {
    toast.error(t('audit.confirmFailed'));
  }
};
```

**Batch flow (with rate limit protection):**
```typescript
const handleBatchConfirm = async () => {
  const ids = Array.from(selectedIds);
  setBatchProcessing(true);
  setBatchProgress({ current: 0, total: ids.length });
  
  let succeeded = 0;
  const failed: string[] = [];
  
  for (let i = 0; i < ids.length; i++) {
    const photo = photos.find(p => p.id === ids[i]);
    if (!photo) continue;
    
    try {
      await handleConfirm(photo);
      succeeded++;
    } catch {
      failed.push(ids[i]);
    }
    
    setBatchProgress({ current: i + 1, total: ids.length });
    
    // Rate limit protection: 2500ms delay (24/min, under 30/min limit)
    if (i < ids.length - 1) {
      await new Promise(r => setTimeout(r, 2500));
    }
  }
  
  setBatchProcessing(false);
  setSelectedIds(new Set(failed)); // Keep failed selected for retry
  
  if (failed.length === 0) {
    toast.success(t('audit.batchComplete'));
  } else {
    toast.error(t('audit.batchError', { succeeded, total: ids.length }));
  }
};
```

**Photo card component (inline):**
```tsx
function AuditPhotoCard({ photo, selected, onToggle, onConfirm, onCorrect }: {
  photo: AuditPhoto;
  selected: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onCorrect: () => void;
}) {
  const { t } = useI18n();
  const zoneBg = photo.zone === 'green' ? 'bg-emerald-50 border-emerald-300'
    : photo.zone === 'amber' ? 'bg-amber-50 border-amber-300'
    : photo.zone === 'red' ? 'bg-red-50 border-red-300'
    : 'bg-gray-50 border-gray-300';
  const zoneIcon = photo.zone === 'green' ? '✅'
    : photo.zone === 'amber' ? '⚠️'
    : photo.zone === 'red' ? '❌'
    : '➖';
  
  return (
    <div className={`relative rounded-lg border-2 p-2 ${zoneBg}`}>
      {/* Checkbox */}
      <input type="checkbox" checked={selected} onChange={onToggle}
        className="absolute top-1 left-1 z-10 w-4 h-4" />
      
      {/* Thumbnail */}
      <div className="w-full aspect-square rounded overflow-hidden mb-1">
        <img src={`/api/montree/media/proxy/${photo.thumbnail_path}`}
          className="w-full h-full object-cover"
          loading="lazy" decoding="async"
          style={photo.auto_crop ? {
            objectPosition: `${(photo.auto_crop.x + photo.auto_crop.width/2) * 100}% ${(photo.auto_crop.y + photo.auto_crop.height/2) * 100}%`
          } : undefined}
        />
      </div>
      
      {/* Info */}
      <p className="text-xs font-bold truncate">{photo.child_name}</p>
      <p className="text-xs truncate text-gray-600">
        {photo.work_name || t('audit.unidentified')}
      </p>
      <p className="text-xs">
        {zoneIcon} {photo.confidence !== null ? `${Math.round(photo.confidence * 100)}%` : ''}
      </p>
      
      {/* Actions */}
      <div className="flex gap-1 mt-1">
        {photo.work_id && (
          <button onClick={onConfirm}
            className="flex-1 text-xs py-1 bg-emerald-100 text-emerald-700 rounded">
            ✓
          </button>
        )}
        <button onClick={onCorrect}
          className="flex-1 text-xs py-1 bg-amber-100 text-amber-700 rounded">
          ✏️
        </button>
      </div>
    </div>
  );
}
```

**Main page layout:**
```tsx
// Page header + zone tabs
<div className="max-w-4xl mx-auto p-4">
  <div className="flex items-center justify-between mb-4">
    <h1 className="text-xl font-bold">{t('audit.title')}</h1>
    <div className="flex gap-2">
      <select value={dateRange} onChange={e => handleDateChange(e.target.value)}>
        <option value="24h">{t('audit.last24h')}</option>
        <option value="7d">{t('audit.last7d')}</option>
        <option value="30d">{t('audit.last30d')}</option>
        <option value="all">{t('audit.allTime')}</option>
      </select>
      <Link href="/montree/dashboard" className="text-sm">{t('audit.back')}</Link>
    </div>
  </div>
  
  {/* Zone tabs */}
  <div className="flex gap-1 mb-4 overflow-x-auto">
    {(['all', 'green', 'amber', 'red', 'untagged'] as const).map(z => {
      const count = z === 'all' ? Object.values(counts).reduce((a,b) => a+b, 0) : counts[z] || 0;
      const bg = z === 'green' ? 'bg-emerald-100' : z === 'amber' ? 'bg-amber-100'
        : z === 'red' ? 'bg-red-100' : z === 'untagged' ? 'bg-gray-100' : 'bg-blue-100';
      return (
        <button key={z} onClick={() => handleZoneChange(z)}
          className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
            zone === z ? `${bg} font-bold ring-2 ring-offset-1` : 'bg-gray-50'
          }`}>
          {t(`audit.${z === 'all' ? 'allPhotos' : z + 'Zone'}`)} ({count})
        </button>
      );
    })}
  </div>
  
  {/* Photo grid — responsive: 2 cols mobile, 4 cols tablet, 6 cols desktop */}
  {loading ? (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  ) : photos.length === 0 ? (
    <p className="text-center text-gray-500 py-12">{t('audit.noPhotosInZone')}</p>
  ) : (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
      {photos.map(photo => (
        <AuditPhotoCard
          key={photo.id}
          photo={photo}
          selected={selectedIds.has(photo.id)}
          onToggle={() => {
            setSelectedIds(prev => {
              const next = new Set(prev);
              next.has(photo.id) ? next.delete(photo.id) : next.add(photo.id);
              return next;
            });
          }}
          onConfirm={() => handleConfirm(photo)}
          onCorrect={() => handleCorrect(photo)}
        />
      ))}
    </div>
  )}
  
  {/* Pagination */}
  <div className="flex items-center justify-center gap-4 mt-4 mb-20">
    <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
      className="px-3 py-1 rounded bg-gray-100 disabled:opacity-50">
      {t('audit.prev')}
    </button>
    <span className="text-sm text-gray-600">
      {t('audit.page', { current: page + 1, total: Math.ceil((counts.green + counts.amber + counts.red + counts.untagged) / 100) || 1 })}
    </span>
    <button onClick={() => setPage(p => p + 1)}
      className="px-3 py-1 rounded bg-gray-100">
      {t('audit.next')}
    </button>
  </div>
</div>

{/* Batch action bar — fixed bottom, z-40 */}
{selectedIds.size > 0 && !batchProcessing && (
  <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-lg p-3 flex items-center justify-between">
    <span className="text-sm font-medium">
      {t('audit.selected', { count: selectedIds.size })}
    </span>
    <div className="flex gap-2">
      <button onClick={() => setSelectedIds(new Set())} className="text-sm text-gray-500">✕</button>
      <button onClick={handleBatchConfirm} className="px-3 py-1 bg-emerald-500 text-white rounded text-sm">
        {t('audit.confirmAll')}
      </button>
      <button onClick={() => { /* open picker for batch correct */ }}
        className="px-3 py-1 bg-amber-500 text-white rounded text-sm">
        {t('audit.correctAll')}
      </button>
    </div>
  </div>
)}

{/* Batch progress overlay */}
{batchProcessing && (
  <div className="fixed bottom-0 left-0 right-0 z-40 bg-blue-50 border-t p-3 text-center">
    <p className="text-sm font-medium">
      {t('audit.confirming', { current: batchProgress.current, total: batchProgress.total })}
    </p>
    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
      <div className="bg-blue-500 h-2 rounded-full transition-all"
        style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }} />
    </div>
  </div>
)}

{/* WorkWheelPicker */}
<WorkWheelPicker
  isOpen={pickerOpen}
  onClose={() => { setPickerOpen(false); setCorrectingPhoto(null); }}
  area={pickerArea}
  works={curriculum[pickerArea] || []}
  currentWorkName={correctingPhoto?.work_name || undefined}
  onSelectWork={(work) => handleWorkSelected(work)}
/>
```


### 3. i18n keys (~45 in en.ts + zh.ts)

```typescript
// en.ts
'audit.title': 'Photo Audit',
'audit.nav': 'Photo Audit',
'audit.back': 'Back',
'audit.loading': 'Loading photos...',
'audit.fetchError': 'Failed to load photos',
'audit.noPhotos': 'No photos found',
'audit.noPhotosInZone': 'No photos in this category',
'audit.allPhotos': 'All',
'audit.greenZone': 'Confident',
'audit.amberZone': 'Needs Review',
'audit.redZone': 'Low Confidence',
'audit.untaggedZone': 'Untagged',
'audit.confirm': 'Confirm',
'audit.correct': 'Correct',
'audit.confirmed': 'Confirmed!',
'audit.corrected': 'Corrected!',
'audit.confirmAll': 'Confirm All',
'audit.correctAll': 'Correct All',
'audit.selected': '{count} selected',
'audit.confirming': 'Confirming {current}/{total}...',
'audit.correcting': 'Correcting {current}/{total}...',
'audit.batchComplete': 'All done!',
'audit.batchError': '{succeeded} of {total} succeeded',
'audit.unidentified': 'Unidentified',
'audit.chooseArea': 'Choose Area',
'audit.confirmFailed': 'Confirm failed',
'audit.correctionFailed': 'Correction failed',
'audit.last24h': 'Last 24 hours',
'audit.last7d': 'Last 7 days',
'audit.last30d': 'Last 30 days',
'audit.allTime': 'All time',
'audit.page': 'Page {current} of {total}',
'audit.prev': 'Previous',
'audit.next': 'Next',
'audit.percentReviewed': '{percent}% reviewed',

// zh.ts (matching)
'audit.title': '照片审核',
'audit.nav': '照片审核',
'audit.back': '返回',
'audit.loading': '正在加载照片...',
'audit.fetchError': '加载照片失败',
'audit.noPhotos': '没有找到照片',
'audit.noPhotosInZone': '此分类下没有照片',
'audit.allPhotos': '全部',
'audit.greenZone': '高置信',
'audit.amberZone': '需审核',
'audit.redZone': '低置信',
'audit.untaggedZone': '未标记',
'audit.confirm': '确认',
'audit.correct': '修正',
'audit.confirmed': '已确认！',
'audit.corrected': '已修正！',
'audit.confirmAll': '全部确认',
'audit.correctAll': '全部修正',
'audit.selected': '已选 {count} 项',
'audit.confirming': '确认中 {current}/{total}...',
'audit.correcting': '修正中 {current}/{total}...',
'audit.batchComplete': '全部完成！',
'audit.batchError': '{total} 项中成功 {succeeded} 项',
'audit.unidentified': '未识别',
'audit.chooseArea': '选择领域',
'audit.confirmFailed': '确认失败',
'audit.correctionFailed': '修正失败',
'audit.last24h': '最近24小时',
'audit.last7d': '最近7天',
'audit.last30d': '最近30天',
'audit.allTime': '全部时间',
'audit.page': '第 {current} 页，共 {total} 页',
'audit.prev': '上一页',
'audit.next': '下一页',
'audit.percentReviewed': '已审核 {percent}%',
```

## Files to Modify (3)

### 4. `components/montree/DashboardHeader.tsx`
- Add 📋 audit nav icon with `title={t('audit.nav')}` and `aria-label`
- Route: `/montree/dashboard/photo-audit`
- Visible for teachers + principals only (not homeschool parents)

### 5. `lib/montree/i18n/en.ts` — ~35 `audit.*` keys
### 6. `lib/montree/i18n/zh.ts` — ~35 matching Chinese keys

---

## Security Model (hardened from v2 audit)
1. Teachers: FORCED to auth.classroomId. classroom_id query param IGNORED.
2. Principals: classroom_id validated against school ownership (404 if not theirs)
3. All media scoped to auth.schoolId (mandatory .eq filter)
4. Corrections go through existing route with its own auth + child verification
5. Rate limiting: corrections route has 30/min; batch uses 2500ms delay (24/min)

## Performance
1. 4 parallel queries (media + children + works + confidence via Promise.allSettled)
2. Confidence: new-format .in() first, old-format .like() fallback for ≤50 missing items
3. Empty array guards on all .in() queries
4. Server-side pagination LIMIT/OFFSET
5. Loading skeleton (12 shimmer cards)
6. Optimistic UI updates (no re-fetch after confirm/correct)
