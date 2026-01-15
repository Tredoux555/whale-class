'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';

interface Resource {
  id: string;
  title: string;
  description?: string;
  category: string;
  file_url?: string;
  file_type?: string;
  file_size_bytes?: number;
  uploaded_by?: string;
  created_at: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '📁' },
  { id: 'games', label: 'Games', icon: '🎮' },
  { id: 'esl_games', label: 'ESL Games', icon: '🗣️' },
  { id: 'activities', label: 'Activities', icon: '🎨' },
  { id: 'printables', label: 'Printables', icon: '🖨️' },
  { id: 'videos', label: 'Videos', icon: '🎬' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'other', label: 'Other', icon: '📦' },
];

export default function TeacherResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploadCategory, setUploadCategory] = useState('games');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchResources();
  }, [activeCategory]);

  const fetchResources = async () => {
    try {
      const res = await fetch(`/api/teacher/resources?category=${activeCategory}`);
      const data = await res.json();
      setResources(data.resources || []);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadTitle.trim()) {
      toast.error('Title required');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('title', uploadTitle);
    formData.append('description', uploadDesc);
    formData.append('category', uploadCategory);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const res = await fetch('/api/teacher/resources', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        toast.success('✅ Resource added!');
        setShowUpload(false);
        resetUploadForm();
        fetchResources();
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/teacher/resources?id=${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast.success('Deleted');
        setResources(prev => prev.filter(r => r.id !== id));
      } else {
        toast.error(data.error || 'Delete failed');
      }
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const resetUploadForm = () => {
    setUploadTitle('');
    setUploadDesc('');
    setUploadCategory('games');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCategoryIcon = (cat: string) => {
    return CATEGORIES.find(c => c.id === cat)?.icon || '📦';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-bounce">📁</span>
          </div>
          <p className="text-gray-600 font-medium">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-2xl">📁</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Shared Resources</h1>
                <p className="text-emerald-200 text-sm">{resources.length} items</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowUpload(true)}
                className="px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
              >
                + Add Resource
              </button>
              <Link
                href="/teacher"
                className="px-4 py-2 bg-white/20 rounded-xl text-sm font-medium hover:bg-white/30 transition-colors"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="bg-white border-b shadow-sm sticky top-[72px] z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeCategory === cat.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {resources.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📁</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No resources yet</h2>
            <p className="text-gray-600 mb-4">Add your first shared resource for all teachers</p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700"
            >
              + Add Resource
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {resources.map(resource => (
              <div
                key={resource.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
              >
                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 flex items-center justify-between">
                  <span className="text-white text-sm font-medium flex items-center gap-1">
                    {getCategoryIcon(resource.category)}
                    {CATEGORIES.find(c => c.id === resource.category)?.label || 'Other'}
                  </span>
                  <button
                    onClick={() => handleDelete(resource.id, resource.title)}
                    className="text-white/70 hover:text-white text-sm"
                  >
                    🗑️
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 truncate">{resource.title}</h3>
                  {resource.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{resource.description}</p>
                  )}

                  {resource.file_url && (
                    <a
                      href={resource.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 mb-2"
                    >
                      <span>📎</span>
                      <span className="truncate">Download</span>
                      {resource.file_size_bytes && (
                        <span className="text-gray-400">({formatFileSize(resource.file_size_bytes)})</span>
                      )}
                    </a>
                  )}

                  <div className="text-xs text-gray-400 mt-2">
                    {new Date(resource.created_at).toLocaleDateString()}
                    {resource.uploaded_by && ` • ${resource.uploaded_by}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">📁 Add Resource</h3>
                <button
                  onClick={() => { setShowUpload(false); resetUploadForm(); }}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Title *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g., Number Bingo Game"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                <textarea
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Brief description..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">File (optional)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                />
                {selectedFile && (
                  <p className="text-xs text-gray-500 mt-1">{selectedFile.name} ({formatFileSize(selectedFile.size)})</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowUpload(false); resetUploadForm(); }}
                  className="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadTitle.trim()}
                  className={`flex-1 py-3 rounded-xl font-bold text-white ${
                    uploading || !uploadTitle.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-lg'
                  }`}
                >
                  {uploading ? 'Saving...' : '✓ Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
