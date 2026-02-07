'use client';

import React, { useState, useEffect } from 'react';
import { useAssignWork } from '@/lib/hooks/useAssignWork';

interface Props {
  studentIds: string[];
  studentCount: number;
  onClose: () => void;
  onComplete: () => void;
}

interface WorkLevel {
  id: string;
  sequence: number;
}

interface Work {
  id: string;
  name: string;
  area_id: string;
  category_id: string;
  levels: WorkLevel[];
}

interface Area {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function AssignWorkModal({ studentIds, studentCount, onClose, onComplete }: Props) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [selectedWork, setSelectedWork] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const { assignWork, loading: assigning, error, result } = useAssignWork();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch areas
        const areasRes = await fetch('/api/whale/curriculum/areas');
        const areasData = await areasRes.json();
        setAreas(areasData.areas || []);

        // Fetch all works
        const worksRes = await fetch('/api/whale/curriculum/works');
        const worksData = await worksRes.json();
        setWorks(worksData.works || []);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredWorks = selectedArea
    ? works.filter(w => w.area_id === selectedArea)
    : works;

  const selectedWorkData = works.find(w => w.id === selectedWork);
  const selectedAreaData = areas.find(a => a.id === selectedArea);

  const handleAssign = async () => {
    if (!selectedWork) return;
    
    try {
      await assignWork(selectedWork, studentIds);
      onComplete();
    } catch (err) {
      // Error handled by hook
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Assign Work</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Assigning to {studentCount} student{studentCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
            </div>
          ) : (
            <>
              {/* Area Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Filter by Area
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => {
                    setSelectedArea(e.target.value);
                    setSelectedWork('');
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">All Areas</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.icon} {area.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Work
                </label>
                <select
                  value={selectedWork}
                  onChange={(e) => setSelectedWork(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Choose a work...</option>
                  {filteredWorks.map((work) => {
                    const area = areas.find(a => a.id === work.area_id);
                    return (
                      <option key={work.id} value={work.id}>
                        {area?.icon} {work.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Selected Work Preview */}
              {selectedWorkData && (
                <div 
                  className="p-4 rounded-lg border-2"
                  style={{ borderColor: selectedAreaData?.color || '#ccc' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{selectedAreaData?.icon}</span>
                    <span className="font-medium text-gray-900">{selectedWorkData.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {selectedWorkData.levels.length} level{selectedWorkData.levels.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Success */}
              {result && (
                <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                  Successfully assigned to {result.assigned} student{result.assigned !== 1 ? 's' : ''}!
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedWork || assigning}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {assigning ? 'Assigning...' : 'Assign Work'}
          </button>
        </div>
      </div>
    </div>
  );
}


