// components/montree/guru/ConcernPills.tsx
// Small row of pills showing the parent's selected concerns
// Used in the chat header area
'use client';

import { getConcernById } from '@/lib/montree/guru/concern-mappings';

interface ConcernPillsProps {
  concernIds: string[];
}

export default function ConcernPills({ concernIds }: ConcernPillsProps) {
  if (!concernIds.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {concernIds.map(id => {
        const concern = getConcernById(id);
        if (!concern) return null;
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F5E6D3]/70 text-[#0D3330] text-xs font-medium border border-[#0D3330]/10"
          >
            <span className="text-xs">{concern.icon}</span>
            {concern.title}
          </span>
        );
      })}
    </div>
  );
}
