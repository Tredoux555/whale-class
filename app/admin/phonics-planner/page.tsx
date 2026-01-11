// app/admin/phonics-planner/page.tsx
// Phonics Activity Bank - Just fun activities!

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PHONICS_ACTIVITIES, getActivitiesByType, getActivitiesBySkill } from '@/lib/circle-time/phonics-activities';
import { PhonicsActivity } from '@/lib/circle-time/types';

type FilterType = 'all' | PhonicsActivity['type'];
type FilterSkill = 'all' | PhonicsActivity['targetSkill'];

export default function PhonicsActivitiesPage() {
  const router = useRouter();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterSkill, setFilterSkill] = useState<FilterSkill>('all');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const filteredActivities = PHONICS_ACTIVITIES.filter(activity => {
    if (filterType !== 'all' && activity.type !== filterType) return false;
    if (filterSkill !== 'all' && activity.targetSkill !== filterSkill) return false;
    return true;
  });

  const toggleActivity = (id: string) => {
    setSelectedActivities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const typeButtons: { value: FilterType; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '📚' },
    { value: 'game', label: 'Games', icon: '🎯' },
    { value: 'movement', label: 'Movement', icon: '💃' },
    { value: 'song', label: 'Songs', icon: '🎵' },
    { value: 'craft', label: 'Crafts', icon: '✂️' },
    { value: 'sensory', label: 'Sensory', icon: '🫧' },
  ];

  const skillButtons: { value: FilterSkill; label: string }[] = [
    { value: 'all', label: 'All Skills' },
    { value: 'letter-sounds', label: 'Letter Sounds' },
    { value: 'blending', label: 'Blending' },
    { value: 'segmenting', label: 'Segmenting' },
    { value: 'rhyming', label: 'Rhyming' },
  ];

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                🔤 Phonics Activity Bank
              </h1>
            </div>
            {selectedActivities.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedActivities.length} selected
                </span>
                <button 
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  🖨️ Print Selected
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Intro */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Friday Phonics Fun! 🎉
          </h2>
          <p className="text-gray-600">
            Pick activities for your phonics circle time. Mix games, movement, songs, and sensory play 
            to keep it fun and engaging!
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          {/* Type Filter */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Activity Type:</label>
            <div className="flex flex-wrap gap-2">
              {typeButtons.map(btn => (
                <button
                  key={btn.value}
                  onClick={() => setFilterType(btn.value)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filterType === btn.value
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {btn.icon} {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Skill Filter */}
          <div>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Target Skill:</label>
            <div className="flex flex-wrap gap-2">
              {skillButtons.map(btn => (
                <button
                  key={btn.value}
                  onClick={() => setFilterSkill(btn.value)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filterSkill === btn.value
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActivities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              isSelected={selectedActivities.includes(activity.id)}
              onToggle={() => toggleActivity(activity.id)}
            />
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500">No activities match your filters</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ActivityCard({ 
  activity, 
  isSelected, 
  onToggle 
}: { 
  activity: PhonicsActivity; 
  isSelected: boolean; 
  onToggle: () => void;
}) {
  const typeColors: Record<PhonicsActivity['type'], string> = {
    game: '#ef4444',
    movement: '#f97316',
    song: '#eab308',
    craft: '#22c55e',
    sensory: '#3b82f6',
  };

  return (
    <div 
      className={`bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
      }`}
      onClick={onToggle}
    >
      <div 
        className="px-4 py-2 text-white font-bold flex items-center justify-between"
        style={{ backgroundColor: typeColors[activity.type] }}
      >
        <span>{activity.icon} {activity.name}</span>
        <span className="text-xs opacity-90 capitalize">{activity.type}</span>
      </div>
      
      <div className="p-4">
        <p className="text-gray-700 text-sm mb-3">
          {activity.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
            ⏱️ {activity.duration}
          </span>
          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
            👶 {activity.ageRange}
          </span>
          <span className="px-2 py-1 bg-indigo-100 rounded text-xs text-indigo-700">
            🎯 {activity.targetSkill.replace('-', ' ')}
          </span>
        </div>

        {activity.materials.length > 0 && (
          <div className="text-xs text-gray-500">
            <span className="font-bold">Materials:</span> {activity.materials.join(', ')}
          </div>
        )}

        {isSelected && (
          <div className="mt-3 pt-3 border-t text-center">
            <span className="text-blue-500 font-bold">✓ Selected</span>
          </div>
        )}
      </div>
    </div>
  );
}
