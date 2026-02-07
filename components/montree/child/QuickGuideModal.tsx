'use client';

import { useRouter } from 'next/navigation';

export interface QuickGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  workName: string;
  guideData: any;
  loading: boolean;
}

export default function QuickGuideModal({
  isOpen,
  onClose,
  workName,
  guideData,
  loading,
}: QuickGuideModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[80vh] rounded-t-3xl sm:rounded-3xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b bg-gradient-to-r from-amber-500 to-yellow-500 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">📖 Quick Guide</h3>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          <p className="text-amber-100 text-sm">{workName}</p>
        </div>

        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-bounce text-3xl mb-2">📖</div>
              <p className="text-gray-500">Loading guide...</p>
            </div>
          ) : guideData?.quick_guide ? (
            <div className="space-y-4">
              {/* Quick Guide Content */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-amber-200">
                <p className="font-bold text-amber-800 mb-2">⚡ 10-Second Guide</p>
                <div className="text-sm text-amber-900 space-y-2">
                  {guideData.quick_guide.split('\n').map((line: string, i: number) => (
                    <p key={i} className="leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>

              {/* Materials if available */}
              {guideData.materials?.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="font-semibold text-gray-700 text-sm mb-1">🧰 Materials</p>
                  <ul className="text-sm text-gray-600">
                    {guideData.materials.map((m: string, i: number) => (
                      <li key={i}>• {m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No quick guide available yet for this work.</p>
              <p className="text-sm text-gray-400">Check the curriculum page for more details.</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-2">
          <button
            onClick={() => window.open(`https://youtube.com/results?search_query=${encodeURIComponent(guideData?.video_search_term || workName + ' Montessori presentation')}`, '_blank')}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-600"
          >
            🎬 Watch Video
          </button>
          <button
            onClick={() => {
              onClose();
              router.push('/montree/dashboard/curriculum');
            }}
            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600"
          >
            📚 Full Details
          </button>
        </div>
      </div>
    </div>
  );
}
