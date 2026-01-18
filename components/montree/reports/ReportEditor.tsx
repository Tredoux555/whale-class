// components/montree/reports/ReportEditor.tsx
// Editor component for reviewing and editing reports
// Phase 3 - Session 54

'use client';

import React, { useState } from 'react';
import type { MontreeWeeklyReport, ReportContent, ReportHighlight } from '@/lib/montree/reports/types';
import { 
  getStatusColor, 
  getStatusText,
  getAreaColor,
  getAreaDisplayName,
  formatWeekRange
} from '@/lib/montree/reports/types';

interface ReportEditorProps {
  report: MontreeWeeklyReport;
  childName: string;
  thumbnailUrls: Record<string, string>;
  onSave: (content: Partial<ReportContent>) => Promise<void>;
  onApprove: () => Promise<void>;
  onSend: () => Promise<void>;
  saving?: boolean;
}

export default function ReportEditor({
  report,
  childName,
  thumbnailUrls,
  onSave,
  onApprove,
  onSend,
  saving = false,
}: ReportEditorProps) {
  const [content, setContent] = useState<ReportContent>(report.content);
  const [editingHighlight, setEditingHighlight] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // ============================================
  // UPDATE HANDLERS
  // ============================================

  const updateSummary = (summary: string) => {
    setContent(prev => ({ ...prev, summary }));
    setHasChanges(true);
  };

  const updateHighlight = (mediaId: string, updates: Partial<ReportHighlight>) => {
    setContent(prev => ({
      ...prev,
      highlights: prev.highlights.map(h => 
        h.media_id === mediaId ? { ...h, ...updates } : h
      ),
    }));
    setHasChanges(true);
  };

  const updateParentMessage = (parent_message: string) => {
    setContent(prev => ({ ...prev, parent_message }));
    setHasChanges(true);
  };

  const updateTeacherNotes = (teacher_notes: string) => {
    setContent(prev => ({ ...prev, teacher_notes }));
    setHasChanges(true);
  };

  // ============================================
  // SAVE HANDLER
  // ============================================

  const handleSave = async () => {
    await onSave(content);
    setHasChanges(false);
  };

  // ============================================
  // RENDER
  // ============================================

  const weekRange = formatWeekRange(report.week_start, report.week_end);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
              {childName.charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{childName}</h1>
              <p className="text-sm text-gray-500">{weekRange}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
            {getStatusText(report.status)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>📷 {content.total_photos} photos</span>
          <span>📝 {content.total_activities} activities</span>
          {content.areas_explored.map(area => (
            <span key={area} className={`px-2 py-0.5 rounded-full text-xs font-medium ${getAreaColor(area)}`}>
              {getAreaDisplayName(area)}
            </span>
          ))}
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Weekly Summary</h2>
        <textarea
          value={content.summary}
          onChange={(e) => updateSummary(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
          placeholder="Write a summary of the week's activities..."
        />
      </div>

      {/* Highlights Section */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Activity Highlights</h2>
        
        <div className="space-y-4">
          {content.highlights.map((highlight, index) => (
            <div 
              key={highlight.media_id}
              className="border border-gray-100 rounded-xl p-3 hover:border-gray-200 transition-colors"
            >
              <div className="flex gap-3">
                {/* Thumbnail */}
                <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  {thumbnailUrls[highlight.storage_path || ''] ? (
                    <img
                      src={thumbnailUrls[highlight.storage_path || '']}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📷
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Work name and area */}
                  <div className="flex items-center gap-2 mb-2">
                    {highlight.area && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getAreaColor(highlight.area)}`}>
                        {getAreaDisplayName(highlight.area)}
                      </span>
                    )}
                    {highlight.work_name && (
                      <span className="text-sm font-medium text-gray-700">
                        {highlight.work_name}
                      </span>
                    )}
                  </div>

                  {editingHighlight === highlight.media_id ? (
                    // Edit mode
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">Observation</label>
                        <textarea
                          value={highlight.observation}
                          onChange={(e) => updateHighlight(highlight.media_id, { observation: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Developmental Note</label>
                        <textarea
                          value={highlight.developmental_note}
                          onChange={(e) => updateHighlight(highlight.media_id, { developmental_note: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Home Extension</label>
                        <textarea
                          value={highlight.home_extension || ''}
                          onChange={(e) => updateHighlight(highlight.media_id, { home_extension: e.target.value || null })}
                          rows={2}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                          placeholder="Suggest an activity parents can try at home..."
                        />
                      </div>
                      <button
                        onClick={() => setEditingHighlight(null)}
                        className="text-xs text-blue-500 font-medium"
                      >
                        Done editing
                      </button>
                    </div>
                  ) : (
                    // View mode
                    <div>
                      <p className="text-sm text-gray-700 mb-1">{highlight.observation}</p>
                      <p className="text-xs text-gray-500 italic mb-1">{highlight.developmental_note}</p>
                      {highlight.home_extension && (
                        <p className="text-xs text-blue-600">🏠 {highlight.home_extension}</p>
                      )}
                      <button
                        onClick={() => setEditingHighlight(highlight.media_id)}
                        className="text-xs text-gray-400 hover:text-blue-500 mt-2"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {content.highlights.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No photos for this week yet
            </p>
          )}
        </div>
      </div>

      {/* Parent Message (for parent reports) */}
      {report.report_type === 'parent' && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Closing Message for Parents</h2>
          <textarea
            value={content.parent_message || ''}
            onChange={(e) => updateParentMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Add a warm closing message..."
          />
        </div>
      )}

      {/* Teacher Notes (for teacher reports) */}
      {report.report_type === 'teacher' && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Teacher Notes (Private)</h2>
          <textarea
            value={content.teacher_notes || ''}
            onChange={(e) => updateTeacherNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Add private notes..."
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-xl p-4 shadow-sm sticky bottom-4">
        <div className="flex items-center justify-between gap-3">
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
              hasChanges && !saving
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? 'Saving...' : hasChanges ? 'Save Changes' : 'Saved'}
          </button>

          <div className="flex gap-2">
            {/* Approve button */}
            {report.status === 'draft' && (
              <button
                onClick={onApprove}
                disabled={saving}
                className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                ✓ Approve
              </button>
            )}

            {/* Send button */}
            {(report.status === 'approved' || report.status === 'draft') && (
              <button
                onClick={onSend}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                📤 Send to Parents
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
