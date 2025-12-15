// lib/curriculum/progression.ts
// Core curriculum progression logic for Montessori curriculum tracking

import { createClient } from '@/lib/supabase';

export interface CurriculumWork {
  id: string;
  sequence_order: number;
  work_name: string;
  area: string;
  stage: string;
  age_min: number;
  age_max: number;
  prerequisite_work_ids: number[]; // References sequence_order numbers
  description: string;
  notes?: string;
}

export interface ChildCurriculumPosition {
  child_id: string;
  current_curriculum_work_id: string | null;
  completed_work_ids: string[]; // Array of curriculum_roadmap UUIDs
  current_stage: string | null;
}

export interface ChildProgress {
  current_stage: string;
  works_completed: number;
  current_work: CurriculumWork | null;
  stage_progress: {
    total_works: number;
    completed_works: number;
    percent_complete: number;
  };
}

/**
 * Calculate child's age in years (decimal)
 */
export function calculateAge(dateOfBirth: Date | string): number {
  const birthDate = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  // Add decimal for months
  const daysDiff = today.getDate() - birthDate.getDate();
  const monthsDecimal = monthDiff < 0 ? (12 + monthDiff) / 12 : monthDiff / 12;
  const daysDecimal = daysDiff / 365;
  
  return age + monthsDecimal + daysDecimal;
}

/**
 * Get the next curriculum work for a child
 */
export async function getNextCurriculumWork(childId: string): Promise<CurriculumWork> {
  const supabase = createClient();
  
  try {
    // 1. Get child's position
    const { data: position, error: positionError } = await supabase
      .from('child_curriculum_position')
      .select('*')
      .eq('child_id', childId)
      .single();

    // If new child, start at beginning
    if (!position || positionError?.code === 'PGRST116') {
      const { data: firstWork, error: firstWorkError } = await supabase
        .from('curriculum_roadmap')
        .select('*')
        .eq('sequence_order', 1)
        .single();
      
      if (firstWorkError || !firstWork) {
        throw new Error('Failed to get first curriculum work');
      }
      
      // Create position record
      await supabase
        .from('child_curriculum_position')
        .insert({
          child_id: childId,
          current_curriculum_work_id: firstWork.id,
          current_stage: firstWork.stage,
          completed_work_ids: [],
        });
      
      return firstWork as CurriculumWork;
    }

    // 2. Get current work details
    if (!position.current_curriculum_work_id) {
      // No current work set, get first work
      const { data: firstWork } = await supabase
        .from('curriculum_roadmap')
        .select('*')
        .eq('sequence_order', 1)
        .single();
      
      if (!firstWork) throw new Error('No curriculum works found');
      
      await supabase
        .from('child_curriculum_position')
        .update({
          current_curriculum_work_id: firstWork.id,
          current_stage: firstWork.stage,
        })
        .eq('child_id', childId);
      
      return firstWork as CurriculumWork;
    }

    const { data: currentWork, error: currentWorkError } = await supabase
      .from('curriculum_roadmap')
      .select('*')
      .eq('id', position.current_curriculum_work_id)
      .single();

    if (currentWorkError || !currentWork) {
      throw new Error('Failed to get current curriculum work');
    }

    // 3. Check if current work is completed
    const isCurrentWorkCompleted = position.completed_work_ids.includes(
      position.current_curriculum_work_id
    );

    // 4. If not completed, return current work
    if (!isCurrentWorkCompleted) {
      return currentWork as CurriculumWork;
    }

    // 5. Get child's age
    const { data: child, error: childError } = await supabase
      .from('children')
      .select('date_of_birth')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      throw new Error('Failed to get child information');
    }

    const childAge = calculateAge(child.date_of_birth);

    // 6. Get next work by sequence
    const { data: nextWork, error: nextWorkError } = await supabase
      .from('curriculum_roadmap')
      .select('*')
      .eq('sequence_order', (currentWork as CurriculumWork).sequence_order + 1)
      .single();

    if (nextWorkError || !nextWork) {
      // Curriculum complete or no next work
      return currentWork as CurriculumWork; // Return current as fallback
    }

    const nextWorkTyped = nextWork as CurriculumWork;

    // 7. Check prerequisites (prerequisite_work_ids are sequence_order numbers)
    const completedSequenceOrders = await Promise.all(
      position.completed_work_ids.map(async (workId: string) => {
        const { data: work } = await supabase
          .from('curriculum_roadmap')
          .select('sequence_order')
          .eq('id', workId)
          .single();
        return work?.sequence_order;
      })
    );

    for (const prereqSeqOrder of nextWorkTyped.prerequisite_work_ids) {
      if (!completedSequenceOrders.includes(prereqSeqOrder)) {
        // Return the missing prerequisite instead
        const { data: prereqWork } = await supabase
          .from('curriculum_roadmap')
          .select('*')
          .eq('sequence_order', prereqSeqOrder)
          .single();
        
        if (prereqWork) {
          return prereqWork as CurriculumWork;
        }
      }
    }

    // 8. Check age appropriateness
    if (childAge < nextWorkTyped.age_min) {
      // Find next age-appropriate work
      const { data: appropriateWork } = await supabase
        .from('curriculum_roadmap')
        .select('*')
        .gte('age_min', childAge)
        .lte('age_max', childAge)
        .gt('sequence_order', nextWorkTyped.sequence_order)
        .order('sequence_order', { ascending: true })
        .limit(1)
        .single();
      
      if (appropriateWork) {
        return appropriateWork as CurriculumWork;
      }
    }

    // 9. Update child's position and return next work
    await supabase
      .from('child_curriculum_position')
      .update({
        current_curriculum_work_id: nextWorkTyped.id,
        current_stage: nextWorkTyped.stage,
        updated_at: new Date().toISOString(),
      })
      .eq('child_id', childId);

    return nextWorkTyped;
  } catch (error) {
    console.error('Error in getNextCurriculumWork:', error);
    throw error;
  }
}

