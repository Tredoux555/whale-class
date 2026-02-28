// components/montree/media/DeleteConfirmDialog.tsx
// Confirmation dialog for single and bulk photo deletion
'use client';

import React from 'react';
import { useI18n } from '@/lib/montree/i18n';

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
  const { t } = useI18n();
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
            {isBulk ? t('deleteDialog.multipleTitle') : t('deleteDialog.singleTitle')}
          </h2>

          <p className="text-gray-600">
            {isBulk ? (
              <>
                {t('deleteDialog.bulkMessage').replace('{count}', count.toString())}
              </>
            ) : (
              t('deleteDialog.singleMessage')
            )}
          </p>

          <p className="text-sm text-red-600 font-medium">
            {t('deleteDialog.warning')}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isBulk ? t('deleteDialog.keepPhotos') : t('deleteDialog.keepPhoto')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('deleteDialog.deleting')}
              </>
            ) : (
              <>🗑️ {t('deleteDialog.delete')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
