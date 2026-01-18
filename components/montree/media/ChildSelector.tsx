// components/montree/media/ChildSelector.tsx
// Child selection component for tagging photos
// Phase 2 - Session 53
// Supports single and multi-select modes

'use client';

import React, { useState, useMemo } from 'react';
import type { MontreeChild } from '@/lib/montree/media/types';

// ============================================
// TYPES
// ============================================

interface ChildSelectorProps {
  children: MontreeChild[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  multiSelect?: boolean;
  loading?: boolean;
  showSearch?: boolean;
  maxHeight?: string;
}

// ============================================
// COMPONENT
// ============================================

export default function ChildSelector({
  children,
  selectedIds,
  onSelectionChange,
  multiSelect = false,
  loading = false,
  showSearch = true,
  maxHeight = '400px',
}: ChildSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter children by search query
  const filteredChildren = useMemo(() => {
    if (!searchQuery.trim()) return children;
    
    const query = searchQuery.toLowerCase();
    return children.filter(child => 
      child.name.toLowerCase().includes(query)
    );
  }, [children, searchQuery]);

  // Handle child selection
  const handleSelect = (childId: string) => {
    if (multiSelect) {
      // Toggle selection in multi-select mode
      if (selectedIds.includes(childId)) {
        onSelectionChange(selectedIds.filter(id => id !== childId));
      } else {
        onSelectionChange([...selectedIds, childId]);
      }
    } else {
      // Single select mode
      onSelectionChange([childId]);
    }
  };

  // Select all / deselect all
  const handleSelectAll = () => {
    if (selectedIds.length === filteredChildren.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredChildren.map(c => c.id));
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-3" />
        <p>Loading children...</p>
      </div>
    );
  }

  // Empty state
  if (children.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <div className="text-4xl mb-3">👶</div>
        <p>No children found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Search bar */}
      {showSearch && children.length > 6 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Multi-select controls */}
      {multiSelect && filteredChildren.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {selectedIds.length} of {filteredChildren.length} selected
          </span>
          <button
            onClick={handleSelectAll}
            className="text-sm text-blue-500 hover:text-blue-600 font-medium"
          >
            {selectedIds.length === filteredChildren.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Children grid */}
      <div 
        className="overflow-y-auto p-3"
        style={{ maxHeight }}
      >
        {filteredChildren.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            No matches for "{searchQuery}"
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredChildren.map((child) => {
              const isSelected = selectedIds.includes(child.id);
              
              return (
                <button
                  key={child.id}
                  onClick={() => handleSelect(child.id)}
                  className={`
                    relative flex flex-col items-center p-4 rounded-xl transition-all
                    ${isSelected 
                      ? 'bg-blue-50 border-2 border-blue-500 shadow-sm' 
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className={`
                    w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-2
                    ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
                  `}>
                    {child.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name */}
                  <span className={`
                    text-sm font-medium text-center truncate w-full
                    ${isSelected ? 'text-blue-700' : 'text-gray-700'}
                  `}>
                    {child.name}
                  </span>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selection summary for multi-select */}
      {multiSelect && selectedIds.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100 bg-blue-50">
          <div className="flex flex-wrap gap-1">
            {selectedIds.map(id => {
              const child = children.find(c => c.id === id);
              if (!child) return null;
              
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                >
                  {child.name}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectionChange(selectedIds.filter(i => i !== id));
                    }}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPACT VERSION FOR QUICK SELECTION
// ============================================

export function ChildSelectorCompact({
  children,
  selectedId,
  onSelect,
  loading = false,
}: {
  children: MontreeChild[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto py-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="w-16 h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4">
      {children.map((child) => {
        const isSelected = selectedId === child.id;
        
        return (
          <button
            key={child.id}
            onClick={() => onSelect(child.id)}
            className={`
              flex-shrink-0 flex flex-col items-center p-2 rounded-lg transition-all w-16
              ${isSelected 
                ? 'bg-blue-100 ring-2 ring-blue-500' 
                : 'bg-gray-50 hover:bg-gray-100'
              }
            `}
          >
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-1
              ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}
            `}>
              {child.name.charAt(0).toUpperCase()}
            </div>
            <span className={`
              text-xs text-center truncate w-full
              ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-600'}
            `}>
              {child.name.split(' ')[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
