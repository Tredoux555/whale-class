'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';

interface WorkMediaCaptureProps {
  childId: string;
  childName: string;
  workId: string;
  workName: string;
  isOpen: boolean;
  onClose: () => void;
  onMediaUploaded: (media: any) => void;
}

export default function WorkMediaCapture({
  childId,
  childName,
  workId,
  workName,
  isOpen,
  onClose,
  onMediaUploaded
}: WorkMediaCaptureProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      toast.error('Please select an image or video');
      return;
    }

    // Validate size
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`File too large. Max ${isVideo ? '50MB' : '10MB'}`);
      return;
    }

    setSelectedFile(file);
    
    // Generate preview
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('childId', childId);
      formData.append('workId', workId);
      formData.append('workName', workName);
      if (notes) formData.append('notes', notes);

      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success(`${data.mediaType === 'video' ? 'Video' : 'Photo'} saved!`);
        onMediaUploaded(data.media);
        handleReset();
        onClose();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setSelectedFile(null);
    setNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const isVideo = selectedFile?.type.startsWith('video/');

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">📷 Capture Work</h3>
              <p className="text-white/80 text-sm">{workName}</p>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Child Info */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
              {childName.charAt(0)}
            </div>
            <div>
              <p className="font-medium text-gray-900">{childName}</p>
              <p className="text-xs text-gray-500">{workName}</p>
            </div>
          </div>

          {/* Preview Area */}
          {preview ? (
            <div className="relative mb-4">
              {isVideo ? (
                <video 
                  ref={videoRef}
                  src={preview} 
                  className="w-full rounded-xl bg-black"
                  controls
                  playsInline
                />
              ) : (
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full rounded-xl object-contain max-h-64"
                />
              )}
              <button
                onClick={handleReset}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="block mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
                <div className="text-4xl mb-2">📷</div>
                <p className="font-medium text-gray-700">Tap to select photo or video</p>
                <p className="text-xs text-gray-500 mt-1">Max: 10MB photos, 50MB videos</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          )}

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes (optional)..."
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={2}
          />

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                !selectedFile || uploading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg active:scale-95'
              }`}
            >
              {uploading ? 'Uploading...' : '✓ Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
