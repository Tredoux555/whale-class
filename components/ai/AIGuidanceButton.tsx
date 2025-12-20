// components/ai/AIGuidanceButton.tsx
// Button to trigger AI guidance modal (for use in work detail panels)

'use client';

import React, { useState } from 'react';
import ActivityGuidancePanel from './ActivityGuidancePanel';

interface Props {
  workId: string;
  workName: string;
  childId?: string;
  currentLevel?: number;
}

export default function AIGuidanceButton({ workId, workName, childId, currentLevel }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm rounded-lg hover:from-purple-600 hover:to-indigo-600"
      >
        <span>✨</span>
        AI Teaching Guide
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <ActivityGuidancePanel
            workId={workId}
            workName={workName}
            childId={childId}
            currentLevel={currentLevel}
            onClose={() => setShowModal(false)}
          />
        </div>
      )}
    </>
  );
}


