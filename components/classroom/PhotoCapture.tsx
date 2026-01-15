'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface PhotoCaptureProps {
  childId?: string;
  childName?: string;
  workId?: string;
  workName?: string;
  weekNumber?: number;
  year?: number;
  defaultCategory?: 'work' | 'life' | 'shared';
  onComplete?: () => void;
  onClose?: () => void;
}

const CATEGORIES = [
  { id: 'work', label: 'Work Photo', icon: '📚', desc: 'Linked to curriculum', color: 'from-blue-500 to-indigo-500' },
  { id: 'life', label: 'Life Photo', icon: '🌳', desc: 'Play, snack, moments', color: 'from-green-500 to-emerald-500' },
  { id: 'shared', label: 'Group Photo', icon: '👥', desc: 'Goes to ALL children', color: 'from-purple-500 to-violet-500' },
];

export default function PhotoCapture({
  childId,
  childName,
  workId,
  workName,
  weekNumber,
  year,
  defaultCategory = 'work',
  onComplete,
  onClose
}: PhotoCaptureProps) {
  const [category, setCategory] = useState<'work' | 'life' | 'shared'>(defaultCategory);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState(workName || '');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    
    if (file.size > maxSize) {
      toast.error(`File too large! Max ${isVideo ? '50MB' : '10MB'}`);
      return;
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    // Validate required fields based on category
    if (category === 'work' && !childId) {
      toast.error('Select a child for work photos');
      return;
    }
    if (category === 'life' && !childId) {
      toast.error('Select a child for life photos');
      return;
    }

    setUploading(true);

    try {
      if (category === 'shared') {
        // Upload to shared_photos - will auto-distribute to all children
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('title', title || 'Group Photo');
        formData.append('description', notes);

        const res = await fetch('/api/classroom/shared-photo', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          toast.success('📸 Shared with all children!');
          onComplete?.();
          handleReset();
        } else {
          toast.error(data.error || 'Upload failed');
        }
      } else {
        // Regular child photo (work or life)
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('childId', childId!);
        formData.append('category', category);
        formData.append('workName', title || (category === 'work' ? 'Classroom Work' : 'Classroom Moment'));
        if (workId) formData.append('workId', workId);
        if (notes) formData.append('notes', notes);
        if (weekNumber) formData.append('weekNumber', weekNumber.toString());
        if (year) formData.append('year', year.toString());

        const res = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          toast.success(`✅ Saved to ${childName}'s ${category === 'work' ? 'work' : 'memories'}!`);
          onComplete?.();
          handleReset();
        } else {
          toast.error(data.error || 'Upload failed');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setTitle(workName || '');
    setNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isVideo = selectedFile?.type.startsWith('video/');

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">📷 Capture Photo</h3>
            {childName && <p className="text-blue-200 text-sm">{childName}</p>}
          </div>
          {onClose && (
            <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30">
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Category Selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Photo Type</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id as any)}
                disabled={cat.id !== 'shared' && !childId}
                className={`p-3 rounded-xl text-center transition-all ${
                  category === cat.id
                    ? `bg-gradient-to-br ${cat.color} text-white shadow-lg scale-105`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${cat.id !== 'shared' && !childId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="text-xs font-medium">{cat.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {CATEGORIES.find(c => c.id === category)?.desc}
          </p>
        </div>

        {/* Preview or File Select */}
        {preview ? (
          <div className="relative">
            {isVideo ? (
              <video src={preview} controls className="w-full rounded-xl bg-black" />
            ) : (
              <img src={preview} alt="Preview" className="w-full rounded-xl object-contain max-h-64" />
            )}
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
              <div className="text-4xl mb-2">📷</div>
              <p className="font-medium text-gray-700">Tap to capture</p>
              <p className="text-xs text-gray-500 mt-1">Photo or video</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}

        {/* Title (for life/shared photos) */}
        {(category === 'life' || category === 'shared') && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {category === 'shared' ? 'Photo Title' : 'What are they doing?'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={category === 'shared' ? 'e.g., Class Photo January' : 'e.g., Playing outside'}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
              !selectedFile || uploading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-lg active:scale-95'
            }`}
          >
            {uploading ? 'Saving...' : '✓ Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
