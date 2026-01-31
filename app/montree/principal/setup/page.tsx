// /montree/principal/setup/page.tsx
// Session 105: Principal Setup - Add classrooms & teachers (beautiful green theme)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const EMOJI_OPTIONS = ['🌳', '🐼', '🦁', '🐘', '🦋', '🌟', '🌈', '🌻', '🍎', '🎨', '📚', '🎵'];
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type Teacher = { id: string; name: string; email: string };
type Classroom = { id: string; name: string; icon: string; color: string; teachers: Teacher[] };
type CreatedTeacher = { id: string; name: string; login_code: string; classroom_name: string; classroom_icon: string };

export default function PrincipalSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: classrooms, 2: teachers, 3: success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [school, setSchool] = useState<any>(null);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [createdTeachers, setCreatedTeachers] = useState<CreatedTeacher[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('montree_school');
    if (stored) {
      setSchool(JSON.parse(stored));
    } else {
      router.push('/montree/principal/login');
    }
  }, [router]);

  const addClassroom = () => {
    const usedEmojis = classrooms.map(c => c.icon);
    const availableEmoji = EMOJI_OPTIONS.find(e => !usedEmojis.includes(e)) || '📚';
    const usedColors = classrooms.map(c => c.color);
    const availableColor = COLOR_OPTIONS.find(c => !usedColors.includes(c)) || '#10b981';
    
    setClassrooms([...classrooms, {
      id: crypto.randomUUID(),
      name: '',
      icon: availableEmoji,
      color: availableColor,
      teachers: [{ id: crypto.randomUUID(), name: '', email: '' }],
    }]);
  };

  const updateClassroom = (id: string, updates: Partial<Classroom>) => {
    setClassrooms(classrooms.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeClassroom = (id: string) => {
    setClassrooms(classrooms.filter(c => c.id !== id));
  };

  const addTeacher = (classroomId: string) => {
    setClassrooms(classrooms.map(c => {
      if (c.id === classroomId) {
        return { ...c, teachers: [...c.teachers, { id: crypto.randomUUID(), name: '', email: '' }] };
      }
      return c;
    }));
  };

  const updateTeacher = (classroomId: string, teacherId: string, updates: Partial<Teacher>) => {
    setClassrooms(classrooms.map(c => {
      if (c.id === classroomId) {
        return {
          ...c,
          teachers: c.teachers.map(t => t.id === teacherId ? { ...t, ...updates } : t),
        };
      }
      return c;
    }));
  };

  const removeTeacher = (classroomId: string, teacherId: string) => {
    setClassrooms(classrooms.map(c => {
      if (c.id === classroomId && c.teachers.length > 1) {
        return { ...c, teachers: c.teachers.filter(t => t.id !== teacherId) };
      }
      return c;
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/principal/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, classrooms }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');

      setCreatedTeachers(data.teachers);
      setStep(3);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shareCode = (teacher: CreatedTeacher) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://teacherpotato.xyz';
    const shareUrl = `${baseUrl}/montree/join?code=${teacher.login_code}`;
    const message = `🌳 Welcome to Montree!\n\nHi ${teacher.name}, here's your teacher login code for ${teacher.classroom_name}:\n\nCode: ${teacher.login_code}\n\nLogin here: ${shareUrl}`;

    navigator.clipboard.writeText(message);
    setCopiedCode(`share-${teacher.login_code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCodes = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://teacherpotato.xyz';

    let content = `🌳 MONTREE TEACHER CODES - ${school?.name || 'School'}\n\n`;
    createdTeachers.forEach(teacher => {
      content += `${teacher.classroom_icon} ${teacher.classroom_name}: ${teacher.name}\n`;
      content += `   Code: ${teacher.login_code}\n`;
      content += `   Login: ${baseUrl}/montree/join?code=${teacher.login_code}\n\n`;
    });

    navigator.clipboard.writeText(content);
    setCopiedCode('all');
    setTimeout(() => setCopiedCode(null), 3000);
  };

  if (!school) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-3xl">{step === 3 ? '🎉' : '🏫'}</span>
          </div>
          <h1 className="text-2xl font-light text-white mb-1">
            {step === 3 ? 'Setup Complete!' : `Setting up ${school.name}`}
          </h1>
          <p className="text-emerald-300/70 text-sm">
            {step === 1 && 'Add your classrooms'}
            {step === 2 && 'Assign teachers to classrooms'}
            {step === 3 && (createdTeachers.length > 0 ? 'Share these codes with your teachers' : 'Head to your dashboard to get started')}
          </p>
          
          {step < 3 && (
            <div className="flex justify-center gap-2 mt-4">
              <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
              <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Step 1: Add Classrooms */}
        {step === 1 && (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <div className="space-y-4 mb-6">
              {classrooms.map((classroom, index) => (
                <div 
                  key={classroom.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                  style={{ borderLeftColor: classroom.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const nextEmoji = EMOJI_OPTIONS[(EMOJI_OPTIONS.indexOf(classroom.icon) + 1) % EMOJI_OPTIONS.length];
                        updateClassroom(classroom.id, { icon: nextEmoji });
                      }}
                      className="text-3xl hover:scale-110 transition-transform"
                    >
                      {classroom.icon}
                    </button>
                    <input
                      type="text"
                      value={classroom.name}
                      onChange={(e) => updateClassroom(classroom.id, { name: e.target.value })}
                      placeholder={`Classroom ${index + 1} name`}
                      className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-emerald-400 outline-none"
                    />
                    <div className="flex gap-1">
                      {COLOR_OPTIONS.slice(0, 4).map(color => (
                        <button
                          key={color}
                          onClick={() => updateClassroom(classroom.id, { color })}
                          className={`w-6 h-6 rounded-full ${classroom.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => removeClassroom(classroom.id)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/30 text-white/50 hover:text-red-300 flex items-center justify-center transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addClassroom}
              className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:text-white hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-all"
            >
              + Add Classroom
            </button>

            <button
              onClick={() => setStep(2)}
              disabled={classrooms.length === 0 || classrooms.some(c => !c.name.trim())}
              className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Teachers →
            </button>
          </div>
        )}

        {/* Step 2: Add Teachers */}
        {step === 2 && (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
            <div className="space-y-6">
              {classrooms.map(classroom => (
                <div 
                  key={classroom.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4"
                  style={{ borderLeftColor: classroom.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{classroom.icon}</span>
                    <span className="font-semibold text-white">{classroom.name}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {classroom.teachers.map((teacher, index) => (
                      <div key={teacher.id} className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={teacher.name}
                          onChange={(e) => updateTeacher(classroom.id, teacher.id, { name: e.target.value })}
                          placeholder="Teacher name"
                          className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-emerald-400 outline-none"
                        />
                        <input
                          type="email"
                          value={teacher.email}
                          onChange={(e) => updateTeacher(classroom.id, teacher.id, { email: e.target.value })}
                          placeholder="Email (optional)"
                          className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-emerald-400 outline-none"
                        />
                        {classroom.teachers.length > 1 && (
                          <button
                            onClick={() => removeTeacher(classroom.id, teacher.id)}
                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/30 text-white/50 hover:text-red-300 flex items-center justify-center"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => addTeacher(classroom.id)}
                    className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    + Add another teacher
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || classrooms.some(c => c.teachers.every(t => !t.name.trim()))}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Complete Setup ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success - Onboarding Complete */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Success Message */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {classrooms.length} Classroom{classrooms.length !== 1 ? 's' : ''} Created!
              </h2>
              <p className="text-emerald-200">
                Each classroom has a comprehensive, customizable Montessori curriculum complete with guides and a teacher dashboard.
              </p>
            </div>

            {/* What&apos;s Next */}
            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <span>👉</span> What&apos;s Next?
              </h3>
              <p className="text-emerald-200/80 mb-4">
                Your teachers need to get on board! They&apos;ll review the curriculum, customize it to match their classroom, and add their students.
              </p>
              <p className="text-emerald-200/80">
                But first, they need their login credentials...
              </p>
            </div>

            {/* Teacher Codes */}
            {createdTeachers.length > 0 && (
              <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>🔑</span> Teacher Login Codes
                  </h3>
                  <button
                    onClick={copyAllCodes}
                    className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 ${
                      copiedCode === 'all'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    {copiedCode === 'all' ? '✓ Copied All!' : '📋 Copy All'}
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  {createdTeachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{teacher.classroom_icon}</span>
                        <div>
                          <p className="font-medium text-white text-sm">{teacher.name}</p>
                          <p className="text-emerald-300/60 text-xs">{teacher.classroom_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 font-mono rounded-lg">
                          {teacher.login_code}
                        </code>
                        <button
                          onClick={() => copyCode(teacher.login_code)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            copiedCode === teacher.login_code
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                        >
                          {copiedCode === teacher.login_code ? '✓' : 'Copy'}
                        </button>
                        <button
                          onClick={() => shareCode(teacher)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            copiedCode === `share-${teacher.login_code}`
                              ? 'bg-emerald-500 text-white'
                              : 'bg-teal-500/30 text-teal-300 hover:bg-teal-500/50'
                          }`}
                        >
                          {copiedCode === `share-${teacher.login_code}` ? '✓' : '📱'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <p className="text-amber-300 text-sm">
                    Save these codes now! They won&apos;t be shown again.
                  </p>
                </div>
              </div>
            )}

            {/* Go to Dashboard */}
            <button
              onClick={() => router.push('/montree/admin')}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
            >
              Go to Dashboard →
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-slate-500 text-xs">
          🌳 Montree • teacherpotato.xyz
        </p>
      </div>
    </div>
  );
}
