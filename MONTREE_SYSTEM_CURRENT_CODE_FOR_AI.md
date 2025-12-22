# 🧩 MONTREE SYSTEM - CURRENT CODE OVERVIEW

## 📋 SYSTEM OVERVIEW

Montree is a comprehensive Montessori progress tracking system that visualizes a child's learning journey through a curriculum tree. It tracks individual works, progress levels, and provides detailed analytics across all Montessori areas.

**Current Status:** ✅ **Fully Functional**
- Tracks progress through Montessori curriculum
- Visual curriculum tree with interactive work cards
- Real-time progress analytics
- Child management and progress history
- Multiple Montessori areas: Practical Life, Sensorial, Mathematics, Language, Cultural

---

## 🗂️ FILE STRUCTURE

### Core Types & Data
```
lib/montree/types.ts                    # TypeScript interfaces and constants
lib/montree/curriculum-data.ts          # Curriculum loading and conversion
lib/montree/db.ts                       # Database operations (Supabase)
```

### Frontend Pages
```
app/admin/montree/page.tsx              # Main Montree dashboard
```

### Frontend Components
```
app/admin/montree/components/
├── ChildSelector.tsx                   # Child selection dropdown
├── ProgressSummary.tsx                 # Overall progress visualization
├── CurriculumTree.tsx                  # Interactive curriculum tree
├── AreaCard.tsx                        # Area-specific progress cards
├── WorkDetailModal.tsx                 # Individual work progress modal
├── AddChildModal.tsx                   # Add new child form
```

### API Routes
```
app/api/montree/children/route.ts        # Child CRUD operations
app/api/montree/children/[childId]/route.ts    # Individual child operations
app/api/montree/progress/[childId]/route.ts    # Child progress summary
app/api/montree/progress/[childId]/[workId]/route.ts  # Individual work progress
```

### Database Tables
```
montree_children                        # Child information
child_work_completion                   # Work progress tracking
```

---

## 🔑 CURRENT CODE SNIPPETS

### 1. Core Types (`lib/montree/types.ts`)

```typescript
// Core types for Montree system

export type WorkStatus = 'not_started' | 'in_progress' | 'completed';

export interface WorkLevel {
  level: number;
  name: string;
  description: string;
}

export interface Work {
  id: string;
  name: string;
  chineseName?: string;
  description: string;
  ageRange: string;
  materials: string[];
  levels: WorkLevel[];
  prerequisites?: string[];
  // Keep existing fields from JSON
  directAims?: string[];
  indirectAims?: string[];
  controlOfError?: string;
  videoSearchTerms?: string[];
}

export interface Category {
  id: string;
  name: string;
  works: Work[];
}

export interface CurriculumArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  categories: Category[];
}

export interface ChildProgress {
  id: string;
  childId: string;
  workId: string;
  status: WorkStatus;
  currentLevel: number;
  startedAt: string | null;
  completedAt: string | null;
  notes: string;
  updatedAt: string;
}

export interface Child {
  id: string;
  name: string;
  dateOfBirth?: string;
  parentId?: string;
  createdAt: string;
}

export interface AreaProgress {
  areaId: string;
  areaName: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
}

export interface ChildOverallProgress {
  childId: string;
  childName: string;
  totalWorks: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percentage: number;
  areaProgress: AreaProgress[];
}

// Status colors - light fills for visual indication
export const STATUS_COLORS = {
  not_started: {
    fill: '#f1f5f9',      // slate-100 (light gray)
    border: '#cbd5e1',    // slate-300
    text: '#64748b',      // slate-500
    label: 'Not Started',
  },
  in_progress: {
    fill: '#fef3c7',      // amber-100 (light amber)
    border: '#fcd34d',    // amber-300
    text: '#d97706',      // amber-600
    label: 'In Progress',
  },
  completed: {
    fill: '#dcfce7',      // green-100 (light green)
    border: '#86efac',    // green-300
    text: '#16a34a',      // green-600
    label: 'Completed',
  },
} as const;

// Area colors (distinct from status colors)
export const AREA_COLORS = {
  practical_life: {
    primary: '#22c55e',   // green-500
    light: '#bbf7d0',     // green-200
    dark: '#15803d',      // green-700
  },
  sensorial: {
    primary: '#f97316',   // orange-500
    light: '#fed7aa',     // orange-200
    dark: '#c2410c',      // orange-700
  },
  mathematics: {
    primary: '#3b82f6',   // blue-500
    light: '#bfdbfe',     // blue-200
    dark: '#1d4ed8',      // blue-700
  },
  language: {
    primary: '#ec4899',   // pink-500
    light: '#fbcfe8',     // pink-200
    dark: '#be185d',      // pink-700
  },
  cultural: {
    primary: '#8b5cf6',   // violet-500
    light: '#ddd6fe',     // violet-200
    dark: '#6d28d9',      // violet-700
  },
} as const;
```

