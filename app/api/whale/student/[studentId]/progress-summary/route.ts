import { createServerClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkStatusItem {
  workId: string;
  name: string;
  status: 0 | 1 | 2 | 3;
  categoryName: string;
}

interface AreaProgressData {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentWorkIndex: number;
  currentWorkName: string;
  worksStatus: WorkStatusItem[];
}

interface ProgressSummaryResponse {
  childId: string;
  childName: string;
  lastUpdated: string;
  overallProgress: {
    totalWorks: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
  areas: AreaProgressData[];
}

interface CurriculumWork {
  id: string;
  name: string;
  description?: string;
  ageRange?: string;
  levels?: unknown[];
  prerequisites?: string[];
}

interface CurriculumCategory {
  id: string;
  name: string;
  works: CurriculumWork[];
}

interface CurriculumArea {
  id: string;
  name: string;
  icon: string;
  color: string;
  categories: CurriculumCategory[];
}

interface CompletionRecord {
  work_id: string;
  status: string;
  current_level: number;
  completed_at: string | null;
}

// ============================================================================
// CURRICULUM AREA DEFINITIONS
// ============================================================================

const CURRICULUM_AREAS: Omit<CurriculumArea, 'categories'>[] = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function statusToNumber(status: string | undefined): 0 | 1 | 2 | 3 {
  switch (status) {
    case 'presented':
    case 'in_progress':
      return 1;
    case 'practicing':
      return 2;
    case 'completed':
    case 'mastered':
      return 3;
    default:
      return 0;
  }
}

function getAreaWorks(categories: CurriculumCategory[]): Array<{
  workId: string;
  name: string;
  categoryName: string;
}> {
  const works: Array<{ workId: string; name: string; categoryName: string }> = [];
  
  for (const category of categories) {
    for (const work of category.works) {
      works.push({
        workId: work.id,
        name: work.name,
        categoryName: category.name,
      });
    }
  }
  
  return works;
}

function calculateCurrentWorkIndex(
  worksStatus: WorkStatusItem[]
): { index: number; name: string } {
  let furthestIndex = -1;
  let furthestName = '';
  
  for (let i = 0; i < worksStatus.length; i++) {
    if (worksStatus[i].status > 0) {
      furthestIndex = i;
      furthestName = worksStatus[i].name;
    }
  }
  
  if (furthestIndex === -1) {
    return {
      index: 0,
      name: worksStatus.length > 0 ? worksStatus[0].name : 'Not started',
    };
  }
  
  return { index: furthestIndex, name: furthestName };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
): Promise<NextResponse<ProgressSummaryResponse | { error: string }>> {
  try {
    const { studentId } = await params;
    
    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // ========================================================================
    // FETCH CHILD DATA
    // ========================================================================
    
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('id, name')
      .eq('id', studentId)
      .single();

    if (childError || !childData) {
      const { data: montreeChild, error: montreeError } = await supabase
        .from('montree_children')
        .select('id, name')
        .eq('id', studentId)
        .single();

      if (montreeError || !montreeChild) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }
      
      Object.assign(childData ?? {}, montreeChild);
    }

    const child = childData ?? { id: studentId, name: 'Unknown' };

    // ========================================================================
    // FETCH CURRICULUM DATA
    // ========================================================================
    
    let curriculum: CurriculumArea[] = [];
    try {
      const curriculumModule = await import('@/lib/montree/curriculum-data');
      curriculum = curriculumModule.curriculum || curriculumModule.default || [];
    } catch {
      console.warn('Could not load curriculum data, using empty areas');
    }

    // ========================================================================
    // FETCH COMPLETION RECORDS
    // ========================================================================
    
    const { data: completionRecords, error: completionError } = await supabase
      .from('child_work_completion')
      .select('work_id, status, current_level, completed_at')
      .eq('child_id', studentId);

    if (completionError) {
      console.error('Error fetching completion records:', completionError);
    }

    const completionMap = new Map<string, CompletionRecord>();
    if (completionRecords) {
      for (const record of completionRecords) {
        if (record.work_id) {
          completionMap.set(record.work_id, record as CompletionRecord);
        }
      }
    }

    // ========================================================================
    // CALCULATE PROGRESS FOR EACH AREA
    // ========================================================================
    
    let totalWorks = 0;
    let totalCompleted = 0;
    let totalInProgress = 0;
    let lastUpdatedTime = '';

    const areas: AreaProgressData[] = CURRICULUM_AREAS.map((areaInfo) => {
      const curriculumArea = curriculum.find((a) => a.id === areaInfo.id);
      const categories = curriculumArea?.categories || [];
      
      const areaWorks = getAreaWorks(categories);
      
      const worksStatus: WorkStatusItem[] = areaWorks.map((work) => {
        const completion = completionMap.get(work.workId);
        const status = statusToNumber(completion?.status);
        
        if (completion?.completed_at && completion.completed_at > lastUpdatedTime) {
          lastUpdatedTime = completion.completed_at;
        }
        
        return {
          workId: work.workId,
          name: work.name,
          status,
          categoryName: work.categoryName,
        };
      });

      const { index: currentWorkIndex, name: currentWorkName } = 
        calculateCurrentWorkIndex(worksStatus);

      const areaCompleted = worksStatus.filter((w) => w.status === 3).length;
      const areaInProgress = worksStatus.filter((w) => w.status > 0 && w.status < 3).length;

      totalWorks += worksStatus.length;
      totalCompleted += areaCompleted;
      totalInProgress += areaInProgress;

      return {
        areaId: areaInfo.id,
        areaName: areaInfo.name,
        icon: areaInfo.icon,
        color: areaInfo.color,
        totalWorks: worksStatus.length,
        currentWorkIndex,
        currentWorkName,
        worksStatus,
      };
    });

    // ========================================================================
    // BUILD RESPONSE
    // ========================================================================
    
    const percentage = totalWorks > 0 
      ? Math.round((totalCompleted / totalWorks) * 100) 
      : 0;

    const response: ProgressSummaryResponse = {
      childId: child.id,
      childName: child.name,
      lastUpdated: lastUpdatedTime || new Date().toISOString(),
      overallProgress: {
        totalWorks,
        completed: totalCompleted,
        inProgress: totalInProgress,
        percentage,
      },
      areas,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Progress summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress summary' },
      { status: 500 }
    );
  }
}
