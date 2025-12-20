'use client';

import React, { useEffect, useState } from 'react';

interface Child {
  id: string;
  name: string;
}

interface Props {
  selectedChildId: string | null;
  onSelect: (childId: string | null) => void;
}

export default function ChildSelector({ selectedChildId, onSelect }: Props) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChildren() {
      try {
        const res = await fetch('/api/whale/children');
        const data = await res.json();
        // Handle API response format: { data: children } or { children: [...] }
        setChildren(data.data || data.children || []);
      } catch (err) {
        console.error('Error fetching children:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchChildren();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">
        Track Progress For:
      </label>
      <select
        value={selectedChildId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-3 py-2 border rounded-md text-sm"
      >
        <option value="">-- Select Child --</option>
        {children.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
          </option>
        ))}
      </select>
    </div>
  );
}


