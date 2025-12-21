// lib/montree/db.ts
// Database operations using EXISTING tables (children, child_work_completion)

import { createServerClient } from '@/lib/supabase';
import { 
  Child, 
  ChildProgress, 
  WorkStatus, 
  ChildOverallProgress,
  AreaProgress,
} from './types';
import { CURRICULUM, findWorkLocation } from './curriculum-data';

// ============================================
// CHILDREN OPERATIONS (using existing 'children' table)
// ============================================

export async function getChildren(): Promise<Child[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('children')
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
    .from('children')
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

export async function createChild(name: string, dateOfBirth?: string, parentId?: string): Promise<Child> {
  const supabase = await createServerClient();
  
  // Calculate age_group from dateOfBirth if provided
  let ageGroup: string | undefined;
  if (dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const ageYears = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (ageYears < 3) ageGroup = '2-3';
    else if (ageYears < 4) ageGroup = '3-4';
    else if (ageYears < 5) ageGroup = '4-5';
    else ageGroup = '5-6';
  } else {
    ageGroup = '3-4'; // Default
  }
  
  const { data, error } = await supabase
    .from('children')
    .insert([{ 
      name, 
      date_of_birth: dateOfBirth, 
      parent_id: parentId,
      age_group: ageGroup,
      enrollment_date: new Date().toISOString().split('T')[0],
      active_status: true,
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name,
    dateOfBirth: data.date_of_birth,
    parentId: data.parent_id,
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function deleteChild(childId: string): Promise<void> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', childId);
  
  if (error) throw error;
}

// ============================================
// PROGRESS OPERATIONS (using existing 'child_work_completion' table)
// ============================================

// Map our status to what's in the existing table
function mapStatusToDb(status: WorkStatus): string {
  switch (status) {
    case 'completed': return 'completed';
    case 'in_progress': return 'in_progress';
    default: return 'in_progress'; // Default to in_progress for not_started
  }
}

function mapStatusFromDb(dbStatus: string | null): WorkStatus {
  if (!dbStatus) return 'not_started';
  if (dbStatus === 'completed' || dbStatus === 'mastered') return 'completed';
  if (dbStatus === 'in_progress' || dbStatus === 'practicing') return 'in_progress';
  return 'not_started';
}

export async function getChildProgress(childId: string): Promise<ChildProgress[]> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('child_work_completion')
    .select('*')
    .eq('child_id', childId);
  
  if (error) throw error;
  
  return (data || []).map(row => ({
    id: row.id,
    childId: row.child_id,
    workId: row.work_id || row.curriculum_work_id,
    status: mapStatusFromDb(row.status),
    currentLevel: row.current_level || row.level || 0,
    startedAt: row.started_at || row.created_at,
    completedAt: row.completed_at || row.completion_date,
    notes: row.notes || '',
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  }));
}

export async function getWorkProgress(childId: string, workId: string): Promise<ChildProgress | null> {
  const supabase = await createServerClient();
  
  const { data, error } = await supabase
    .from('child_work_completion')
    .select('*')
    .eq('child_id', childId)
    .eq('work_id', workId)
    .single();
  
  if (error) return null;
  
  return {
    id: data.id,
    childId: data.child_id,
    workId: data.work_id || data.curriculum_work_id,
    status: mapStatusFromDb(data.status),
    currentLevel: data.current_level || data.level || 0,
    startedAt: data.started_at || data.created_at,
    completedAt: data.completed_at || data.completion_date,
    notes: data.notes || '',
    updatedAt: data.updated_at || data.created_at || new Date().toISOString(),
  };
}

export async function updateWorkProgress(
  childId: string,
  workId: string,
  status: WorkStatus,
  currentLevel: number = 0,
  notes: string = ''
): Promise<ChildProgress> {
  const supabase = await createServerClient();
  const now = new Date().toISOString();
  
  const progressData: any = {
    child_id: childId,
    work_id: workId,
    status: mapStatusToDb(status),
    current_level: currentLevel,
    notes,
    updated_at: now,
  };
  
  // Set timestamps based on status
  if (status !== 'not_started' && !progressData.started_at) {
    progressData.started_at = now;
  }
  if (status === 'completed') {
    progressData.completed_at = now;
  }

  // Upsert - insert or update
  const { data, error } = await supabase
    .from('child_work_completion')
    .upsert(progressData, { 
      onConflict: 'child_id,work_id',
      ignoreDuplicates: false 
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    childId: data.child_id,
    workId: data.work_id || data.curriculum_work_id,
    status: mapStatusFromDb(data.status),
    currentLevel: data.current_level || 0,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    notes: data.notes || '',
    updatedAt: data.updated_at || new Date().toISOString(),
  };
}

export async function startWork(childId: string, workId: string): Promise<ChildProgress> {
  return updateWorkProgress(childId, workId, 'in_progress', 1);
}

export async function completeWork(childId: string, workId: string, finalLevel: number): Promise<ChildProgress> {
  return updateWorkProgress(childId, workId, 'completed', finalLevel);
}

export async function resetWork(childId: string, workId: string): Promise<ChildProgress> {
  // Delete the record to reset to not_started
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('child_work_completion')
    .delete()
    .eq('child_id', childId)
    .eq('work_id', workId);
  
  if (error) throw error;
  
  // Return a not_started progress object
  return {
    id: '',
    childId,
    workId,
    status: 'not_started',
    currentLevel: 0,
    startedAt: null,
    completedAt: null,
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}

// ============================================
// PROGRESS CALCULATIONS
// ============================================

export async function calculateChildOverallProgress(childId: string): Promise<ChildOverallProgress> {
  const child = await getChildById(childId);
  if (!child) throw new Error('Child not found');
  
  const progress = await getChildProgress(childId);
  const progressMap = new Map(progress.map(p => [p.workId, p]));
  
  let totalWorks = 0;
  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;
  
  const areaProgress: AreaProgress[] = [];
  
  for (const area of CURRICULUM) {
    let areaTotal = 0;
    let areaCompleted = 0;
    let areaInProgress = 0;
    let areaNotStarted = 0;
    
    for (const category of area.categories) {
      for (const work of category.works) {
        areaTotal++;
        totalWorks++;
        
        const workProgress = progressMap.get(work.id);
        const status = workProgress?.status || 'not_started';
        
        if (status === 'completed') {
          completed++;
          areaCompleted++;
        } else if (status === 'in_progress') {
          inProgress++;
          areaInProgress++;
        } else {
          notStarted++;
          areaNotStarted++;
        }
      }
    }
    
    areaProgress.push({
      areaId: area.id,
      areaName: area.name,
      totalWorks: areaTotal,
      completed: areaCompleted,
      inProgress: areaInProgress,
      notStarted: areaNotStarted,
      percentage: areaTotal > 0 ? Math.round((areaCompleted / areaTotal) * 100) : 0,
    });
  }
  
  return {
    childId,
    childName: child.name,
    totalWorks,
    completed,
    inProgress,
    notStarted,
    percentage: totalWorks > 0 ? Math.round((completed / totalWorks) * 100) : 0,
    areaProgress,
  };
}

