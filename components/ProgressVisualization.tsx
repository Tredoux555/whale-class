// components/ProgressVisualization.tsx
'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Award, Target, Activity } from 'lucide-react';
import type { CurriculumArea } from '@/types/database';

interface ProgressVisualizationProps {
  childId: string;
}

const AREA_LABELS: Record<CurriculumArea, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language Arts',
  english: 'English',
  cultural: 'Cultural Studies',
};

const AREA_COLORS: Record<CurriculumArea, string> = {
  practical_life: '#3B82F6',
  sensorial: '#8B5CF6',
  mathematics: '#10B981',
  language: '#F59E0B',
  english: '#EC4899',
  cultural: '#EAB308',
};

export default function ProgressVisualization({ childId }: ProgressVisualizationProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [childId]);

  async function loadProgressData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/whale/progress/enhanced?childId=${childId}`);
      if (!res.ok) throw new Error('Failed to load progress data');
      
      const result = await res.json();
      setData(result.data);
    } catch (err: any) {
      console.error('Error loading progress:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-gray-500">
        No progress data available
      </div>
    );
  }

  const { areaProgress, overallStats, activitiesByArea, timelineData } = data;

  return (
    <div className="space-y-6">
      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalActivities}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.completedActivities}</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-600">
              {overallStats.completionRate.toFixed(0)}% completion rate
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Skills</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.totalSkills}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Mastered</p>
              <p className="text-2xl font-bold text-gray-900">{overallStats.masteredSkills}</p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
          <div className="mt-2">
            <div className="text-xs text-gray-600">
              {overallStats.skillMasteryRate.toFixed(0)}% mastery rate
            </div>
          </div>
        </div>
      </div>

      {/* Progress by Area */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Progress by Curriculum Area
        </h3>

        <div className="space-y-6">
          {areaProgress.map((area: any) => {
            const color = AREA_COLORS[area.area as CurriculumArea];
            const progressPercentage = (area.averageStatus / 5) * 100;

            return (
              <div key={area.area}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{area.label}</span>
                  <span className="text-sm text-gray-600">
                    {area.averageStatus.toFixed(1)} / 5.0
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercentage}%`,
                      backgroundColor: color
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                    {progressPercentage.toFixed(0)}%
                  </div>
                </div>

                {/* Skill Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <div className="font-semibold text-blue-700">{area.introduced}</div>
                    <div className="text-gray-600">Introduced</div>
                  </div>
                  <div className="bg-yellow-50 rounded p-2 text-center">
                    <div className="font-semibold text-yellow-700">{area.practicing}</div>
                    <div className="text-gray-600">Practicing</div>
                  </div>
                  <div className="bg-green-50 rounded p-2 text-center">
                    <div className="font-semibold text-green-700">{area.independent}</div>
                    <div className="text-gray-600">Independent</div>
                  </div>
                  <div className="bg-purple-50 rounded p-2 text-center">
                    <div className="font-semibold text-purple-700">{area.mastery}</div>
                    <div className="text-gray-600">Mastered</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activities Distribution */}
      {Object.keys(activitiesByArea).length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Distribution (Last 30 Days)</h3>
          
          <div className="space-y-3">
            {Object.entries(activitiesByArea).map(([area, count]) => {
              const total = Object.values(activitiesByArea).reduce((sum: number, c) => sum + (c as number), 0);
              const countNum = count as number;
              const percentage = (countNum / total) * 100;
              const color = AREA_COLORS[area as CurriculumArea] || '#6B7280';

              return (
                <div key={area}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{AREA_LABELS[area as CurriculumArea] || area}</span>
                    <span className="text-gray-600">{countNum} activities</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {timelineData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Activity Completion Timeline</h3>
          
          <div className="space-y-2">
            {timelineData.slice(-14).map((day: any) => {
              const maxCount = Math.max(...timelineData.map((d: any) => d.count));
              const percentage = (day.count / maxCount) * 100;
              const date = new Date(day.date);
              const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-600">{formattedDate}</div>
                  <div className="flex-1 h-8 bg-gray-100 rounded overflow-hidden flex items-center">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">{day.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Skill Mastery Levels</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>1 - Introduced</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>2 - Practicing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>3 - Independent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
            <span>4-5 - Mastered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
