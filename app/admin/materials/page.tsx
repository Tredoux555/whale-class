"use client";

import { useState, useEffect } from "react";
import { Plus, Upload, Download, Trash2, Edit, Folder, FileText, Music, Image, Video } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface MaterialFile {
  id: string;
  name: string;
  url: string;
  path: string;
  size: number;
  type: string;
  categoryId: string;
  uploadedAt: string;
}

interface Material {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  files: MaterialFile[];
  createdAt: string;
  updatedAt: string;
}

export default function MaterialsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'materials' | 'categories'>('materials');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string>('');

  // Form states
  const [newCategory, setNewCategory] = useState({ name: '', description: '', color: '#6b7280' });
  const [newMaterial, setNewMaterial] = useState({ title: '', description: '', categoryId: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials');
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) return;

    const category: Category = {
      id: crypto.randomUUID(),
      name: newCategory.name.trim(),
      description: newCategory.description.trim(),
      color: newCategory.color,
    };

    const updatedCategories = [...categories, category];
    await updateCategories(updatedCategories);
    setNewCategory({ name: '', description: '', color: '#6b7280' });
    setShowAddCategory(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;

    const updatedCategories = categories.map(cat =>
      cat.id === editingCategory.id ? editingCategory : cat
    );
    await updateCategories(updatedCategories);
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? All materials in this category will be moved to General.')) return;

    // Move materials to general category
    const updatedMaterials = materials.map(material =>
      material.categoryId === categoryId
        ? { ...material, categoryId: 'general' }
        : material
    );

    // Update materials
    for (const material of updatedMaterials) {
      if (material.categoryId === 'general') {
        await fetch('/api/materials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: material.id, material }),
        });
      }
    }

    // Remove category
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    await updateCategories(updatedCategories);
    fetchMaterials();
  };

  const updateCategories = async (newCategories: Category[]) => {
    try {
      const response = await fetch('/api/materials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: newCategories }),
      });

      if (response.ok) {
        setCategories(newCategories);
      }
    } catch (error) {
      console.error('Failed to update categories:', error);
    }
  };

  const handleCreateMaterial = async () => {
    if (!newMaterial.title.trim() || !newMaterial.categoryId) return;

    const material: Material = {
      id: crypto.randomUUID(),
      title: newMaterial.title.trim(),
      description: newMaterial.description.trim(),
      categoryId: newMaterial.categoryId,
      files: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(material),
      });

      if (response.ok) {
        fetchMaterials();
        setNewMaterial({ title: '', description: '', categoryId: '' });
        setShowAddMaterial(false);
      }
    } catch (error) {
      console.error('Failed to create material:', error);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Are you sure you want to delete this material and all its files?')) return;

    try {
      const response = await fetch(`/api/materials?id=${materialId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMaterials();
      }
    } catch (error) {
      console.error('Failed to delete material:', error);
    }
  };

  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;

    if (!file || !selectedMaterial) return;

    setUploadingFile(true);
    setUploadError('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('categoryId', selectedMaterial.categoryId);

      const response = await fetch('/api/materials/files/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const result = await response.json();
        const updatedMaterial = {
          ...selectedMaterial,
          files: [...selectedMaterial.files, result.file],
          updatedAt: new Date().toISOString(),
        };

        await fetch('/api/materials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedMaterial.id, material: updatedMaterial }),
        });

        fetchMaterials();
        setShowUploadModal(false);
        setSelectedMaterial(null);
      } else {
        const error = await response.json();
        setUploadError(error.error || 'Upload failed');
      }
    } catch (error) {
      setUploadError('Upload failed');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileDelete = async (materialId: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/materials/files/delete?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const material = materials.find(m => m.id === materialId);
        if (material) {
          const updatedMaterial = {
            ...material,
            files: material.files.filter(f => f.path !== filePath),
            updatedAt: new Date().toISOString(),
          };

          await fetch('/api/materials', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: materialId, material: updatedMaterial }),
          });

          fetchMaterials();
        }
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (type.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryById = (id: string) => categories.find(cat => cat.id === id);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading materials...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Materials</h1>
        <p className="text-gray-600">Manage your class materials, worksheets, and resources</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'materials'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Materials
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'categories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Categories
            </button>
          </nav>
        </div>
      </div>

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Materials</h2>
            <button
              onClick={() => setShowAddMaterial(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Material
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {materials.map((material) => {
              const category = getCategoryById(material.categoryId);
              return (
                <div key={material.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{material.title}</h3>
                      {category && (
                        <span
                          className="inline-block px-2 py-1 text-xs font-medium rounded-full mt-1"
                          style={{ backgroundColor: category.color + '20', color: category.color }}
                        >
                          {category.name}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteMaterial(material.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {material.description && (
                    <p className="text-gray-600 text-sm mb-4">{material.description}</p>
                  )}

                  <div className="space-y-2 mb-4">
                    {material.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getFileIcon(file.type)}
                          <span className="text-sm font-medium truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleFileDelete(material.id, file.path)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMaterial(material);
                      setShowUploadModal(true);
                    }}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                </div>
              );
            })}
          </div>

          {materials.length === 0 && (
            <div className="text-center py-12">
              <Folder className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No materials</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first material.</p>
            </div>
          )}
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Categories</h2>
            <button
              onClick={() => setShowAddCategory(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div key={category.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {category.id !== 'general' && (
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 text-sm">{category.description}</p>
                <div className="mt-4 text-xs text-gray-500">
                  {materials.filter(m => m.categoryId === category.id).length} materials
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Category</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Category description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={newCategory.color}
                  onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddCategory(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Category</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingCategory.name}
                  onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editingCategory.description}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={editingCategory.color}
                  onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                  className="w-full h-10 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateCategory}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showAddMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Material</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newMaterial.title}
                  onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Material title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Material description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={newMaterial.categoryId}
                  onChange={(e) => setNewMaterial({ ...newMaterial, categoryId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddMaterial(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMaterial}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Upload File to {selectedMaterial.title}</h3>
            <form onSubmit={handleFileUpload}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                  <input
                    type="file"
                    name="file"
                    accept=".pdf,.doc,.docx,.txt,.mp3,.wav,.mp4,.mov,.jpg,.jpeg,.png,.gif"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported: PDF, Word, Text, Audio (MP3, WAV), Video (MP4, MOV), Images
                  </p>
                </div>
                {uploadError && (
                  <div className="text-red-600 text-sm">{uploadError}</div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedMaterial(null);
                    setUploadError('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  disabled={uploadingFile}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {uploadingFile ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
