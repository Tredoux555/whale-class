'use client';

import React, { useEffect, useState } from 'react';
import { Child, ProgressSummaryByArea, Activity } from '@/types/database';
import { CurriculumMindmapSVG } from './CurriculumMindmapSVG';
import { ActivityTooltip } from './ActivityTooltip';
import { ActivitySummaryModal } from './ActivitySummaryModal';
import { Loader } from 'lucide-react';

interface CurriculumVisualizationProps {
  childId: string;
}

export const CurriculumVisualization: React.FC<
  CurriculumVisualizationProps
> = ({ childId }) => {
  const [childData, setChildData] = useState<Child | null>(null);
  const [progressData, setProgressData] = useState<ProgressSummaryByArea[]>([]);
  const [activitiesByArea, setActivitiesByArea] = useState<
    Map<string, Activity[]>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(
    null
  );
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);
  const [tooltipArea, setTooltipArea] = useState<string | null>(null);

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, [childId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch child data
      const childRes = await fetch(`/api/whale/children/${childId}`);
      if (!childRes.ok) throw new Error('Failed to fetch child');
      const childResult = await childRes.json();
      setChildData(childResult.data);

      // Fetch progress by area (summary)
      const progressRes = await fetch(`/api/whale/progress/summary?childId=${childId}`);
      if (progressRes.ok) {
        const progressResult = await progressRes.json();
        setProgressData(progressResult.data || []);
      }

      // Fetch activities and organize by area
      const activitiesRes = await fetch('/api/whale/activities?limit=100');
      if (activitiesRes.ok) {
        const activitiesResult = await activitiesRes.json();
        const byArea = new Map<string, Activity[]>();

        const areas = [
          'practical_life',
          'sensorial',
          'mathematics',
          'language',
          'english',
          'cultural',
        ];

        areas.forEach((area) => {
          const areaActivities = activitiesResult.data.filter(
            (a: Activity) => a.area === area
          );
          byArea.set(area, areaActivities);
        });

        setActivitiesByArea(byArea);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load curriculum data'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAreaHover = (area: string | null) => {
    setHoveredArea(area);
    if (area) {
      setTooltipArea(area);
    }
  };

  const handleAreaClick = (area: string) => {
    // You can add additional logic here if needed
  };

  const handleActivityClick = (activityId: string) => {
    setSelectedActivityId(activityId);
    setTooltipArea(null); // Close tooltip
  };

  const handleActivityDetail = () => {
    // Navigate to full detail view
    if (selectedActivityId) {
      window.location.href = `/admin/montessori/activity/${selectedActivityId}`;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-gray-600">Loading curriculum overview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={fetchAllData}
          className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!childData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Child not found</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Curriculum Progress Map
        </h2>
        <p className="text-gray-600 mt-1">
          Hover over areas to see activities • Click to view details
        </p>
      </div>

      {/* Main SVG Mindmap with relative positioning for tooltip */}
      <div className="relative">
        <CurriculumMindmapSVG
          childData={childData}
          progressData={progressData}
          hoveredArea={hoveredArea}
          onAreaHover={handleAreaHover}
          onAreaClick={handleAreaClick}
        />

        {/* Activity Tooltip - Positioned absolutely over SVG */}
        {tooltipArea && activitiesByArea.get(tooltipArea) && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
            <ActivityTooltip
              area={tooltipArea}
              activities={activitiesByArea.get(tooltipArea) || []}
              position={{ x: 0, y: 0 }}
              onActivityClick={handleActivityClick}
            />
          </div>
        )}
      </div>

      {/* Activity Summary Modal */}
      <ActivitySummaryModal
        activityId={selectedActivityId || ''}
        childId={childId}
        isOpen={!!selectedActivityId}
        onClose={() => setSelectedActivityId(null)}
        onViewDetails={handleActivityDetail}
        onAssign={() => {
          // Assign logic here
        }}
      />

      {/* Info section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-700">
          📊 This view shows {childData.name}'s progress across all curriculum
          areas. Use the detailed view to see specific activities and upload
          instruction videos.
        </p>
      </div>
    </div>
  );
};


