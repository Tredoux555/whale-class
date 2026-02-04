'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface AddWorkModalProps {
  classroomId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultArea?: string;
}

const AREAS = [
  { key: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-green-400 to-emerald-500' },
  { key: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-orange-400 to-amber-500' },
  { key: 'mathematics', name: 'Mathematics', icon: '🔢', color: 'from-blue-400 to-indigo-500' },
  { key: 'language', name: 'Language', icon: '📚', color: 'from-pink-400 to-rose-500' },
  { key: 'cultural', name: 'Cultural', icon: '🌍', color: 'from-purple-400 to-violet-500' },
];

const AGE_OPTIONS = ['2-3', '3-4', '3-6', '4-5', '5-6', '6+'];

export default function AddWorkModal({
  classroomId,
  isOpen,
  onClose,
  onSuccess,
  defaultArea,
}: AddWorkModalProps) {
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    name_chinese: '',
    area_key: defaultArea || 'practical_life',
    age_range: '3-6',
    description: '',
    why_it_matters: '',
    direct_aims: '',
    indirect_aims: '',
    materials: '',
    teacher_notes: '',
  });

  const resetForm = () => {
    setForm({
      name: '',
      name_chinese: '',
      area_key: defaultArea || 'practical_life',
      age_range: '3-6',
      description: '',
      why_it_matters: '',
      direct_aims: '',
      indirect_aims: '',
      materials: '',
      teacher_notes: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGenerateAI = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a work name first');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/montree/curriculum/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_name: form.name,
          teacher_notes: form.teacher_notes,
          area: form.area_key,
        }),
      });

      const data = await res.json();
      if (data.description || data.why_it_matters) {
        setForm(prev => ({
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

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a work name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: classroomId,
          name: form.name.trim(),
          name_chinese: form.name_chinese.trim() || null,
          area_key: form.area_key,
          age_range: form.age_range,
          description: form.description.trim() || null,
          why_it_matters: form.why_it_matters.trim() || null,
          direct_aims: form.direct_aims.split('\n').filter(s => s.trim()),
          indirect_aims: form.indirect_aims.split('\n').filter(s => s.trim()),
          materials: form.materials.split('\n').filter(s => s.trim()),
          teacher_notes: form.teacher_notes.trim() || null,
          is_custom: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`"${form.name}" added to curriculum!`);
        handleClose();
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to add work');
      }
    } catch (err) {
      console.error('Add work error:', err);
      toast.error('Failed to add work');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  const selectedArea = AREAS.find(a => a.key === form.area_key) || AREAS[0];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-4 border-b bg-gradient-to-r ${selectedArea.color} text-white flex-shrink-0 rounded-t-2xl`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedArea.icon}</span>
              <div>
                <h3 className="font-bold text-lg">Add New Work</h3>
                <p className="text-white/80 text-sm">Create a custom curriculum work</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-xl transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <div className="grid grid-cols-5 gap-2">
              {AREAS.map(area => (
                <button
                  key={area.key}
                  type="button"
                  onClick={() => setForm({ ...form, area_key: area.key })}
                  className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                    form.area_key === area.key
                      ? `bg-gradient-to-br ${area.color} text-white shadow-lg scale-105`
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  <span className="text-xl">{area.icon}</span>
                  <span className="text-[10px] font-medium leading-tight text-center">{area.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Pouring Water, Pink Tower, Sandpaper Letters"
              className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Chinese Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chinese Name</label>
            <input
              type="text"
              value={form.name_chinese}
              onChange={e => setForm({ ...form, name_chinese: e.target.value })}
              placeholder="中文名称（可选）"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400"
            />
          </div>

          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age Range</label>
            <div className="flex flex-wrap gap-2">
              {AGE_OPTIONS.map(age => (
                <button
                  key={age}
                  type="button"
                  onClick={() => setForm({ ...form, age_range: age })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    form.age_range === age
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>

          {/* AI Generate Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-3 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-purple-700">✨ AI Description Generator</p>
              <button
                onClick={handleGenerateAI}
                disabled={generating || !form.name.trim()}
                className="px-4 py-1.5 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {generating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generating...
                  </>
                ) : (
                  <>🧠 Generate</>
                )}
              </button>
            </div>
            <p className="text-xs text-purple-600">
              Enter a work name, then click to generate parent-friendly descriptions
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (for parents)</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="What parents will see about this work..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Why It Matters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">💡 Why It Matters</label>
            <textarea
              value={form.why_it_matters}
              onChange={e => setForm({ ...form, why_it_matters: e.target.value })}
              rows={2}
              placeholder="The developmental significance of this work..."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none"
            />
          </div>

          {/* Direct Aims */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🎯 Direct Aims (one per line)</label>
            <textarea
              value={form.direct_aims}
              onChange={e => setForm({ ...form, direct_aims: e.target.value })}
              rows={3}
              placeholder="Control of movement&#10;Fine motor skills&#10;Hand-eye coordination"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Indirect Aims */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🌱 Indirect Aims (one per line)</label>
            <textarea
              value={form.indirect_aims}
              onChange={e => setForm({ ...form, indirect_aims: e.target.value })}
              rows={3}
              placeholder="Concentration&#10;Independence&#10;Self-discipline"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Materials */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">🧰 Materials Needed (one per line)</label>
            <textarea
              value={form.materials}
              onChange={e => setForm({ ...form, materials: e.target.value })}
              rows={3}
              placeholder="Small pitcher&#10;Bowl&#10;Sponge&#10;Tray"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>

          {/* Teacher Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">📝 Teacher Notes (private)</label>
            <textarea
              value={form.teacher_notes}
              onChange={e => setForm({ ...form, teacher_notes: e.target.value })}
              rows={3}
              placeholder="Notes for yourself about this work..."
              className="w-full px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 focus:outline-none text-gray-900 placeholder-gray-400 resize-none text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-3 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim()}
            className={`flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${
              form.name.trim()
                ? `bg-gradient-to-r ${selectedArea.color} text-white hover:shadow-lg`
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Adding...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                ➕ Add Work
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
