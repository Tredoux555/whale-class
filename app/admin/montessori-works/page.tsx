'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Upload, X, Video, ExternalLink } from 'lucide-react';
import { MontessoriWork, CURRICULUM_AREAS, WORK_STATUSES } from '@/types/montessori-works';

export default function MontessoriWorksPage() {
  const [works, setWorks] = useState<MontessoriWork[]>([]);
  const [filteredWorks, setFilteredWorks] = useState<MontessoriWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingWork, setEditingWork] = useState<MontessoriWork | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    curriculum_area: 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'culture';
    status: 'completed' | 'in_progress';
    video_url: string;
  }>({
    name: '',
    curriculum_area: 'practical_life',
    status: 'in_progress',
    video_url: ''
  });

  useEffect(() => {
    fetchWorks();
  }, []);

  useEffect(() => {
    filterWorks();
  }, [works, searchTerm, areaFilter, statusFilter]);

  const fetchWorks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/whale/montessori-works');
      const result = await response.json();
      if (result.success) {
        setWorks(result.data || []);
      } else {
        console.error('Error fetching works:', result.error, result.details);
        // Still set empty array so UI doesn't break
        setWorks([]);
      }
    } catch (error) {
      console.error('Error fetching works:', error);
      setWorks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterWorks = () => {
    let filtered = [...works];

    if (searchTerm) {
      filtered = filtered.filter(work =>
        work.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (areaFilter) {
      filtered = filtered.filter(work => work.curriculum_area === areaFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(work => work.status === statusFilter);
    }

    setFilteredWorks(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingWork
        ? `/api/whale/montessori-works/${editingWork.id}`
        : '/api/whale/montessori-works';
      
      const method = editingWork ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        await fetchWorks();
        resetForm();
        setShowForm(false);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving work:', error);
      alert('Error saving work');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this work?')) return;

    try {
      const response = await fetch(`/api/whale/montessori-works/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        await fetchWorks();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting work:', error);
      alert('Error deleting work');
    }
  };

  const handleEdit = (work: MontessoriWork) => {
    setEditingWork(work);
    setFormData({
      name: work.name,
      curriculum_area: work.curriculum_area,
      status: work.status,
      video_url: work.video_url || ''
    });
    setShowForm(true);
  };

  const handleVideoUpload = async (workId: string, file: File) => {
    try {
      setUploadingVideo(workId);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('workId', workId);

      const response = await fetch('/api/whale/montessori-works/upload-video', {
        method: 'POST',
        body: formData
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      let result;
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        // If not JSON, get text response
        const text = await response.text();
        console.error('Non-JSON response:', text);
        alert(`Error uploading video: Server returned ${response.status} ${response.statusText}`);
        return;
      }

      if (!response.ok) {
        // Handle HTTP errors
        const errorMsg = result.error || result.details || `Upload failed with status ${response.status}`;
        console.error('Upload error:', result);
        alert(`Error uploading video: ${errorMsg}`);
        return;
      }

      if (result.success) {
        await fetchWorks();
      } else {
        const errorMsg = result.error || result.details || 'Unknown error';
        console.error('Upload error:', result);
        alert('Error uploading video: ' + errorMsg);
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Error uploading video');
    } finally {
      setUploadingVideo(null);
    }
  };

  const toggleStatus = async (work: MontessoriWork) => {
    try {
      const newStatus = work.status === 'completed' ? 'in_progress' : 'completed';
      
      const response = await fetch(`/api/whale/montessori-works/${work.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        await fetchWorks();
      }
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      curriculum_area: 'practical_life' as 'practical_life' | 'sensorial' | 'mathematics' | 'language' | 'culture',
      status: 'in_progress' as 'completed' | 'in_progress',
      video_url: ''
    });
    setEditingWork(null);
  };

  const getYouTubeSearchUrl = (workName: string) => {
    const searchPhrase = `Montessori ${workName} AMI demonstration`;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchPhrase)}`;
  };

  const groupedWorks = filteredWorks.reduce((acc, work) => {
    if (!acc[work.curriculum_area]) {
      acc[work.curriculum_area] = [];
    }
    acc[work.curriculum_area].push(work);
    return acc;
  }, {} as Record<string, MontessoriWork[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex items-center justify-center">
        <div className="text-2xl text-blue-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-900 mb-2">Montessori Works Curriculum</h1>
          <p className="text-blue-700">Complete curriculum roadmap with all 74 works - Videos managed via Video Management page</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search works..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Area Filter */}
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Areas</option>
              {CURRICULUM_AREAS.map(area => (
                <option key={area.value} value={area.value}>{area.label}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              {WORK_STATUSES.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>

            {/* Info Button - Curriculum is read-only from roadmap */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center justify-center">
              <p className="text-sm text-blue-800">
                📚 Showing all 74 curriculum works from roadmap
              </p>
            </div>
          </div>
        </div>

        {/* Form Modal - Disabled since works come from curriculum roadmap */}
        {false && showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-blue-900">
                    {editingWork ? 'Edit Work' : 'Add New Work'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Work Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Work Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Pouring Water"
                    />
                  </div>

                  {/* Curriculum Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Curriculum Area *
                    </label>
                    <select
                      required
                      value={formData.curriculum_area}
                      onChange={(e) => setFormData({ ...formData, curriculum_area: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {CURRICULUM_AREAS.map(area => (
                        <option key={area.value} value={area.value}>{area.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {WORK_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Video URL (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video URL (optional)
                    </label>
                    <input
                      type="url"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                      {editingWork ? 'Update Work' : 'Create Work'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Works List Grouped by Area */}
        <div className="space-y-8">
          {Object.keys(groupedWorks).length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <p className="text-gray-500 text-lg">No works found. Add your first work to get started!</p>
            </div>
          ) : (
            CURRICULUM_AREAS.map(area => {
              const areaWorks = groupedWorks[area.value];
              if (!areaWorks || areaWorks.length === 0) return null;

              return (
                <div key={area.value} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">{area.label}</h2>
                    <p className="text-blue-100">{areaWorks.length} work{areaWorks.length !== 1 ? 's' : ''}</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Work Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Video
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            YouTube Search
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {areaWorks.map(work => (
                          <tr key={work.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-500">
                                #{(work as any).sequence_order || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{work.name}</div>
                              {(work as any).description && (
                                <div className="text-xs text-gray-500 mt-1 max-w-md">
                                  {(work as any).description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleStatus(work)}
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  work.status === 'completed'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                }`}
                              >
                                {work.status === 'completed' ? 'Completed' : 'In Progress'}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {work.video_url ? (
                                  <a
                                    href={work.video_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <Video className="w-4 h-4" />
                                    <span className="text-xs">View</span>
                                  </a>
                                ) : (
                                  <span className="text-gray-400 text-xs">No video</span>
                                )}
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleVideoUpload(work.id, file);
                                    }}
                                    disabled={uploadingVideo === work.id}
                                  />
                                  <Upload className={`w-4 h-4 ${
                                    uploadingVideo === work.id
                                      ? 'text-gray-400'
                                      : 'text-blue-600 hover:text-blue-800'
                                  }`} />
                                </label>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <a
                                href={getYouTubeSearchUrl(work.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <ExternalLink className="w-4 h-4" />
                                <span className="text-xs">Search YouTube</span>
                              </a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <span className="text-xs text-gray-500">
                                  #{work.sequence_order || 'N/A'}
                                </span>
                                {/* Edit/Delete disabled - works come from curriculum roadmap */}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