/**
 * Check if prerequisites are met for a work
 */
export async function checkPrerequisites(
  childId: string,
  workId: string
): Promise<{ met: boolean; missing: string[] }> {
  const supabase = createClient();
  
  try {
    // Get child's completed works
    const { data: position } = await supabase
      .from('child_curriculum_position')
      .select('completed_work_ids')
      .eq('child_id', childId)
      .single();

    if (!position) {
      return { met: false, missing: [] };
    }

    // Get work's prerequisites
    const { data: work } = await supabase
      .from('curriculum_roadmap')
      .select('prerequisite_work_ids')
      .eq('id', workId)
      .single();

    if (!work || !work.prerequisite_work_ids || work.prerequisite_work_ids.length === 0) {
      return { met: true, missing: [] };
    }

    // Get completed sequence orders
    const completedWorks = await Promise.all(
      position.completed_work_ids.map(async (completedId) => {
        const { data: completedWork } = await supabase
          .from('curriculum_roadmap')
          .select('sequence_order, work_name')
          .eq('id', completedId)
          .single();
        return completedWork;
      })
    );

    const completedSequenceOrders = completedWorks
      .filter(Boolean)
      .map((w) => w?.sequence_order);

    // Check which prerequisites are missing
    const missing: string[] = [];
    for (const prereqSeqOrder of work.prerequisite_work_ids) {
      if (!completedSequenceOrders.includes(prereqSeqOrder)) {
        // Get work name for missing prerequisite
        const { data: prereqWork } = await supabase
          .from('curriculum_roadmap')
          .select('work_name')
          .eq('sequence_order', prereqSeqOrder)
          .single();
        
        if (prereqWork) {
          missing.push(prereqWork.work_name);
        }
      }
    }

    return {
      met: missing.length === 0,
      missing,
    };
  } catch (error) {
    console.error('Error in checkPrerequisites:', error);
    throw error;
  }
}

/**
 * Mark a curriculum work as complete
 */
export async function markWorkComplete(
  childId: string,
  curriculumWorkId: string
): Promise<void> {
  const supabase = createClient();
  
  try {
    // Get current position
    const { data: position } = await supabase
      .from('child_curriculum_position')
      .select('completed_work_ids')
      .eq('child_id', childId)
      .single();

    const completedWorkIds = position?.completed_work_ids || [];

    // Add to completed if not already there
    if (!completedWorkIds.includes(curriculumWorkId)) {
      await supabase
        .from('child_curriculum_position')
        .update({
          completed_work_ids: [...completedWorkIds, curriculumWorkId],
        })
        .eq('child_id', childId);
    }

    // Create completion record
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('child_work_completion')
      .upsert({
        child_id: childId,
        curriculum_work_id: curriculumWorkId,
        completion_date: today,
        mastery_level: 1,
        times_practiced: 1,
      }, {
        onConflict: 'child_id,curriculum_work_id,completion_date',
      });
  } catch (error) {
    console.error('Error in markWorkComplete:', error);
    throw error;
  }
}

/**
 * Get child's curriculum progress
 */
export async function getChildProgress(childId: string): Promise<ChildProgress> {
  const supabase = createClient();
  
  try {
    // Get child's position
    const { data: position } = await supabase
      .from('child_curriculum_position')
      .select('*')
      .eq('child_id', childId)
      .single();

    if (!position) {
      // New child - get first work
      const { data: firstWork } = await supabase
        .from('curriculum_roadmap')
        .select('*')
        .eq('sequence_order', 1)
        .single();

      return {
        current_stage: firstWork?.stage || 'stage_0',
        works_completed: 0,
        current_work: firstWork as CurriculumWork || null,
        stage_progress: {
          total_works: 0,
          completed_works: 0,
          percent_complete: 0,
        },
      };
    }

    // Get current work
    let currentWork: CurriculumWork | null = null;
    if (position.current_curriculum_work_id) {
      const { data: work } = await supabase
        .from('curriculum_roadmap')
        .select('*')
        .eq('id', position.current_curriculum_work_id)
        .single();
      
      currentWork = work as CurriculumWork || null;
    }

    const currentStage = position.current_stage || 'stage_0';

    // Get all works in current stage
    const { data: stageWorks } = await supabase
      .from('curriculum_roadmap')
      .select('id')
      .eq('stage', currentStage);

    const totalWorksInStage = stageWorks?.length || 0;

    // Count completed works in this stage
    const completedWorksInStage = position.completed_work_ids.filter((workId) => {
      // Check if this work is in the current stage
      return stageWorks?.some((w) => w.id === workId);
    }).length;

    const percentComplete =
      totalWorksInStage > 0
        ? (completedWorksInStage / totalWorksInStage) * 100
        : 0;

    return {
      current_stage: currentStage,
      works_completed: position.completed_work_ids.length,
      current_work: currentWork,
      stage_progress: {
        total_works: totalWorksInStage,
        completed_works: completedWorksInStage,
        percent_complete: Math.round(percentComplete * 100) / 100,
      },
    };
  } catch (error) {
    console.error('Error in getChildProgress:', error);
    throw error;
  }
}

