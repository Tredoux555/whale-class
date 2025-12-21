// app/admin/montree/components/ChildSelector.tsx
'use client';

import React from 'react';
import { Child } from '@/lib/montree/types';

interface Props {
  children: Child[];
  selectedChild: Child | null;
  onSelect: (child: Child) => void;
}

export default function ChildSelector({ children, selectedChild, onSelect }: Props) {
  if (!Array.isArray(children) || children.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Child:</label>
      <select
        value={selectedChild?.id || ''}
        onChange={(e) => {
          const child = children.find(c => c.id === e.target.value);
          if (child) onSelect(child);
        }}
        className="px-4 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
          </option>
        ))}
      </select>
    </div>
  );
}

