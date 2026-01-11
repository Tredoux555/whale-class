'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

type FilterType = 'all' | 'video' | 'image' | 'document';

const FILE_ICONS: Record<string, string> = {
  'video': '🎬',
  'image': '🖼️',
  'document': '📄',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getFileCategory(fileType: string): 'video' | 'image' | 'document' {
  if (fileType.startsWith('video/')) return 'video';
  if (fileType.startsWith('image/')) return 'image';
  return 'document';
}

export default function MediaLibraryPage() {
  const [documents, setDocuments] = useState<LessonDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [editingDoc, setEditingDoc] = useState<LessonDocument | null>(null);
  const [editWeek, setEditWeek] = useState<number>(1);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [filter]);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('type', filter);
      if (search) params.set('search', search);
      
      const res = await fetch(`/api/admin/media-library?${params}`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
      }
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    }
    setLoading(false);
  }

  async function deleteDocument(id: string, filename: string) {
    if (!confirm(`Delete "${filename}"? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/admin/media-library?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => prev.filter(d => d.id !== id));
      } else {
        alert('Failed to delete: ' + data.error);
      }
    } catch (err) {
      alert('Failed to delete document');
    }
  }

  async function updateDocument() {
    if (!editingDoc) return;
    
    try {
      const res = await fetch('/api/admin/media-library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingDoc.id,
          week_number: editWeek,
          original_filename: editName
        })
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(prev => prev.map(d => 
          d.id === editingDoc.id ? { ...d, week_number: editWeek, original_filename: editName } : d
        ));
        setEditingDoc(null);
      } else {
        alert('Failed to update: ' + data.error);
      }
    } catch (err) {
      alert('Failed to update document');
    }
  }

  function startEdit(doc: LessonDocument) {
    setEditingDoc(doc);
    setEditWeek(doc.week_number);
    setEditName(doc.original_filename);
  }

  // Check for problematic files
  const problemFiles = documents.filter(d => 
    d.original_filename.toLowerCase().includes('recovered') ||
    d.original_filename.toLowerCase().includes('untitled') ||
    !d.week_number ||
    d.week_number < 1 ||
    d.week_number > 36
  );

  const videoCount = documents.filter(d => d.file_type.startsWith('video/')).length;
  const imageCount = documents.filter(d => d.file_type.startsWith('image/')).length;
  const docCount = documents.filter(d => !d.file_type.startsWith('video/') && !d.file_type.startsWith('image/')).length;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">📁 Media Library</h1>
            <p className="text-gray-400 mt-1">Manage all uploaded files across all weeks</p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Problem Files Alert */}
        {problemFiles.length > 0 && (
          <div className="bg-yellow-900/50 border border-yellow-600 rounded-xl p-4 mb-6">
            <h3 className="font-bold text-yellow-400 mb-2">⚠️ {problemFiles.length} files need attention</h3>
            <p className="text-yellow-200 text-sm mb-3">
              These files have "recovered" in the name or invalid week numbers. Click to edit them.
            </p>
            <div className="flex flex-wrap gap-2">
              {problemFiles.slice(0, 10).map(doc => (
                <button
                  key={doc.id}
                  onClick={() => startEdit(doc)}
                  className="px-3 py-1 bg-yellow-800 hover:bg-yellow-700 rounded-lg text-sm"
                >
                  {doc.original_filename.slice(0, 30)}...
                </button>
              ))}
              {problemFiles.length > 10 && (
                <span className="px-3 py-1 text-yellow-400 text-sm">
                  +{problemFiles.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{documents.length}</div>
            <div className="text-gray-400 text-sm">Total Files</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{videoCount}</div>
            <div className="text-gray-400 text-sm">🎬 Videos</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{imageCount}</div>
            <div className="text-gray-400 text-sm">🖼️ Images</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">{docCount}</div>
            <div className="text-gray-400 text-sm">📄 Documents</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'video', 'image', 'document'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === f
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? '📁 All' : 
                 f === 'video' ? '🎬 Videos' :
                 f === 'image' ? '🖼️ Images' : '📄 Docs'}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchDocuments()}
              placeholder="Search by filename..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            onClick={fetchDocuments}
            className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500"
          >
            🔍 Search
          </button>
        </div>

        {/* Edit Modal */}
        {editingDoc && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">✏️ Edit File</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Filename</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Week Number (1-36)</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={editWeek}
                    onChange={(e) => setEditWeek(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  />
                </div>

                {/* Preview */}
                {editingDoc.file_type.startsWith('video/') && (
                  <video 
                    src={editingDoc.public_url} 
                    controls 
                    className="w-full rounded-lg max-h-48"
                  />
                )}
                {editingDoc.file_type.startsWith('image/') && (
                  <img 
                    src={editingDoc.public_url} 
                    alt={editingDoc.original_filename}
                    className="w-full rounded-lg max-h-48 object-contain bg-gray-700"
                  />
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingDoc(null)}
                  className="flex-1 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={updateDocument}
                  className="flex-1 px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Files List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-gray-600 border-t-cyan-500 rounded-full mb-4"></div>
            <p>Loading files...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-4">📭</p>
            <p>No files found</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Preview</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Filename</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Week</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Size</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Uploaded</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {documents.map(doc => {
                  const category = getFileCategory(doc.file_type);
                  const isProblem = doc.original_filename.toLowerCase().includes('recovered') ||
                                   !doc.week_number || doc.week_number < 1 || doc.week_number > 36;
                  
                  return (
                    <tr key={doc.id} className={`hover:bg-gray-750 ${isProblem ? 'bg-yellow-900/20' : ''}`}>
                      {/* Preview */}
                      <td className="px-4 py-3">
                        <div className="w-16 h-12 bg-gray-700 rounded overflow-hidden flex items-center justify-center">
                          {category === 'video' && (
                            <video src={doc.public_url} className="w-full h-full object-cover" />
                          )}
                          {category === 'image' && (
                            <img src={doc.public_url} alt="" className="w-full h-full object-cover" />
                          )}
                          {category === 'document' && (
                            <span className="text-2xl">📄</span>
                          )}
                        </div>
                      </td>
                      
                      {/* Filename */}
                      <td className="px-4 py-3">
                        <a 
                          href={doc.public_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {doc.original_filename}
                        </a>
                        {isProblem && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-600 text-yellow-100 text-xs rounded">
                            needs fix
                          </span>
                        )}
                      </td>
                      
                      {/* Week */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          doc.week_number >= 1 && doc.week_number <= 36
                            ? 'bg-gray-700'
                            : 'bg-red-900 text-red-200'
                        }`}>
                          Week {doc.week_number || '?'}
                        </span>
                      </td>
                      
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="text-gray-400">
                          {FILE_ICONS[category]} {category}
                        </span>
                      </td>
                      
                      {/* Size */}
                      <td className="px-4 py-3 text-gray-400">
                        {formatFileSize(doc.file_size)}
                      </td>
                      
                      {/* Date */}
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {formatDate(doc.created_at)}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(doc)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteDocument(doc.id, doc.original_filename)}
                            className="px-3 py-1 bg-red-900 hover:bg-red-800 rounded text-sm"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
