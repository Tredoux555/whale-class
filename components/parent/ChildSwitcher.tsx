'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Child {
  id: string;
  name: string;
  avatar_url: string | null;
  age: number | null;
}

interface Props {
  children: Child[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ChildSwitcher({ children, selectedId, onSelect }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedChild = children.find(c => c.id === selectedId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (children.length === 1) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {selectedChild?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-gray-900">{selectedChild?.name}</div>
          {selectedChild && selectedChild.age !== null && (
            <div className="text-xs text-gray-500">{selectedChild.age} years old</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
          {selectedChild?.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left">
          <div className="font-medium text-gray-900">{selectedChild?.name}</div>
          {selectedChild && selectedChild.age !== null && (
            <div className="text-xs text-gray-500">{selectedChild.age} years old</div>
          )}
        </div>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border py-2 z-20">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                onSelect(child.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 ${
                child.id === selectedId ? 'bg-blue-50' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
                {child.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900">{child.name}</div>
                {child.age !== null && child.age !== undefined && (
                  <div className="text-xs text-gray-500">{child.age} years old</div>
                )}
              </div>
              {child.id === selectedId && (
                <svg className="w-5 h-5 text-blue-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