### 2. Curriculum Data Loader (`lib/montree/curriculum-data.ts`)

```typescript
// Loads and converts existing JSON curriculum data to Montree format

import { CurriculumArea, Category, Work } from './types';

// Import existing JSON data
import practicalLifeData from '@/lib/curriculum/data/practical-life.json';
import sensorialData from '@/lib/curriculum/data/sensorial.json';
import mathData from '@/lib/curriculum/data/math.json';
import languageData from '@/lib/curriculum/data/language.json';
import culturalData from '@/lib/curriculum/data/cultural.json';

// Convert JSON work to our Work interface
function convertWork(jsonWork: any): Work {
  return {
    id: jsonWork.id,
    name: jsonWork.name,
    chineseName: jsonWork.chineseName || jsonWork.chinese_name,
    description: jsonWork.description || '',
    ageRange: jsonWork.ageRange || jsonWork.age_range || '3-6',
    materials: jsonWork.materials || [],
    levels: jsonWork.levels || [
      { level: 1, name: 'Introduction', description: 'First presentation' },
      { level: 2, name: 'Practice', description: 'Independent practice' },
      { level: 3, name: 'Mastery', description: 'Full mastery' },
    ],
    prerequisites: jsonWork.prerequisites || [],
    directAims: jsonWork.directAims || jsonWork.direct_aims,
    indirectAims: jsonWork.indirectAims || jsonWork.indirect_aims,
    controlOfError: jsonWork.controlOfError || jsonWork.control_of_error,
    videoSearchTerms: jsonWork.videoSearchTerms || jsonWork.video_search_terms,
  };
}

// Convert JSON category to our Category interface
function convertCategory(jsonCategory: any): Category {
  return {
    id: jsonCategory.id,
    name: jsonCategory.name,
    works: (jsonCategory.works || jsonCategory.activities || []).map(convertWork),
  };
}

// Convert JSON area to our CurriculumArea interface
function convertArea(jsonArea: any, areaId: string, icon: string, color: string): CurriculumArea {
  // Handle both array of categories and direct works array
  let categories: Category[] = [];

  if (jsonArea.categories) {
    categories = jsonArea.categories.map(convertCategory);
  } else if (jsonArea.works || jsonArea.activities) {
    // If no categories, create a single "General" category
    categories = [{
      id: 'general',
      name: 'General',
      works: (jsonArea.works || jsonArea.activities || []).map(convertWork),
    }];
  }

  return {
    id: areaId,
    name: jsonArea.name || areaId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon,
    color,
    categories,
  };
}

// Main curriculum data export
export const CURRICULUM: CurriculumArea[] = [
  convertArea(practicalLifeData, 'practical_life', '🧼', '#22c55e'),
  convertArea(sensorialData, 'sensorial', '👁️', '#f97316'),
  convertArea(mathData, 'mathematics', '🔢', '#3b82f6'),
  convertArea(languageData, 'language', '📚', '#ec4899'),
  convertArea(culturalData, 'cultural', '🌍', '#8b5cf6'),
];

// Helper function to find a work by ID
export function getWorkById(workId: string): Work | null {
  for (const area of CURRICULUM) {
    for (const category of area.categories) {
      const work = category.works.find(w => w.id === workId);
      if (work) return work;
    }
  }
  return null;
}

// Helper function to find work location
export function findWorkLocation(workId: string): { areaId: string; categoryId: string; work: Work } | null {
  for (const area of CURRICULUM) {
    for (const category of area.categories) {
      const work = category.works.find(w => w.id === workId);
      if (work) {
        return { areaId: area.id, categoryId: category.id, work };
      }
    }
  }
  return null;
}
```

