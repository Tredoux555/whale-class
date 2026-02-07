'use client';

import { useState, useEffect, useRef } from 'react';
import { AGE_OPTIONS } from '../types';

export default function AgePicker({ value, onChange }: { value: number; onChange: (age: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selected = AGE_OPTIONS.find(a => a.value === value) || AGE_OPTIONS[2];

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-left flex items-center gap-3 hover:border-blue-300 transition-colors shadow-sm"
      >
        <span className="text-xl">🎂</span>
        <div className="flex-1">
          <p className="text-xs text-slate-400">Age</p>
          <p className="text-slate-700 font-medium">{selected.label} years old</p>
        </div>
        <span className="text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {AGE_OPTIONS.map((age, index) => (
              <button
                key={age.value}
                onClick={() => { onChange(age.value); setIsOpen(false); }}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 ${
                  value === age.value ? 'bg-blue-50' : ''
                } ${index < AGE_OPTIONS.length - 1 ? 'border-b border-slate-50' : ''}`}
              >
                <span className="text-slate-700 flex-1">{age.label} years old</span>
                {value === age.value && <span className="text-blue-500">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
