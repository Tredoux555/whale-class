'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Work, EditFormData } from './types';

interface EditWorkModalProps {
  editingWork: Work | null;
  onClose: () => void;
  onSaved: () => void;
  selectedArea?: string;
}

export default function EditWorkModal({
  editingWork,
  onClose,
  onSaved,
  selectedArea
}: EditWorkModalProps) {
  const [editForm, setEditForm] = useState<EditFormData>({
    name: '',
    name_chinese: '',
    description: '',
    why_it_matters: '',
    age_range: '',
    direct_aims: '',
    indirect_aims: '',
    materials: '',
    teacher_notes: '',
  });

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize form when editingWork changes
  if (editingWork && editForm.name !== editingWork.name) {
    setEditForm({
      name: editingWork.name || '',
      name_chinese: editingWork.name_chinese || '',
      description: editingWork.parent_explanation || editingWork.description || '',
      why_it_matters: editingWork.why_it_matters || '',
      age_range: editingWork.age_range || '3-6',
      direct_aims: (editingWork.direct_aims || []).join('\n'),
      indirect_aims: (editingWork.indirect_aims || []).join('\n'),
      materials: (editingWork.materials_needed || []).join('\n'),
      teacher_notes: editingWork.teacher_notes || '',
    });
  }

  const handleGenerateAI = async () => {
    if (!editForm.name.trim()) {
      toast.error('Please enter a work name first');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/montree/curriculum/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_name: editForm.name,
          teacher_notes: editForm.teacher_notes,
          area: editingWork?.area_id || selectedArea,
        }),
      });

      const data = await res.json();
      if (data.description || data.why_it_matters) {
        setEditForm(prev => ({
          ...prev,
          description: data.description || prev.description,
          why_it_matters: data.why_it_matters || prev.why_it_matters,
        }));
        toast.success('✨ Descriptions generated!');
      } else if (data.error) {
        toast.error(data.error);
      } else {
        toast.error('Failed to generate');
      }
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error('Failed to generate description');
    }
    setGenerating(false);
  };

  const handleSaveEdit = async () => {
    if (!editingWork) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/curriculum/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: editingWork.id,
          name: editForm.name,
          name_chinese: editForm.name_chinese,
          description: editForm.description,
          parent_description: editForm.description,
          why_it_matters: editForm.why_it_matters,
          age_range: editForm.age_range,
          direct_aims: editForm.direct_aims.split('\n').filter(s => s.trim()),
          indirect_aims: editForm.indirect_aims.split('\n').filter(s => s.trim()),
          materials: editForm.materials.split('\n').filter(s => s.trim()),
          teacher_notes: editForm.teacher_notes,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Work updated!');
        onClose();
        onSaved();
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch (err) {
      toast.error('Failed to save changes');
    }
    setSaving(false);
  };

  if (!editingWork) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Edit Work</h3>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl">×</button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={e => setEditForm({...editForm, name: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900"
            />
          </div>

          {/* Chinese Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chinese Name</label>
            <input
              type="text"
              value={editForm.name_chinese}
              onChange={e => setEditForm({...editForm, name_chinese: e.target.value})}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900"
            />
          </div>

          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age Range</label>
            <input
              type="text"
              value={editForm.age_range}
              onChange={e => setEditForm({...editForm, age_range: e.target.value})}
              placeholder="e.g. 3-6"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* AI Generate Button */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-700">✨ AI Description Generator</p>
              <button
                onClick={handleGenerateAI}
                disabled={generating || !editForm.name.trim()}
                className="px-4 py-1.5 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
              >
                {generating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>🧠 Generate with AI</>
                )}
              </button>
            </div>
            <p className="text-xs text-purple-600">
              AI will generate parent-friendly descriptions matching the Montessori Guru style
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (for parents)</label>
            <textarea
              value={editForm.description}
              onChange={e => setEditForm({...editForm, description: e.target.value})}
              rows={3}
              placeholder="What parents will see about this work..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Why It Matters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">💡 Why It Matters</label>
            <textarea
              value={editForm.why_it_matters}
              onChange={e => setEditForm({...editForm, why_it_matters: e.target.value})}
              rows={2}
              placeholder="The developmental significance..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Direct Aims */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Direct Aims (one per line)</label>
            <textarea
              value={editForm.direct_aims}
              onChange={e => setEditForm({...editForm, direct_aims: e.target.value})}
              rows={3}
              placeholder="Control of movement&#10;Balance"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Indirect Aims */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🌱 Indirect Aims (one per line)</label>
            <textarea
              value={editForm.indirect_aims}
              onChange={e => setEditForm({...editForm, indirect_aims: e.target.value})}
              rows={3}
              placeholder="Concentration&#10;Independence"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🧰 Materials (one per line)</label>
            <textarea
              value={editForm.materials}
              onChange={e => setEditForm({...editForm, materials: e.target.value})}
              rows={3}
              placeholder="Pink Tower cubes&#10;Work mat"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Teacher Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📝 Teacher Notes (private)</label>
            <textarea
              value={editForm.teacher_notes}
              onChange={e => setEditForm({...editForm, teacher_notes: e.target.value})}
              rows={3}
              placeholder="Notes for yourself about this work..."
              className="w-full px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-3 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={handleSaveEdit} disabled={saving}
            className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
