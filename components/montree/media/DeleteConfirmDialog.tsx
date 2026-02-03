// components/montree/media/DeleteConfirmDialog.tsx
// Confirmation dialog for single and bulk photo deletion
'use client';

import React from 'react';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  count?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export default function DeleteConfirmDialog({
  isOpen,
  count = 1,
  onConfirm,
  onCancel,
  isDeleting = false,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  const isBulk = count > 1;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center pt-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">🗑️</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-2">
          <h2 className="text-lg font-bold text-gray-900">
            {isBulk ? 'Delete Multiple Photos?' : 'Delete Photo?'}
          </h2>
          
          <p className="text-gray-600">
            {isBulk ? (
              <>
                You're about to delete <span className="font-semibold">{count} photos</span>.
              </>
            ) : (
              'You\'re about to delete this photo.'
            )}
          </p>

          <p className="text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Keep Photo{!isBulk ? '' : 's'}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>🗑️ Delete</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
