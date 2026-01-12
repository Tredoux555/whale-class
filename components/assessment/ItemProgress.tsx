// components/assessment/ItemProgress.tsx
// Shows current item progress (e.g., "3 of 8")

'use client';

interface Props {
  current: number;
  total: number;
}

export default function ItemProgress({ current, total }: Props) {
  return (
    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
      <span className="text-lg font-bold text-gray-700">
        {current} <span className="text-gray-400">of</span> {total}
      </span>
    </div>
  );
}
