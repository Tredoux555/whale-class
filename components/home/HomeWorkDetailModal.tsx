// components/home/HomeWorkDetailModal.tsx
// Parent-focused work detail modal
// Shows: work name, description, area, materials (with buy/make indicator and cost)
// home tips, parent presentation guide, status progression, notes field, video demo

'use client';

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface WorkDetailAssignment {
  id: string;
  work_id?: string;
  work_name: string;
  work_description?: string;
  area: string;
  progress_status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  notes?: string;
  child_name?: string;
  child_id?: string;
}

interface MaterialItem {
  name: string;
  quantity?: string;
  buy_or_make: 'buy' | 'make';
  estimated_cost?: number;
  notes?: string;
}

interface HomeWorkDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: WorkDetailAssignment | null;
  materials?: MaterialItem[];
  homeTip?: string;
  parentGuide?: string;
  directAims?: string[];
  indirectAims?: string[];
  onStatusChange?: (assignmentId: string, newStatus: string) => void;
  onNotesChange?: (assignmentId: string, notes: string) => void;
}

const STATUS_FLOW = ['not_started', 'presented', 'practicing', 'mastered'] as const;

const STATUS_CONFIG = {
  not_started: {
    label: 'Not Started',
    emoji: '○',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    activeColor: 'bg-gray-200 ring-2 ring-gray-400',
  },
  presented: {
    label: 'Presented',
    emoji: '🟡',
    color: 'bg-amber-50 text-amber-700 border-amber-300',
    activeColor: 'bg-amber-100 ring-2 ring-amber-400',
  },
  practicing: {
    label: 'Practicing',
    emoji: '🔵',
    color: 'bg-blue-50 text-blue-700 border-blue-300',
    activeColor: 'bg-blue-100 ring-2 ring-blue-400',
  },
  mastered: {
    label: 'Mastered',
    emoji: '🟢',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    activeColor: 'bg-emerald-100 ring-2 ring-emerald-400',
  },
};

const AREA_CONFIG: Record<string, { name: string; color: string; icon: string }> = {
  practical_life: {
    name: 'Practical Life',
    color: 'from-emerald-500 to-emerald-600',
    icon: '🌿',
  },
  sensorial: {
    name: 'Sensorial',
    color: 'from-orange-500 to-orange-600',
    icon: '👁️',
  },
  mathematics: {
    name: 'Mathematics',
    color: 'from-blue-500 to-blue-600',
    icon: '🔢',
  },
  math: {
    name: 'Mathematics',
    color: 'from-blue-500 to-blue-600',
    icon: '🔢',
  },
  language: {
    name: 'Language',
    color: 'from-pink-500 to-pink-600',
    icon: '📚',
  },
  cultural: {
    name: 'Cultural',
    color: 'from-purple-500 to-purple-600',
    icon: '🌍',
  },
};

export default function HomeWorkDetailModal({
  isOpen,
  onClose,
  assignment,
  materials = [],
  homeTip,
  parentGuide,
  directAims = [],
  indirectAims = [],
  onStatusChange,
  onNotesChange,
}: HomeWorkDetailModalProps) {
  const [notes, setNotes] = useState(assignment?.notes || '');
  const [saving, setSaving] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!isOpen || !assignment) return null;

  const area = AREA_CONFIG[assignment.area] || AREA_CONFIG.practical_life;
  const currentStatus = assignment.progress_status;

  // Status handling
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    try {
      onStatusChange?.(assignment.id, newStatus);
      toast.success(`→ ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG].label}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Notes handling
  const handleSaveNotes = async () => {
    if (notes === assignment.notes) return;

    setSaving(true);
    try {
      onNotesChange?.(assignment.id, notes);
      toast.success('Notes saved!');
    } catch (error) {
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  // Video demo
  const openYouTubeDemo = () => {
    const query = encodeURIComponent(`${assignment.work_name} Montessori presentation`);
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  };

  // Calculate total cost
  const totalMaterialsCost = materials
    .filter((m) => m.estimated_cost)
    .reduce((sum, m) => sum + (m.estimated_cost || 0), 0);

  const handleClose = () => {
    setNotes(assignment?.notes || '');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${area.color} text-white p-4 sm:p-5`}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{area.icon}</span>
                <span className="text-sm opacity-80">{area.name}</span>
              </div>
              <h2 className="text-xl font-bold leading-tight">{assignment.work_name}</h2>
              {assignment.child_name && (
                <p className="text-sm opacity-90 mt-1">{assignment.child_name}</p>
              )}
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors ml-3 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Work Description */}
          {assignment.work_description && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm text-blue-900">{assignment.work_description}</p>
            </div>
          )}

          {/* Home Tip Section */}
          {homeTip && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-2">💡 Home Tip</p>
              <p className="text-sm text-amber-900 leading-relaxed">{homeTip}</p>
            </div>
          )}

          {/* Materials Needed */}
          {materials.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">🧰 Materials Needed</h3>
                {totalMaterialsCost > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    ~${totalMaterialsCost.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {materials.map((material, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span
                      className={`mt-1 px-2 py-0.5 text-xs font-semibold rounded-full shrink-0 ${
                        material.buy_or_make === 'buy'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {material.buy_or_make === 'buy' ? '🛒 Buy' : '✂️ Make'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 font-medium">
                        {material.name}
                        {material.quantity && <span className="text-gray-500"> ({material.quantity})</span>}
                      </p>
                      {material.notes && (
                        <p className="text-xs text-gray-500">{material.notes}</p>
                      )}
                      {material.estimated_cost && (
                        <p className="text-xs text-gray-600 font-medium">
                          ${material.estimated_cost.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parent Presentation Guide */}
          {parentGuide && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-indigo-800 mb-2">👨‍👩‍👧 Parent Presentation Guide</h3>
              <p className="text-sm text-indigo-900 leading-relaxed whitespace-pre-line">
                {parentGuide}
              </p>
            </div>
          )}

          {/* Direct & Indirect Aims */}
          <div className="grid gap-3 md:grid-cols-2">
            {directAims.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-green-800 mb-2">🎯 Direct Goals</h4>
                <ul className="space-y-1">
                  {directAims.map((aim, idx) => (
                    <li key={idx} className="text-sm text-green-900 flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{aim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {indirectAims.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-purple-800 mb-2">✨ Indirect Benefits</h4>
                <ul className="space-y-1">
                  {indirectAims.map((aim, idx) => (
                    <li key={idx} className="text-sm text-purple-900 flex items-start gap-2">
                      <span className="mt-0.5">•</span>
                      <span>{aim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Status Selector */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Progress Status</h3>
            <div className="grid grid-cols-4 gap-2">
              {STATUS_FLOW.map((status) => {
                const config = STATUS_CONFIG[status];
                const isActive = status === currentStatus;

                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`py-3 rounded-xl border-2 transition-all active:scale-95 text-center ${
                      isActive ? config.activeColor : config.color
                    }`}
                  >
                    <div className="text-xl mb-1">{config.emoji}</div>
                    <div className="text-xs font-medium">{config.label.split(' ')[0]}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Observation Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your child's progress..."
              className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              rows={3}
            />
            {notes !== (assignment.notes || '') && (
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="mt-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : '💾 Save Notes'}
              </button>
            )}
          </div>

          {/* Demo Video Button */}
          <button
            onClick={openYouTubeDemo}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="text-xl">▶️</span>
            <span>Watch Montessori Demo</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-xl transition-colors"
          >
            Done
          </button>
        </div>

        {/* Hidden video element */}
        <video ref={videoRef} className="hidden" />
      </div>
    </div>
  );
}
