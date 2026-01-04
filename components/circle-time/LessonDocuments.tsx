'use client';

import React, { useState, useEffect, useRef } from 'react';

interface LessonDocument {
  id: string;
  week_number: number;
  year: number;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  public_url: string;
  description: string;
  created_at: string;
}

interface LessonDocumentsProps {
  weekNumber: number;
  year?: number;
}

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-powerpoint': '📊',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '📊',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'text/plain': '📃',
  'video/mp4': '🎬',
  'video/webm': '🎬',
  'video/quicktime': '🎬',
  'video/x-msvideo': '🎬',
  'video/x-matroska': '🎬',
};

function isVideo(fileType: string): boolean {
  return fileType.startsWith('video/');
}

function isImage(fileType: string): boolean {
  return fileType.startsWith('image/');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LessonDocuments({ weekNumber, year = new Date().getFullYear() }: LessonDocumentsProps) {
  const [documents, setDocuments] = useState<LessonDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents when week changes
  useEffect(() => {
    fetchDocuments();
  }, [weekNumber, year]);

  async function fetchDocuments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lesson-documents/list?weekNumber=${weekNumber}&year=${year}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      } else {
        setError(data.error || 'Failed to fetch documents');
      }
    } catch (err) {
      setError('Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('weekNumber', weekNumber.toString());
    formData.append('year', year.toString());

    try {
      const res = await fetch('/api/lesson-documents/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        setDocuments(prev => [data.document, ...prev]);
      } else {
        setError(data.error || 'Failed to upload');
      }
    } catch (err) {
      setError('Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  async function deleteDocument(id: string) {
    if (!confirm('Delete this document?')) return;
    
    try {
      const res = await fetch(`/api/lesson-documents/delete?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.id !== id));
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete document');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = '';
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
        📁 Lesson Documents
        <span className="text-sm font-normal text-gray-500">
          ({documents.length} files)
        </span>
      </h3>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 mb-4 text-center transition-colors cursor-pointer ${
          dragOver 
            ? 'border-orange-400 bg-orange-50' 
            : 'border-gray-300 hover:border-orange-300 hover:bg-orange-50/50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.mp4,.webm,.mov,.avi,.mkv"
          onChange={handleFileSelect}
        />
        {uploading ? (
          <div className="text-orange-600">
            <span className="animate-pulse">⏳ Uploading...</span>
          </div>
        ) : (
          <div className="text-gray-500">
            <span className="text-2xl">📤</span>
            <p className="text-sm mt-1">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF, Word, PowerPoint, Images, Videos (max 100MB)
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-600 text-sm rounded-lg">
          ❌ {error}
        </div>
      )}

      {/* Documents List */}
      {loading ? (
        <div className="text-center py-4 text-gray-400">Loading...</div>
      ) : documents.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-sm">
          No documents uploaded for this week
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 group"
            >
              {/* Video Preview */}
              {isVideo(doc.file_type) && (
                <div className="mb-2 rounded-lg overflow-hidden bg-black">
                  <video 
                    controls 
                    className="w-full max-h-64"
                    preload="metadata"
                  >
                    <source src={doc.public_url} type={doc.file_type} />
                    Your browser does not support video playback.
                  </video>
                </div>
              )}
              
              {/* Image Preview */}
              {isImage(doc.file_type) && (
                <div className="mb-2 rounded-lg overflow-hidden">
                  <img 
                    src={doc.public_url} 
                    alt={doc.original_filename}
                    className="w-full max-h-48 object-contain bg-gray-100"
                  />
                </div>
              )}
              
              {/* File Info Row */}
              <div className="flex items-center justify-between">
                <a 
                  href={doc.public_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <span className="text-xl">
                    {FILE_ICONS[doc.file_type] || '📎'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {doc.original_filename}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatFileSize(doc.file_size)}
                    </div>
                  </div>
                </a>
                <button
                  onClick={(e) => { e.preventDefault(); deleteDocument(doc.id); }}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
