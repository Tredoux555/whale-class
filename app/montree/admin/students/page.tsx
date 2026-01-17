// /montree/admin/students/page.tsx
// Smart Student Import - The $1000/month wow factor
'use client';

import { useState, useCallback } from 'react';

interface ParsedStudent {
  name: string;
  dateOfBirth?: string;
  notes?: string;
  selected: boolean;
}

export default function StudentsPage() {
  const [inputMethod, setInputMethod] = useState<'paste' | 'upload' | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingStudents, setExistingStudents] = useState<any[]>([]);

  // Fetch existing students on load
  useState(() => {
    fetch('/api/montree/students')
      .then(r => r.json())
      .then(data => setExistingStudents(data.students || []))
      .catch(() => {});
  });

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setInputMethod('upload');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setInputMethod('upload');
    }
  };

  // Process with Claude API
  const processWithAI = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      let content = rawInput;
      
      // If file uploaded, read it
      if (file) {
        if (file.type.includes('text') || file.name.endsWith('.csv')) {
          content = await file.text();
        } else {
          // For images/PDFs, convert to base64
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          content = `[FILE: ${file.name}]\n${base64}`;
        }
      }

      const response = await fetch('/api/montree/students/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, fileName: file?.name }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setParsedStudents(data.students.map((s: any) => ({ ...s, selected: true })));
    } catch (err: any) {
      setError(err.message || 'Failed to process');
    } finally {
      setIsProcessing(false);
    }
  };

  // Save students to database
  const saveStudents = async () => {
    const selected = parsedStudents.filter(s => s.selected);
    if (selected.length === 0) {
      setError('No students selected');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/montree/students/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: selected }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setSuccess(`Successfully imported ${data.count} students!`);
      setParsedStudents([]);
      setRawInput('');
      setFile(null);
      setInputMethod(null);
      
      // Refresh existing students
      const refreshed = await fetch('/api/montree/students').then(r => r.json());
      setExistingStudents(refreshed.students || []);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStudent = (index: number) => {
    setParsedStudents(prev => prev.map((s, i) => 
      i === index ? { ...s, selected: !s.selected } : s
    ));
  };

  const updateStudentName = (index: number, name: string) => {
    setParsedStudents(prev => prev.map((s, i) => 
      i === index ? { ...s, name } : s
    ));
  };


  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Students</h1>
        <div className="text-sm text-gray-400">
          {existingStudents.length} students enrolled
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 p-4 bg-emerald-900/30 border border-emerald-500 rounded-xl text-emerald-400">
          ✅ {success}
        </div>
      )}

      {/* Existing Students */}
      {existingStudents.length > 0 && !parsedStudents.length && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Current Students</h2>
          <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800">
            {existingStudents.map((student, i) => (
              <div key={student.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm w-6">{i + 1}</span>
                  <span className="text-white">{student.name}</span>
                </div>
                <span className="text-gray-500 text-sm">{student.progress?.percentage || 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Section */}
      {!parsedStudents.length && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-lg font-bold text-white mb-2">✨ Smart Import</h2>
          <p className="text-gray-400 text-sm mb-6">
            Drop any document with student names — we'll figure it out.
            Excel, PDF, image of a list, or just paste names.
          </p>

          {/* Drop Zone */}
          <div
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.txt"
            />
            {file ? (
              <div>
                <div className="text-4xl mb-2">📄</div>
                <div className="text-white font-medium">{file.name}</div>
                <div className="text-gray-400 text-sm mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">📁</div>
                <div className="text-white font-medium">Drop your file here</div>
                <div className="text-gray-400 text-sm mt-1">
                  Excel, CSV, PDF, or image
                </div>
              </div>
            )}
          </div>

          {/* Or paste */}
          <div className="my-4 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-800"></div>
            <span className="text-gray-500 text-sm">or paste names</span>
            <div className="flex-1 h-px bg-gray-800"></div>
          </div>

          <textarea
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              setInputMethod('paste');
            }}
            placeholder="Rachel&#10;Yueze&#10;Lucky&#10;Austin&#10;..."
            className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500"
          />

          {/* Process Button */}
          {(file || rawInput) && (
            <button
              onClick={processWithAI}
              disabled={isProcessing}
              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin">⚡</span>
                  Processing with AI...
                </>
              ) : (
                <>
                  ⚡ Extract Student Names
                </>
              )}
            </button>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}


      {/* Preview & Edit Section */}
      {parsedStudents.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              ✅ Found {parsedStudents.length} Students
            </h2>
            <button
              onClick={() => {
                setParsedStudents([]);
                setFile(null);
                setRawInput('');
              }}
              className="text-gray-400 hover:text-white text-sm"
            >
              Start Over
            </button>
          </div>
          
          <p className="text-gray-400 text-sm mb-4">
            Review and edit names below. Uncheck any you don't want to import.
          </p>

          <div className="space-y-2 mb-6">
            {parsedStudents.map((student, index) => (
              <div 
                key={index}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  student.selected ? 'bg-gray-800' : 'bg-gray-800/50 opacity-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={student.selected}
                  onChange={() => toggleStudent(index)}
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-gray-500 text-sm w-6">{index + 1}</span>
                <input
                  type="text"
                  value={student.name}
                  onChange={(e) => updateStudentName(index, e.target.value)}
                  className="flex-1 bg-transparent text-white focus:outline-none focus:bg-gray-700 px-2 py-1 rounded"
                />
                {student.notes && (
                  <span className="text-gray-500 text-xs">{student.notes}</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveStudents}
              disabled={isSaving || !parsedStudents.some(s => s.selected)}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors"
            >
              {isSaving ? 'Importing...' : `Import ${parsedStudents.filter(s => s.selected).length} Students`}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