### 3. Database Operations (`lib/montree/db.ts`) - KEY FILE

```typescript
// Database operations using EXISTING tables (montree_children, child_work_completion)

import { createServerClient } from '@/lib/supabase';
import {
  Child,
  ChildProgress,
  WorkStatus,
  ChildOverallProgress,
  AreaProgress,
} from './types';
import { CURRICULUM, findWorkLocation } from './curriculum-data';
import { createHash } from 'crypto';

// ============================================
// CHILDREN OPERATIONS (using 'montree_children' table)
// ============================================

export async function getChildren(): Promise<Child[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('montree_children')
    .select('*')
    .order('name');

  if (error) throw error;

  // Map to our interface (handle column name differences)
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    dateOfBirth: row.date_of_birth || row.dateOfBirth,
    parentId: row.parent_id || row.parentId,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  }));
}

export async function getChildById(childId: string): Promise<Child | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('montree_children')
    .select('*')
    .eq('id', childId)
    .single();

  if (error) return null;

  return {
    id: data.id,
    name: data.name,
    dateOfBirth: data.date_of_birth || data.dateOfBirth,
    parentId: data.parent_id || data.parentId,
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
  };
}

// ============================================
// PROGRESS OPERATIONS (using 'child_work_completion' table)
// ============================================

export async function getChildProgress(childId: string): Promise<ChildProgress[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('child_work_completion')
    .select('*')
    .eq('child_id', childId);

  if (error) throw error;

  // Map to our ChildProgress interface
  return (data || []).map(row => ({
    id: row.id || `${childId}-${row.work_id}`,
    childId,
    workId: row.work_id || row.curriculum_work_id,
    status: mapStatus(row.status || 'not_started'),
    currentLevel: row.current_level || row.level || 1,
    startedAt: row.started_at ? row.started_at.toISOString() : null,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    notes: row.notes || '',
    updatedAt: row.updated_at ? row.updated_at.toISOString() : new Date().toISOString(),
  }));
}

export async function getWorkProgress(childId: string, workId: string): Promise<ChildProgress | null> {
  const progress = await getChildProgress(childId);
  return progress.find(p => p.workId === workId) || null;
}

// ============================================
// PROGRESS CALCULATION
// ============================================

export async function calculateChildOverallProgress(childId: string): Promise<ChildOverallProgress> {
  const progress = await getChildProgress(childId);
  const child = await getChildById(childId);

  if (!child) throw new Error('Child not found');

  // Calculate totals
  const totalWorks = CURRICULUM.reduce((sum, area) =>
    sum + area.categories.reduce((areaSum, category) =>
      areaSum + category.works.length, 0), 0);

  const completed = progress.filter(p => p.status === 'completed').length;
  const inProgress = progress.filter(p => p.status === 'in_progress').length;
  const notStarted = totalWorks - completed - inProgress;
  const percentage = Math.round((completed / totalWorks) * 100);

  // Calculate area progress
  const areaProgress: AreaProgress[] = CURRICULUM.map(area => {
    const areaWorks = area.categories.flatMap(cat => cat.works);
    const areaWorkIds = areaWorks.map(w => w.id);

    const areaCompleted = progress.filter(p =>
      areaWorkIds.includes(p.workId) && p.status === 'completed').length;
    const areaInProgress = progress.filter(p =>
      areaWorkIds.includes(p.workId) && p.status === 'in_progress').length;
    const areaNotStarted = areaWorks.length - areaCompleted - areaInProgress;
    const areaPercentage = Math.round((areaCompleted / areaWorks.length) * 100);

    return {
      areaId: area.id,
      areaName: area.name,
      totalWorks: areaWorks.length,
      completed: areaCompleted,
      inProgress: areaInProgress,
      notStarted: areaNotStarted,
      percentage: areaPercentage,
    };
  });

  return {
    childId,
    childName: child.name,
    totalWorks,
    completed,
    inProgress,
    notStarted,
    percentage,
    areaProgress,
  };
}

// ============================================
// PROGRESS UPDATES
// ============================================

export async function startWork(childId: string, workId: string): Promise<ChildProgress> {
  return updateWorkProgress(childId, workId, 'in_progress', 1);
}

export async function completeWork(childId: string, workId: string, level: number = 1): Promise<ChildProgress> {
  return updateWorkProgress(childId, workId, 'completed', level);
}

export async function resetWork(childId: string, workId: string): Promise<ChildProgress> {
  return updateWorkProgress(childId, workId, 'not_started', 0);
}

export async function updateWorkProgress(
  childId: string,
  workId: string,
  status: WorkStatus,
  currentLevel: number,
  notes?: string
): Promise<ChildProgress> {
  const supabase = await createServerClient();

  // Generate deterministic UUID for curriculum_work_id
  const curriculumWorkId = createHash('sha256')
    .update(workId)
    .digest('hex')
    .substring(0, 36)
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

  const now = new Date().toISOString();

  try {
    // Try to ensure child exists in children table first
    await ensureChildExistsInChildrenTable(childId);

    // Update or insert work progress
    const { data, error } = await supabase
      .from('child_work_completion')
      .upsert({
        child_id: childId,
        curriculum_work_id: curriculumWorkId,
        work_id: workId,
        status: status,
        current_level: currentLevel,
        max_level: getWorkMaxLevel(workId),
        started_at: status === 'in_progress' ? now : null,
        completed_at: status === 'completed' ? now : null,
        notes: notes || '',
        updated_at: now,
      }, {
        onConflict: 'child_id,curriculum_work_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      childId,
      workId,
      status,
      currentLevel,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      notes: data.notes || '',
      updatedAt: data.updated_at,
    };
  } catch (error) {
    console.error('Error updating work progress:', error);
    throw error;
  }
}

// ============================================
// CHILD MANAGEMENT
// ============================================

export async function createChild(name: string, dateOfBirth?: string): Promise<Child> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('montree_children')
    .insert([{
      name,
      date_of_birth: dateOfBirth,
    }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    dateOfBirth: data.date_of_birth,
    createdAt: data.created_at,
  };
}

export async function deleteChild(childId: string): Promise<void> {
  const supabase = await createServerClient();

  // Delete from montree_children (this will cascade to child_work_completion)
  const { error } = await supabase
    .from('montree_children')
    .delete()
    .eq('id', childId);

  if (error) throw error;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapStatus(status: string): WorkStatus {
  switch (status) {
    case 'completed':
    case 'done':
      return 'completed';
    case 'in_progress':
    case 'started':
      return 'in_progress';
    case 'not_started':
    case 'pending':
    default:
      return 'not_started';
  }
}

function getWorkMaxLevel(workId: string): number {
  const work = CURRICULUM.flatMap(area =>
    area.categories.flatMap(cat => cat.works)
  ).find(w => w.id === workId);

  return work?.levels?.length || 1;
}

// Helper function to ensure child exists in children table for foreign key constraints
async function ensureChildExistsInChildrenTable(childId: string): Promise<void> {
  const supabase = await createServerClient();

  try {
    // Check if child exists in children table
    const { data: existingChild } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .maybeSingle();

    if (!existingChild) {
      // Get montree child data
      const { data: montreeChild, error: fetchError } = await supabase
        .from('montree_children')
        .select('*')
        .eq('id', childId)
        .single();

      if (fetchError || !montreeChild) {
        throw new Error(`Montree child not found: ${childId}`);
      }

      // Calculate age group
      let ageGroup = '3-4';
      if (montreeChild.age !== null && montreeChild.age !== undefined) {
        if (montreeChild.age < 3) ageGroup = '2-3';
        else if (montreeChild.age < 4) ageGroup = '3-4';
        else if (montreeChild.age < 5) ageGroup = '4-5';
        else ageGroup = '5-6';
      }

      // Create child in children table
      const { error: insertError } = await supabase
        .from('children')
        .insert({
          id: childId,
          name: montreeChild.name,
          date_of_birth: montreeChild.date_of_birth || new Date().toISOString().split('T')[0],
          enrollment_date: montreeChild.created_at ? new Date(montreeChild.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          age_group: ageGroup,
          active_status: true,
          notes: montreeChild.notes || null,
        });

      if (insertError && insertError.code !== '23505') { // Ignore duplicate key errors
        console.warn('Could not create child in children table:', insertError.message);
      }
    }
  } catch (error) {
    console.warn('ensureChildExistsInChildrenTable failed:', error);
    // Don't throw - this is optional for backward compatibility
  }
}
```

