import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const AREA_COLORS: Record<string, string> = {
  'Practical Life': '#22c55e',
  'Sensorial': '#f97316',
  'Mathematics': '#3b82f6',
  'Language': '#ec4899',
  'Cultural': '#8b5cf6',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;

    // Get total works count
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM curriculum_roadmap'
    );
    const totalWorks = parseInt(totalResult.rows[0]?.total || '0');

    // Get completed works count
    const completedResult = await db.query(
      `SELECT COUNT(*) as completed 
       FROM child_work_completion 
       WHERE child_id = $1 AND status = 'mastered'`,
      [childId]
    );
    const completed = parseInt(completedResult.rows[0]?.completed || '0');

    // Get in-progress works count
    const inProgressResult = await db.query(
      `SELECT COUNT(*) as in_progress 
       FROM child_work_completion 
       WHERE child_id = $1 AND status IN ('introduced', 'practicing')`,
      [childId]
    );
    const inProgress = parseInt(inProgressResult.rows[0]?.in_progress || '0');

    // Get progress by area
    const areaResult = await db.query(
      `SELECT 
         cr.area,
         COUNT(DISTINCT cr.id) as total,
         COUNT(DISTINCT CASE WHEN cwc.status = 'mastered' THEN cr.id END) as completed
       FROM curriculum_roadmap cr
       LEFT JOIN child_work_completion cwc 
         ON cr.id = cwc.work_id AND cwc.child_id = $1
       GROUP BY cr.area
       ORDER BY cr.area`,
      [childId]
    );

    const areaProgress = areaResult.rows.map(row => ({
      name: row.area,
      color: AREA_COLORS[row.area] || '#6b7280',
      total: parseInt(row.total),
      completed: parseInt(row.completed),
      percent: Math.round((parseInt(row.completed) / parseInt(row.total)) * 100) || 0,
    }));

    const percentComplete = totalWorks > 0 
      ? Math.round((completed / totalWorks) * 100) 
      : 0;

    return NextResponse.json({
      completed,
      inProgress,
      totalWorks,
      percentComplete,
      areaProgress,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

