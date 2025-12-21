// lib/montree/db.ts
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

export async function createChild(name: string, dateOfBirth?: string, parentId?: string): Promise<Child> {
  const supabase = await createServerClient();
  
  // Calculate age from dateOfBirth if provided
  let age: number | null = null;
  if (dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    const ageYears = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    age = Math.floor(ageYears);
  }
  
  const { data, error } = await supabase
    .from('montree_children')
    .insert([{ 
      name, 
      age,
      notes: null,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name,
    dateOfBirth: data.date_of_birth || dateOfBirth,
    parentId: data.parent_id || parentId,
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function deleteChild(childId: string): Promise<void> {
  const supabase = await createServerClient();
  
  const { error } = await supabase
    .from('montree_children')
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
    updatedAt: row.created_at || new Date().toISOString(),
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
    updatedAt: data.created_at || new Date().toISOString(),
  };
}

// Helper function to generate a deterministic UUID from a string (for Montree work_id)
// This is needed because curriculum_work_id is required but Montree uses string work_ids
function generateUUIDFromString(str: string): string {
  // Use crypto to generate a deterministic UUID-like string
  const hash = createHash('sha256').update(`montree:${str}`).digest('hex');
  // Format as UUID v4: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Use first 32 chars of hash, format as UUID
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-${(parseInt(hash.substring(16, 17), 16) & 0x3 | 0x8).toString(16)}${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

// Helper function to ensure a child exists in the 'children' table
// This is needed because child_work_completion has a foreign key to children(id)
async function ensureChildExistsInChildrenTable(childId: string): Promise<void> {
  try {
    const supabase = await createServerClient();
    
    // Check if child exists in children table
    const { data: existingChild, error: checkError } = await supabase
      .from('children')
      .select('id')
      .eq('id', childId)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when not found
    
    // If child exists, we're done
    if (existingChild) {
      return;
    }
    
    // If there was an error other than "not found", log it but continue
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn(`Warning checking child existence: ${checkError.message}`);
      // Continue anyway - we'll try to create it
    }
    
    // Get child data from montree_children
    const { data: montreeChild, error: fetchError } = await supabase
      .from('montree_children')
      .select('*')
      .eq('id', childId)
      .maybeSingle();
    
    if (fetchError) {
      console.error(`Error fetching Montree child: ${fetchError.message}`);
      throw new Error(`Failed to fetch Montree child: ${fetchError.message}`);
    }
    
    if (!montreeChild) {
      throw new Error(`Montree child not found: ${childId}`);
    }
    
    // Calculate age group from age or use default
    let ageGroup = '3-4'; // Default
    if (montreeChild.age !== null && montreeChild.age !== undefined) {
      if (montreeChild.age < 3) ageGroup = '2-3';
      else if (montreeChild.age < 4) ageGroup = '3-4';
      else if (montreeChild.age < 5) ageGroup = '4-5';
      else ageGroup = '5-6';
    }
    
    // Insert into children table
    const { error: insertError } = await supabase
      .from('children')
      .insert({
        id: childId, // Use the same ID
        name: montreeChild.name,
        date_of_birth: montreeChild.date_of_birth || new Date().toISOString().split('T')[0],
        enrollment_date: montreeChild.created_at ? new Date(montreeChild.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        age_group: ageGroup,
        active_status: true,
        notes: montreeChild.notes || null,
      });
    
    if (insertError) {
      // If it's a unique constraint violation, the child might have been created by another request
      // Check again if it exists now
      const { data: recheck } = await supabase
        .from('children')
        .select('id')
        .eq('id', childId)
        .maybeSingle();
      
      if (!recheck) {
        // If it's a unique constraint error, the child might exist now
        if (insertError.code === '23505') {
          // Unique violation - check one more time
          const { data: finalCheck } = await supabase
            .from('children')
            .select('id')
            .eq('id', childId)
            .maybeSingle();
          
          if (finalCheck) {
            // Child exists now, we're good
            return;
          }
        }
        throw new Error(`Failed to create child in children table: ${insertError.message}`);
      }
      // Otherwise, it's fine - the child exists now
    }
  } catch (error) {
    // Catch any network errors or other exceptions
    if (error instanceof Error) {
      // If it's already our error, rethrow it
      if (error.message.includes('Failed to') || error.message.includes('not found')) {
        throw error;
      }
      throw new Error(`Failed to ensure child exists: ${error.message}`);
    }
    throw new Error(`Failed to ensure child exists: ${String(error)}`);
  }
}

export async function updateWorkProgress(
  childId: string,
  workId: string,
  status: WorkStatus,
  currentLevel: number = 0,
  notes: string = ''
): Promise<ChildProgress> {
  try {
    const supabase = await createServerClient();
    const now = new Date().toISOString();
    
    // Ensure child exists in children table (required for foreign key constraint)
    try {
      await ensureChildExistsInChildrenTable(childId);
    } catch (error) {
      // Log the error but don't fail the entire operation
      // The foreign key might still work if the child was created by another process
      console.warn(`Warning: Could not ensure child exists in children table: ${error instanceof Error ? error.message : String(error)}`);
    }
  
  // First, try to get existing progress
  const existing = await getWorkProgress(childId, workId);
  
  // Generate a deterministic UUID for curriculum_work_id from work_id
  // This is needed because the table requires curriculum_work_id (NOT NULL)
  // For Montree works, we use a deterministic UUID based on the work_id string
  const curriculumWorkId = generateUUIDFromString(workId);
  
  const progressData: any = {
    child_id: childId,
    work_id: workId,
    curriculum_work_id: curriculumWorkId, // Required field
    status: mapStatusToDb(status),
    current_level: currentLevel,
    notes: notes || '',
    completion_date: now.split('T')[0], // Required field - use today's date
  };
  
  // Set timestamps based on status
  if (status !== 'not_started') {
    if (!existing || !existing.startedAt) {
      progressData.started_at = now;
    } else {
      progressData.started_at = existing.startedAt;
    }
  }
  if (status === 'completed') {
    progressData.completed_at = now;
  }

  // Try to update existing record first
  if (existing) {
    const { data, error } = await supabase
      .from('child_work_completion')
      .update(progressData)
      .eq('child_id', childId)
      .eq('work_id', workId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating work progress:', error);
      console.error('Progress data:', progressData);
      throw new Error(`Failed to update work progress: ${error.message}`);
    }
    
    if (data) {
      return {
        id: data.id,
        childId: data.child_id,
        workId: data.work_id || data.curriculum_work_id,
        status: mapStatusFromDb(data.status),
        currentLevel: data.current_level || 0,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        notes: data.notes || '',
        updatedAt: data.created_at || new Date().toISOString(),
      };
    }
  }
  
  // If no existing record, insert new one
  const { data, error } = await supabase
    .from('child_work_completion')
    .insert(progressData)
    .select()
    .single();
  
  if (error) {
    console.error('Error inserting work progress:', error);
    console.error('Progress data:', progressData);
    throw new Error(`Failed to insert work progress: ${error.message}`);
  }
  
  if (!data) {
    throw new Error('No data returned from insert operation');
  }
  
  return {
    id: data.id,
    childId: data.child_id,
    workId: data.work_id || data.curriculum_work_id,
    status: mapStatusFromDb(data.status),
    currentLevel: data.current_level || 0,
    startedAt: data.started_at,
    completedAt: data.completed_at,
    notes: data.notes || '',
    updatedAt: data.created_at || new Date().toISOString(),
  };
  } catch (error) {
    // Catch any network errors or other exceptions
    if (error instanceof Error) {
      // If it's already a formatted error, rethrow it
      if (error.message.includes('Failed to')) {
        throw error;
      }
      throw new Error(`Failed to update work progress: ${error.message}`);
    }
    throw new Error(`Failed to update work progress: ${String(error)}`);
  }
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

