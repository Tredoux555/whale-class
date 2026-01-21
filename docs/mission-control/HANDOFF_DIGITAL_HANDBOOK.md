# 🐋 HANDOFF: Digital Montessori Handbook

> **Created:** January 21, 2026
> **Priority:** HIGH - Phase 1 Priority 3
> **Status:** FRAMEWORK DESIGNED - Ready to Build
> **Estimated Build Time:** 2-3 hours for full framework

---

## 🎯 MISSION OBJECTIVE

Build a comprehensive, interactive Digital Handbook that displays ALL 213 Montessori works with expandable sections for teachers to reference during classroom work.

**The Vision:** A teacher can pull up their phone/tablet, tap "Practical Life → Transfer Activities → Spooning" and instantly see:
- Step-by-step presentation
- Materials needed
- What to observe
- Common mistakes
- Video link

---

## 🔑 CRITICAL INSIGHT: NO DEEP DIVES NEEDED

**All the data already exists.** We've done the hard work. The curriculum JSON files contain everything:

```
/lib/curriculum/data/
├── practical-life.json   (~45 works)
├── sensorial.json        (~35 works)
├── math.json             (~50 works)
├── language.json         (~45 works)
└── cultural.json         (~38 works)
```

### Each Work Already Contains:
- `id`, `name`, `description`
- `ageRange` (primary_year1, primary_year2)
- `prerequisites` (array of work IDs)
- `materials` (array of strings)
- `directAims` (array)
- `indirectAims` (array)
- `controlOfError` (string)
- `chineseName` (Chinese translation)
- `levels` (array with `level`, `name`, `description`, `videoSearchTerms`)

### What We DON'T Have Yet (Add Incrementally):
- `presentationSteps` - Step-by-step instructions (add over time)
- `pointsOfInterest` - What captures child's attention
- `videoUrl` - Actual YouTube links (we have search terms)
- `buyLinks` - Jeffy/Taobao procurement links

---

## 📁 FILES TO CREATE

### 1. Main Handbook Landing Page
```
/app/admin/handbook/page.tsx
```
Shows 5 area cards (Practical Life, Sensorial, Math, Language, Culture)

### 2. Dynamic Area Pages
```
/app/admin/handbook/[areaId]/page.tsx
```
Shows categories and works for selected area with expandable accordions

### 3. Reusable Components
```
/components/handbook/
├── AreaCard.tsx           - Clickable area card with icon/color
├── CategoryAccordion.tsx  - Expandable category section
├── WorkDetail.tsx         - Full work display with all fields
└── LevelProgress.tsx      - Shows levels within a work
```

---

## 🏗️ BUILD STEPS (Execute in Order)

### STEP 1: Create Handbook Landing Page (20 min)

Create `/app/admin/handbook/page.tsx`:

```tsx
'use client';

import Link from 'next/link';

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🌱', color: '#4CAF50', bgColor: '#E8F5E9', works: 45 },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#9C27B0', bgColor: '#F3E5F5', works: 35 },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#2196F3', bgColor: '#E3F2FD', works: 50 },
  { id: 'language', name: 'Language', icon: '📖', color: '#FF9800', bgColor: '#FFF3E0', works: 45 },
  { id: 'cultural', name: 'Culture', icon: '🌍', color: '#795548', bgColor: '#EFEBE9', works: 38 },
];

export default function HandbookPage() {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold">📚 Digital Montessori Handbook</h1>
          <p className="text-teal-100">213 Works • Complete Teacher Reference</p>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {AREAS.map(area => (
            <Link 
              key={area.id} 
              href={`/admin/handbook/${area.id}`}
              className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all hover:scale-102 overflow-hidden"
            >
              <div className="p-6" style={{ backgroundColor: area.bgColor }}>
                <div className="text-5xl mb-3">{area.icon}</div>
                <h2 className="text-2xl font-bold" style={{ color: area.color }}>{area.name}</h2>
                <p className="text-gray-600">{area.works} works</p>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-6 bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
          <h3 className="font-bold text-blue-800 mb-2">💡 How to Use This Handbook</h3>
          <ul className="text-blue-700 space-y-1">
            <li>• Click an area to see all categories and works</li>
            <li>• Expand any work to see aims, materials, and presentation</li>
            <li>• Use during classroom prep or while presenting to children</li>
            <li>• Chinese translations included for ESL communication</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
```