### 4. Main Dashboard (`app/admin/montree/page.tsx`)

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Child, ChildOverallProgress, STATUS_COLORS } from '@/lib/montree/types';
import ChildSelector from './components/ChildSelector';
import ProgressSummary from './components/ProgressSummary';
import CurriculumTree from './components/CurriculumTree';
import AddChildModal from './components/AddChildModal';

export default function MontreePage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<ChildOverallProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchProgress(selectedChild.id);
    } else {
      setProgress(null);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/montree/children');
      const data = await res.json();
      const childrenArray = Array.isArray(data) ? data : [];
      setChildren(childrenArray);
      if (childrenArray.length > 0 && !selectedChild) {
        setSelectedChild(childrenArray[0]);
      }
    } catch (error) {
      console.error('Failed to fetch children:', error);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/progress/${childId}?summary=true`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Progress fetch failed:', errorData);
        setProgress(null);
        return;
      }
      const data = await res.json();
      setProgress(data);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
      setProgress(null);
    }
  };

  const handleChildAdded = (child: Child) => {
    setChildren(prev => [...prev, child]);
    setSelectedChild(child);
    setShowAddChild(false);
  };

  const handleProgressUpdate = () => {
    if (selectedChild) {
      fetchProgress(selectedChild.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Montree</h1>
            <p className="text-slate-600">Montessori Progress Tracking</p>
          </div>
          <button
            onClick={() => setShowAddChild(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Add Child
          </button>
        </div>

        {/* Child Selector */}
        <div className="mb-6">
          <ChildSelector
            children={children}
            selectedChild={selectedChild}
            onSelect={setSelectedChild}
          />
        </div>

        {/* Progress Summary & Curriculum Tree */}
        {selectedChild ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ProgressSummary progress={progress} childName={selectedChild.name} />
            </div>
            <div className="lg:col-span-2">
              <CurriculumTree
                childId={selectedChild.id}
                progress={progress}
                onProgressUpdate={handleProgressUpdate}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-slate-500 text-lg">Select a child to view their progress</p>
          </div>
        )}

        {/* Add Child Modal */}
        {showAddChild && (
          <AddChildModal
            onClose={() => setShowAddChild(false)}
            onChildAdded={handleChildAdded}
          />
        )}
      </div>
    </div>
  );
}
```

### 5. Work Detail Modal (`app/admin/montree/components/WorkDetailModal.tsx`)

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Work, ChildProgress, WorkStatus, STATUS_COLORS } from '@/lib/montree/types';
import { getWorkById } from '@/lib/montree/curriculum-data';

