'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Emoji options for classrooms
const EMOJI_OPTIONS = ['🐋', '🐼', '🦁', '🐘', '🦋', '🌟', '🌈', '🌻', '🍎', '🎨', '📚', '🎵'];
const COLOR_OPTIONS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type Classroom = {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacherName: string;
  teacherEmail: string;
};

type CreatedTeacher = {
  id: string;
  name: string;
  login_code: string;
};

type CreatedClassroom = {
  id: string;
  name: string;
  icon: string;
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Step 1: School
  const [schoolName, setSchoolName] = useState('');
  
  // Step 2 & 3: Classrooms with teachers
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Success state
  const [createdTeachers, setCreatedTeachers] = useState<CreatedTeacher[]>([]);
  const [createdClassrooms, setCreatedClassrooms] = useState<CreatedClassroom[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Generate slug from school name
  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  // Add new classroom
  const addClassroom = () => {
    const newClassroom: Classroom = {
      id: crypto.randomUUID(),
      name: '',
      icon: EMOJI_OPTIONS[classrooms.length % EMOJI_OPTIONS.length],
      color: COLOR_OPTIONS[classrooms.length % COLOR_OPTIONS.length],
      teacherName: '',
      teacherEmail: '',
    };
    setClassrooms([...classrooms, newClassroom]);
    setEditingClassroom(newClassroom);
  };

  // Update classroom
  const updateClassroom = (id: string, updates: Partial<Classroom>) => {
    setClassrooms(classrooms.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
    if (editingClassroom?.id === id) {
      setEditingClassroom({ ...editingClassroom, ...updates });
    }
  };

  // Remove classroom
  const removeClassroom = (id: string) => {
    setClassrooms(classrooms.filter(c => c.id !== id));
    if (editingClassroom?.id === id) {
      setEditingClassroom(null);
    }
  };

  // Copy code to clipboard
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Submit everything
  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school: {
            name: schoolName,
            slug: generateSlug(schoolName),
          },
          classrooms: classrooms.map(c => ({
            name: c.name,
            icon: c.icon,
            color: c.color,
            teacher: {
              name: c.teacherName,
              email: c.teacherEmail,
            },
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create school');
      }

      const data = await res.json();
      
      // Store created data and show success
      setCreatedTeachers(data.teachers || []);
      setCreatedClassrooms(data.classrooms || []);
      setStep(4); // Success step

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Montree Setup</h1>
              <p className="text-sm text-gray-500">
                {step === 4 ? 'Complete!' : `Step ${step} of 3`}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 flex gap-2">
            {[1, 2, 3].map(s => (
              <div 
                key={s}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  s <= step || step === 4 ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step 1: School Name */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 block">🏫</span>
              <h2 className="text-2xl font-bold text-gray-800">What's your school called?</h2>
              <p className="text-gray-500 mt-2">This will appear on reports and dashboards</p>
            </div>

            <input
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Sunshine Montessori"
              className="w-full text-xl p-4 border-2 border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
              autoFocus
            />

            {schoolName && (
              <p className="mt-2 text-sm text-gray-400">
                URL: montree.app/{generateSlug(schoolName)}
              </p>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!schoolName.trim()}
              className="mt-8 w-full py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Add Classrooms */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Add your classrooms</h2>
              <p className="text-gray-500 mt-2">Click + to add a classroom</p>
            </div>

            {/* Classroom Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {classrooms.map(classroom => (
                <div
                  key={classroom.id}
                  onClick={() => setEditingClassroom(classroom)}
                  className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    editingClassroom?.id === classroom.id 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ borderLeftColor: classroom.color, borderLeftWidth: '4px' }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); removeClassroom(classroom.id); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center text-sm"
                  >
                    ×
                  </button>
                  <span className="text-3xl">{classroom.icon}</span>
                  <p className="font-medium text-gray-800 mt-2">
                    {classroom.name || 'Untitled'}
                  </p>
                  {classroom.teacherName && (
                    <p className="text-sm text-gray-500">{classroom.teacherName}</p>
                  )}
                </div>
              ))}

              {/* Add Button */}
              <button
                onClick={addClassroom}
                className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 transition-all flex flex-col items-center justify-center min-h-[120px]"
              >
                <span className="text-3xl text-gray-400">+</span>
                <span className="text-sm text-gray-500 mt-1">Add Classroom</span>
              </button>
            </div>

            {/* Edit Panel */}
            {editingClassroom && (
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-gray-700 mb-4">Edit Classroom</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Emoji */}
                  <div className="relative">
                    <label className="block text-sm text-gray-500 mb-1">Icon</label>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-full p-3 border rounded-lg text-left text-2xl"
                    >
                      {editingClassroom.icon}
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute top-full left-0 mt-1 p-2 bg-white border rounded-lg shadow-lg grid grid-cols-6 gap-1 z-10">
                        {EMOJI_OPTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => {
                              updateClassroom(editingClassroom.id, { icon: emoji });
                              setShowEmojiPicker(false);
                            }}
                            className="text-2xl p-2 hover:bg-gray-100 rounded"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={editingClassroom.name}
                      onChange={(e) => updateClassroom(editingClassroom.id, { name: e.target.value })}
                      placeholder="e.g. Whale Class"
                      className="w-full p-3 border rounded-lg"
                    />
                  </div>

                  {/* Color */}
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-500 mb-1">Color</label>
                    <div className="flex gap-2">
                      {COLOR_OPTIONS.map(color => (
                        <button
                          key={color}
                          onClick={() => updateClassroom(editingClassroom.id, { color })}
                          className={`w-8 h-8 rounded-full ${
                            editingClassroom.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={classrooms.length === 0}
                className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Add Teachers */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Assign teachers</h2>
              <p className="text-gray-500 mt-2">One teacher per classroom</p>
            </div>

            <div className="space-y-4">
              {classrooms.map(classroom => (
                <div 
                  key={classroom.id}
                  className="p-4 border rounded-xl"
                  style={{ borderLeftColor: classroom.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{classroom.icon}</span>
                    <span className="font-semibold text-gray-800">{classroom.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={classroom.teacherName}
                      onChange={(e) => updateClassroom(classroom.id, { teacherName: e.target.value })}
                      placeholder="Teacher name"
                      className="p-3 border rounded-lg"
                    />
                    <input
                      type="email"
                      value={classroom.teacherEmail}
                      onChange={(e) => updateClassroom(classroom.id, { teacherEmail: e.target.value })}
                      placeholder="Email (optional)"
                      className="p-3 border rounded-lg"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || classrooms.some(c => !c.name)}
                className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Finish Setup ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success - Show Login Codes */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="text-center mb-8">
              <span className="text-6xl mb-4 block">🎉</span>
              <h2 className="text-2xl font-bold text-gray-800">{schoolName} is ready!</h2>
              <p className="text-gray-500 mt-2">Share these codes with your teachers</p>
            </div>

            {/* Login Codes */}
            <div className="space-y-4 mb-8">
              {createdTeachers.map((teacher, index) => {
                const classroom = createdClassrooms[index];
                return (
                  <div 
                    key={teacher.id}
                    className="p-4 bg-gray-50 rounded-xl border"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{classroom?.icon || '📚'}</span>
                        <div>
                          <p className="font-semibold text-gray-800">{teacher.name}</p>
                          <p className="text-sm text-gray-500">{classroom?.name || 'Classroom'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-2 bg-white border rounded-lg font-mono text-lg">
                          {teacher.login_code}
                        </code>
                        <button
                          onClick={() => copyCode(teacher.login_code)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            copiedCode === teacher.login_code
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                          }`}
                        >
                          {copiedCode === teacher.login_code ? '✓' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <p className="text-amber-800 text-sm">
                <strong>Important:</strong> Teachers use these codes at <strong>/montree/login</strong> to set up their account. The code can only be used once.
              </p>
            </div>

            <button
              onClick={() => router.push('/montree/admin')}
              className="w-full py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
            >
              Go to Admin Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
