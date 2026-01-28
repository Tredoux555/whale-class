// /montree/admin/import/page.tsx
// Bulk import students and work progress from weekly plan docx
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ImportResult {
  success: boolean;
  results?: {
    childrenCreated: number;
    childrenUpdated: number;
    worksAdded: number;
    children: { name: string; worksCount: number; isNew: boolean }[];
  };
  error?: string;
}

interface Classroom {
  id: string;
  name: string;
  icon: string;
}

export default function ImportPage() {
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const school = schoolData ? JSON.parse(schoolData) : null;
    const principal = principalData ? JSON.parse(principalData) : null;
    
    return {
      'x-school-id': school?.id || '',
      'x-principal-id': principal?.id || '',
      'x-classroom-id': selectedClassroom,
    };
  };

  async function loadClassrooms() {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) {
      router.push('/montree/principal/login');
      return;
    }

    try {
      const school = JSON.parse(schoolData);
      const res = await fetch('/api/montree/admin/overview', {
        headers: {
          'x-school-id': school.id,
          'x-principal-id': '',
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setClassrooms(data.classrooms || []);
        if (data.classrooms?.length > 0) {
          setSelectedClassroom(data.classrooms[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    }
    setLoading(false);
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [selectedClassroom]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  async function processFile(file: File) {
    if (!file.name.endsWith('.docx')) {
      setError('Please upload a .docx file');
      return;
    }

    if (!selectedClassroom) {
      setError('Please select a classroom first');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/montree/admin/import', {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || 'Import failed');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('Failed to import file');
    }
    
    setUploading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/montree/admin" className="text-emerald-400 hover:text-emerald-300 text-sm mb-2 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-white">📄 Import Weekly Plan</h1>
            <p className="text-emerald-300/70 mt-1">
              Upload your Chinese weekly plan to add students and their work progress
            </p>
          </div>
        </div>

        {/* Classroom Selector */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 mb-6">
          <label className="block text-white/70 text-sm mb-2">Import to Classroom</label>
          <select
            value={selectedClassroom}
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-emerald-400 outline-none"
          >
            {classrooms.map(c => (
              <option key={c.id} value={c.id} className="bg-slate-800">
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-12 mb-6 transition-all text-center
            ${isDragging 
              ? 'border-emerald-400 bg-emerald-500/10' 
              : 'border-white/20 bg-white/5 hover:border-white/40'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-400 border-t-transparent mb-4" />
              <p className="text-lg font-medium text-white">Processing document...</p>
              <p className="text-sm text-white/60">Parsing Chinese content with AI</p>
            </div>
          ) : (
            <>
              <div className="text-6xl mb-4">📋</div>
              <p className="text-xl font-medium text-white mb-2">
                Drop your weekly plan here
              </p>
              <p className="text-white/60 mb-6">
                .docx files with Chinese weekly assignments
              </p>
              <label className="inline-block px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl cursor-pointer hover:shadow-lg hover:shadow-emerald-500/30 transition-all font-medium text-lg">
                Choose File
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <p className="text-red-300 font-medium">❌ {error}</p>
          </div>
        )}

        {/* Success Result */}
        {result?.success && result.results && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold text-emerald-300 mb-4">
              ✅ Import Complete!
            </h3>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{result.results.childrenCreated}</p>
                <p className="text-emerald-300/70 text-sm">New Students</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{result.results.childrenUpdated}</p>
                <p className="text-emerald-300/70 text-sm">Existing Students</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{result.results.worksAdded}</p>
                <p className="text-emerald-300/70 text-sm">Works Added</p>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {result.results.children.map((child, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs ${child.isNew ? 'bg-emerald-500/30 text-emerald-300' : 'bg-white/10 text-white/70'}`}>
                      {child.isNew ? 'NEW' : 'EXISTS'}
                    </span>
                    <span className="text-white font-medium">{child.name}</span>
                  </div>
                  <span className="text-emerald-300/70 text-sm">{child.worksCount} works</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Link
                href="/montree/admin/students"
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-center font-medium hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
              >
                View Students →
              </Link>
              <button
                onClick={() => setResult(null)}
                className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all"
              >
                Import Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