### STEP 2: Create Dynamic Area Page (45 min)

Create `/app/admin/handbook/[areaId]/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Import curriculum data
import practicalLifeData from '@/lib/curriculum/data/practical-life.json';
import sensorialData from '@/lib/curriculum/data/sensorial.json';
import mathData from '@/lib/curriculum/data/math.json';
import languageData from '@/lib/curriculum/data/language.json';
import culturalData from '@/lib/curriculum/data/cultural.json';

const AREA_DATA: Record<string, any> = {
  practical_life: practicalLifeData,
  sensorial: sensorialData,
  mathematics: mathData,
  language: languageData,
  cultural: culturalData,
};

const AREA_META: Record<string, { name: string; icon: string; color: string }> = {
  practical_life: { name: 'Practical Life', icon: '🌱', color: '#4CAF50' },
  sensorial: { name: 'Sensorial', icon: '👁️', color: '#9C27B0' },
  mathematics: { name: 'Mathematics', icon: '🔢', color: '#2196F3' },
  language: { name: 'Language', icon: '📖', color: '#FF9800' },
  cultural: { name: 'Culture', icon: '🌍', color: '#795548' },
};

export default function AreaHandbookPage() {
  const params = useParams();
  const router = useRouter();
  const areaId = params.areaId as string;
  
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [expandedWorks, setExpandedWorks] = useState<string[]>([]);
  
  const data = AREA_DATA[areaId];
  const meta = AREA_META[areaId];
  
  if (!data || !meta) {
    return <div className="p-8 text-center">Area not found</div>;
  }
  
  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };
  
  const toggleWork = (workId: string) => {
    setExpandedWorks(prev => 
      prev.includes(workId) ? prev.filter(w => w !== workId) : [...prev, workId]
    );
  };
  
  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)` }}>
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button onClick={() => router.back()} className="mb-2 text-white/80 hover:text-white">
            ← Back to Handbook
          </button>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{meta.icon}</span>
            <div>
              <h1 className="text-3xl font-bold">{meta.name}</h1>
              <p className="opacity-80">{data.categories?.length || 0} categories • {data.description}</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {data.categories?.map((category: any) => (
          <div key={category.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: meta.color }}>
                  {category.sequence}
                </span>
                <div className="text-left">
                  <h2 className="font-bold text-lg">{category.name}</h2>
                  <p className="text-sm text-gray-500">{category.works?.length || 0} works • {category.description}</p>
                </div>
              </div>
              <span className="text-2xl text-gray-400">
                {expandedCategories.includes(category.id) ? '▼' : '▶'}
              </span>
            </button>
            
            {/* Works List */}
            {expandedCategories.includes(category.id) && (
              <div className="border-t divide-y">
                {category.works?.map((work: any) => (
                  <div key={work.id}>
                    {/* Work Header */}
                    <button
                      onClick={() => toggleWork(work.id)}
                      className="w-full p-4 pl-16 flex items-center justify-between hover:bg-gray-50 transition"
                    >
                      <div className="text-left">
                        <h3 className="font-medium">{work.name}</h3>
                        <p className="text-sm text-gray-500">{work.ageRange?.replace('_', ' ')} • {work.chineseName}</p>
                      </div>
                      <span className="text-gray-400">
                        {expandedWorks.includes(work.id) ? '▼' : '▶'}
                      </span>
                    </button>
                    
                    {/* Work Details */}
                    {expandedWorks.includes(work.id) && (
                      <div className="p-4 pl-16 bg-gray-50 space-y-4">
                        <p className="text-gray-700">{work.description}</p>
                        
                        {/* Materials */}
                        {work.materials?.length > 0 && (
                          <div>
                            <h4 className="font-medium text-amber-700 mb-1">🛒 Materials</h4>
                            <div className="flex flex-wrap gap-2">
                              {work.materials.map((mat: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm">{mat}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Aims */}
                        <div className="grid md:grid-cols-2 gap-4">
                          {work.directAims?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-green-700 mb-1">🎯 Direct Aims</h4>
                              <ul className="text-sm text-green-800">
                                {work.directAims.map((aim: string, i: number) => (
                                  <li key={i}>• {aim}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {work.indirectAims?.length > 0 && (
                            <div>
                              <h4 className="font-medium text-blue-700 mb-1">🌱 Indirect Aims</h4>
                              <ul className="text-sm text-blue-800">
                                {work.indirectAims.map((aim: string, i: number) => (
                                  <li key={i}>• {aim}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {/* Control of Error */}
                        {work.controlOfError && (
                          <div>
                            <h4 className="font-medium text-red-700 mb-1">⚠️ Control of Error</h4>
                            <p className="text-sm text-red-800">{work.controlOfError}</p>
                          </div>
                        )}
                        
                        {/* Prerequisites */}
                        {work.prerequisites?.length > 0 && (
                          <div>
                            <h4 className="font-medium text-purple-700 mb-1">🔗 Prerequisites</h4>
                            <div className="flex flex-wrap gap-2">
                              {work.prerequisites.map((pre: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">{pre}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Levels */}
                        {work.levels?.length > 0 && (
                          <div>
                            <h4 className="font-medium text-indigo-700 mb-2">📊 Progression Levels</h4>
                            <div className="space-y-2">
                              {work.levels.map((level: any, i: number) => (
                                <div key={i} className="flex items-start gap-3 p-2 bg-white rounded-lg">
                                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                                    {level.level}
                                  </span>
                                  <div>
                                    <p className="font-medium text-sm">{level.name}</p>
                                    <p className="text-xs text-gray-600">{level.description}</p>
                                    {level.videoSearchTerms?.[0] && (
                                      <a 
                                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(level.videoSearchTerms[0])}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-red-600 hover:underline mt-1 inline-block"
                                      >
                                        🎬 Search YouTube
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </main>
    </div>
  );
}
```

### STEP 3: Add Navigation Link (5 min)

Add link to handbook in admin hub or sidebar:

```tsx
<Link href="/admin/handbook">
  📚 Digital Handbook
</Link>
```

### STEP 4: Test All Areas (10 min)

Navigate to each area and verify:
- ✅ All categories load
- ✅ All works expand
- ✅ All fields display
- ✅ YouTube links work
- ✅ Chinese names show

---

## 🎨 UI STRUCTURE REFERENCE

```
┌─────────────────────────────────────────────────────────┐
│  📚 DIGITAL HANDBOOK                                    │
├─────────────────────────────────────────────────────────┤
│  🌱 Practical Life    │  👁️ Sensorial                   │
│  🔢 Mathematics       │  📖 Language                    │
│  🌍 Culture           │                                 │
└─────────────────────────────────────────────────────────┘
         ↓ Click Area
┌─────────────────────────────────────────────────────────┐
│  🌱 PRACTICAL LIFE                                      │
├─────────────────────────────────────────────────────────┤
│  1 │ Preliminary Exercises (10 works)           ▶       │
│  2 │ Transfer Activities (10 works)             ▶       │
│  3 │ Dressing Frames (12 works)                 ▶       │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
         ↓ Click Category
┌─────────────────────────────────────────────────────────┐
│  1 │ Preliminary Exercises                      ▼       │
├─────────────────────────────────────────────────────────┤
│      Carrying a Mat • primary_year1 • 蒙特梭利工作毯  ▶  │
│      Carrying a Chair • primary_year1 • 蒙特梭利椅子  ▶  │
│      Walking on the Line • primary_year1 • 走线       ▶  │
│      ...                                                │
└─────────────────────────────────────────────────────────┘
         ↓ Click Work
┌─────────────────────────────────────────────────────────┐
│  Walking on the Line                            ▼       │
├─────────────────────────────────────────────────────────┤
│  Walking carefully on a line marked on floor...         │
│                                                         │
│  🛒 Materials                                           │
│  [Tape/line] [Bell] [Glass of water] [Flag] [Basket]   │
│                                                         │
│  🎯 Direct Aims          │  🌱 Indirect Aims            │
│  • Balance               │  • Concentration             │
│  • Control of movement   │  • Self-discipline           │
│                                                         │
│  ⚠️ Control of Error: Stepping off the line            │
│                                                         │
│  📊 Progression Levels                                  │
│  ① Basic Walking - heel-to-toe [🎬 YouTube]            │
│  ② With Arms Extended [🎬 YouTube]                     │
│  ③ Carrying Flag [🎬 YouTube]                          │
│  ④ Carrying Bell (no sound!) [🎬 YouTube]              │
│  ⑤ Carrying Glass of Water [🎬 YouTube]                │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 DATA FIELD MAPPING

| Display Section | JSON Field | Notes |
|-----------------|------------|-------|
| Work Title | `name` | Always present |
| Description | `description` | Always present |
| Age Range | `ageRange` | Format: "primary_year1" |
| Chinese Name | `chineseName` | Always present |
| Materials | `materials[]` | Array of strings |
| Direct Aims | `directAims[]` | Array of strings |
| Indirect Aims | `indirectAims[]` | Array of strings |
| Control of Error | `controlOfError` | Single string |
| Prerequisites | `prerequisites[]` | Array of work IDs |
| Levels | `levels[]` | Each has: level, name, description, videoSearchTerms |

---

## 🚀 FUTURE ENHANCEMENTS (After Framework)

### Phase 2: Add Presentation Scripts
```typescript
// Add to each work in JSON:
presentationSteps: [
  { step: 1, instruction: "Invite child to observe", tip: "Use child's name" },
  { step: 2, instruction: "Carry materials to mat", tip: "Slow, deliberate movements" },
  // ...
]
```

### Phase 3: Add Video Embeds
Replace YouTube search links with actual video URLs after curating good examples.

### Phase 4: Jeffy Integration
Add procurement links to materials:
```typescript
materials: [
  { name: "Work mat", buyLink: "https://jeffy.com/..." },
  { name: "Bell", buyLink: "https://1688.com/..." }
]
```

### Phase 5: PDF Export
Generate printable guides for offline classroom use.

---

## 🔧 TROUBLESHOOTING

### "Cannot find module '@/lib/curriculum/data/...'"
Ensure JSON files exist and have correct structure. Check imports match exact filenames.

### "data.categories is undefined"
Some area JSON files may have different structure. Check the actual JSON structure and adjust accordingly.

### Slow loading
Consider lazy loading categories or implementing virtual scrolling for large datasets.

---

## ✅ COMPLETION CHECKLIST

- [ ] `/app/admin/handbook/page.tsx` created
- [ ] `/app/admin/handbook/[areaId]/page.tsx` created
- [ ] All 5 areas load correctly
- [ ] Categories expand/collapse
- [ ] Works expand/collapse
- [ ] All fields display properly
- [ ] YouTube links work
- [ ] Navigation added to admin
- [ ] Tested on mobile view
- [ ] Committed and deployed

---

## 📍 RELATED FILES

| File | Purpose |
|------|---------|
| `/lib/curriculum/data/*.json` | Source data for all works |
| `/docs/montessori-brain/DIVE_2_WORK_ANALYSIS.md` | Deep dive documentation |
| `/app/admin/english-guide/page.tsx` | Reference for expandable UI pattern |
| `/docs/mission-control/brain.json` | Current session state |
| `/docs/mission-control/MONTREE_MASTER_GAMEPLAN.md` | Overall project plan |

---

**Ready to build! Start with Step 1 and proceed sequentially. The data is already there - we're just building the UI to display it beautifully.** 🐋
