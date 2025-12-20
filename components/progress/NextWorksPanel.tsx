'use client';

import React, { useEffect, useState } from 'react';

interface Work {
  id: string;
  name: string;
  description: string;
  area_id: string;
  age_range: string;
  materials: string[];
  levels: any[];
  curriculum_areas: {
    name: string;
    color: string;
    icon: string;
  };
  curriculum_categories: {
    name: string;
  };
}

interface Props {
  childId: string;
  areaId: string | null;
}

export default function NextWorksPanel({ childId, areaId }: Props) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchNextWorks() {
      setLoading(true);
      try {
        const url = areaId
          ? `/api/whale/curriculum/next-works/${childId}?area=${areaId}&limit=5`
          : `/api/whale/curriculum/next-works/${childId}?limit=5`;
        
        const res = await fetch(url);
        const data = await res.json();
        setWorks(data.works || []);
      } catch (err) {
        console.error('Error fetching next works:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNextWorks();
  }, [childId, areaId]);

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="animate-pulse">Loading recommendations...</div>
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
        {areaId 
          ? 'All available works in this area are complete!'
          : 'No recommendations available'
        }
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {works.map((work) => (
        <div
          key={work.id}
          className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">{work.curriculum_areas.icon}</span>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{work.name}</h4>
              <p className="text-xs text-gray-500 mb-2">
                {work.curriculum_categories.name}
              </p>
              <p className="text-sm text-gray-600 line-clamp-2">
                {work.description}
              </p>
              <div className="flex gap-2 mt-2">
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: `${work.curriculum_areas.color}20`,
                    color: work.curriculum_areas.color,
                  }}
                >
                  {work.levels.length} levels
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {work.materials.length} materials
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