interface Props {
  childId: string;
  areaId: string;
  categoryId: string;
  workId: string;
  currentProgress?: ChildProgress;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WorkDetailModal({
  childId, areaId, categoryId, workId, currentProgress, onClose, onUpdate,
}: Props) {
  const [work, setWork] = useState<Work | null>(null);
  const [status, setStatus] = useState<WorkStatus>(currentProgress?.status || 'not_started');
  const [currentLevel, setCurrentLevel] = useState(currentProgress?.currentLevel || 0);
  const [notes, setNotes] = useState(currentProgress?.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const workData = getWorkById(workId);
    setWork(workData);
  }, [workId]);

  const handleStatusChange = (newStatus: WorkStatus) => {
    setStatus(newStatus);
    if (newStatus === 'in_progress' && currentLevel === 0) setCurrentLevel(1);
    else if (newStatus === 'completed' && work) setCurrentLevel(work.levels.length);
    else if (newStatus === 'not_started') setCurrentLevel(0);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/montree/progress/${childId}/${workId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', status, currentLevel, notes }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `Failed to save: ${res.statusText}`);
      }
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Failed to save progress:', error);
      alert(`Failed to save. Please try again. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  };

  if (!work) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{work.name}</h2>
            {work.chineseName && (
              <p className="text-slate-600">{work.chineseName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Description</h3>
            <p className="text-slate-600">{work.description}</p>
          </div>

          {/* Materials */}
          {work.materials && work.materials.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">Materials</h3>
              <ul className="list-disc list-inside text-slate-600 space-y-1">
                {work.materials.map((material, index) => (
                  <li key={index}>{material}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Status Selection */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3">Progress Status</h3>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(STATUS_COLORS).map(([key, color]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(key as WorkStatus)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    status === key
                      ? `border-slate-400 bg-slate-50`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full mx-auto mb-2"
                    style={{ backgroundColor: color.fill }}
                  />
                  <div className="text-sm font-medium">{color.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Level Selection */}
          {work.levels && work.levels.length > 0 && (
            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Current Level</h3>
              <div className="space-y-2">
                {work.levels.map((level) => (
                  <button
                    key={level.level}
                    onClick={() => setCurrentLevel(level.level)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      currentLevel === level.level
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium">{level.name}</div>
                    <div className="text-sm text-slate-600">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this work..."
              className="w-full p-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 6. Progress Summary Component (`app/admin/montree/components/ProgressSummary.tsx`)

```typescript
'use client';

import React from 'react';
import { ChildOverallProgress, STATUS_COLORS, AREA_COLORS } from '@/lib/montree/types';

interface Props {
  progress: ChildOverallProgress | null;
  childName: string;
}

export default function ProgressSummary({ progress, childName }: Props) {
  if (!progress) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
        <div className="h-32 bg-slate-200 rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">{childName}</h2>

      {/* Overall Progress Circle */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="64" cy="64" r="56" fill="none" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="64" cy="64" r="56" fill="none" stroke="#22c55e" strokeWidth="12"
            strokeDasharray={`${(progress.percentage / 100) * 352} 352`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-slate-800">{progress.percentage}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6 text-center">
        <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.completed.fill }}>
          <div className="text-lg font-bold" style={{ color: STATUS_COLORS.completed.text }}>
            {progress.completed}
          </div>
          <div className="text-xs text-slate-500">Done</div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.in_progress.fill }}>
          <div className="text-lg font-bold" style={{ color: STATUS_COLORS.in_progress.text }}>
            {progress.inProgress}
          </div>
          <div className="text-xs text-slate-500">Active</div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.not_started.fill }}>
          <div className="text-lg font-bold" style={{ color: STATUS_COLORS.not_started.text }}>
            {progress.notStarted}
          </div>
          <div className="text-xs text-slate-500">New</div>
        </div>
      </div>

      {/* Area Progress */}
      <h3 className="text-sm font-bold text-slate-700 mb-3">By Area</h3>
      <div className="space-y-3">
        {(progress.areaProgress || []).map((area) => {
          const areaColor = AREA_COLORS[area.areaId as keyof typeof AREA_COLORS];
          return (
            <div key={area.areaId}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-700">{area.areaName}</span>
                <span className="font-medium" style={{ color: areaColor?.primary }}>
                  {area.percentage}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${area.percentage}%`, backgroundColor: areaColor?.primary || '#6366f1' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Works */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <div className="text-sm text-slate-500">Total Works</div>
        <div className="text-2xl font-bold text-slate-800">{progress.totalWorks}</div>
      </div>
    </div>
  );
}
```

---

## 🗄️ DATABASE SCHEMA

### Tables Used

#### `montree_children`
```sql
CREATE TABLE montree_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date_of_birth DATE,
  parent_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `child_work_completion`
```sql
CREATE TABLE child_work_completion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id),
  curriculum_work_id UUID NOT NULL,
  work_id TEXT,
  status TEXT DEFAULT 'in_progress',
  current_level INTEGER DEFAULT 1,
  max_level INTEGER DEFAULT 1,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, curriculum_work_id)
);
```

---

## 🎯 HOW IT WORKS

### User Flow
1. **Select Child** → Choose from dropdown or add new child
2. **View Progress** → See overall percentage and area breakdown
3. **Browse Curriculum** → Navigate through Montessori areas and categories
4. **Update Work Status** → Click work cards to mark as in-progress/completed
5. **Track Levels** → Each work has multiple difficulty levels
6. **Add Notes** → Record observations and progress notes

### Technical Flow
- **Curriculum Loading** → Converts existing JSON data to structured format
- **Progress Calculation** → Real-time computation of completion percentages
- **Database Mapping** → Bridges montree_children ↔ child_work_completion tables
- **Visual Hierarchy** → Areas → Categories → Works → Levels
- **Status Tracking** → Not Started → In Progress → Completed

### Montessori Areas
- **🧼 Practical Life** → Daily living skills and independence
- **👁️ Sensorial** → Sensory discrimination and refinement
- **🔢 Mathematics** → Number concepts and operations
- **📚 Language** → Reading, writing, and communication
- **🌍 Cultural** → Geography, history, science, and arts

---

## 🎨 INTERACTION GUIDE

### Progress Visualization
- **Circular Progress** → Overall completion percentage
- **Status Cards** → Completed (green), In Progress (amber), Not Started (gray)
- **Area Breakdown** → Progress bars for each Montessori area
- **Color Coding** → Distinct colors for different areas

### Curriculum Navigation
- **Area Cards** → Click to expand/collapse categories
- **Work Cards** → Color-coded by status, click to update progress
- **Detail Modal** → Comprehensive work information and progress tracking
- **Level Selection** → Multiple difficulty levels per work

### Child Management
- **Child Selector** → Dropdown to switch between children
- **Add Child** → Modal form for new child registration
- **Progress Summary** → Sticky sidebar with current child's stats

---

## 🔧 CURRENT STATUS

✅ **Fully Functional**
- Complete Montessori curriculum integration
- Real-time progress tracking and visualization
- Child management system
- Work status and level tracking
- Comprehensive progress analytics
- Responsive design with modern UI

## 🚀 NEXT STEPS FOR AI EDITOR

### Potential Enhancements

1. **Advanced Analytics**
   - Progress velocity tracking
   - Learning milestone predictions
   - Comparative analytics across children
   - Time-based progress reports

2. **Parent Integration**
   - Parent dashboard for viewing child progress
   - Photo/video sharing for work completion
   - Home activity suggestions
   - Progress report generation

3. **Teacher Tools**
   - Class-wide progress overview
   - Individual student focus areas
   - Automated lesson planning suggestions
   - Progress milestone celebrations

4. **Mobile Experience**
   - Progressive Web App (PWA) capabilities
   - Offline progress tracking
   - Camera integration for work documentation
   - Push notifications for parent updates

5. **Curriculum Expansion**
   - Dynamic curriculum updates
   - Teacher-created custom activities
   - Cultural adaptation for different regions
   - Age-appropriate content filtering

6. **Assessment & Reporting**
   - Automated progress reports
   - Learning objective mapping
   - Standardized assessment integration
   - Individualized education plan (IEP) support

The Montree system provides a solid foundation for Montessori progress tracking with room for extensive customization and feature expansion based on specific educational needs.
