// /montree/principal/setup/page.tsx
// Session 105: Principal Setup - Add classrooms & teachers (beautiful green theme)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import PrincipalSetupGuide from '@/components/montree/onboarding/PrincipalSetupGuide';


const EMOJI_OPTIONS = ['🌳', '🐼', '🦁', '🐘', '🦋', '🌟', '🌈', '🌻', '🍎', '🎨', '📚', '🎵'];
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type Teacher = { id: string; name: string; email: string };
type Classroom = { id: string; name: string; icon: string; color: string; teachers: Teacher[] };
type CreatedTeacher = { id: string; name: string; login_code: string; classroom_name: string; classroom_icon: string };

// Curated setup steps — shown one at a time with smooth transitions
const getSetupSteps = (t: any) => [
  { emoji: '🏫', text: t('principal.setup.step.classrooms') },
  { emoji: '📚', text: t('principal.setup.step.curriculum') },
  { emoji: '🌱', text: t('principal.setup.step.activities') },
  { emoji: '👩‍🏫', text: t('principal.setup.step.teachers') },
  { emoji: '🔑', text: t('principal.setup.step.codes') },
  { emoji: '✨', text: t('principal.setup.step.finishing') },
];

export default function PrincipalSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(1); // 1: classrooms, 2: teachers, 3: success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [school, setSchool] = useState<any>(null);
  const [principalName, setPrincipalName] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [createdTeachers, setCreatedTeachers] = useState<CreatedTeacher[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Principal setup guide state — only show once per device
  const [showSetupGuide, setShowSetupGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('montree_guide_principal_done');
    }
    return true;
  });

  useEffect(() => {
    const stored = localStorage.getItem('montree_school');
    if (stored) {
      setSchool(JSON.parse(stored));
    } else {
      router.push('/montree/principal/login');
      return;
    }

    // Get principal name
    const principalData = localStorage.getItem('montree_principal');
    if (principalData) {
      const p = JSON.parse(principalData);
      setPrincipalName(p.name || '');
    }

    // Show welcome overlay only once per device
    if (!localStorage.getItem('montree_principal_welcome_done')) {
      setShowWelcome(true);
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

  const [progressDetail, setProgressDetail] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [setupStepIndex, setSetupStepIndex] = useState(0);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setProgressDetail('');
    setProgressPercent(0);
    setSetupStepIndex(0);

    // Smooth step advancement — advance every 2.5s, capped at second-to-last step
    const SETUP_STEPS = getSetupSteps(t);
    const stepTimer = setInterval(() => {
      setSetupStepIndex(prev => Math.min(prev + 1, SETUP_STEPS.length - 2));
    }, 2500);

    try {
      // Use streaming endpoint for real-time progress
      const response = await fetch('/api/montree/principal/setup-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: school.id, classrooms }),
      });

      if (!response.body) {
        throw new Error(t('principal.setup.error.noResponseBody'));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            continue;
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Map server steps to our curated step indices for key milestones
              if (data.step === 'curriculum' || data.step === 'curriculum_with_guides') {
                setSetupStepIndex(2);
              } else if (data.step === 'teachers' || data.step === 'teacher_created') {
                setSetupStepIndex(3);
              } else if (data.step === 'curriculum_done') {
                setSetupStepIndex(3);
              }

              // Track real progress percentage from curriculum seeding
              if (data.current && data.total) {
                setProgressPercent(Math.round((data.current / data.total) * 100));
              }

              // Handle completion
              if (data.teachers) {
                setSetupStepIndex(SETUP_STEPS.length - 1);
                setCreatedTeachers(data.teachers);
              }
              if (data.warnings) {
                setWarnings(data.warnings);
              }
            } catch (e) {
              // Ignore parse errors for incomplete data
            }
          }
        }
      }

      setStep(3);

    } catch (err) {
      setError(err instanceof Error ? err.message : t('principal.setup.error.setupFailed'));
    } finally {
      clearInterval(stepTimer);
      setLoading(false);
      setProgressDetail('');
      setProgressPercent(0);
      setSetupStepIndex(0);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const shareCode = (teacher: CreatedTeacher) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://montree.xyz';
    const shareUrl = `${baseUrl}/montree/join?code=${teacher.login_code}`;
    const message = `🌳 ${t('principal.setup.welcome')}\n\n${t('principal.setup.hi')} ${teacher.name}, ${t('principal.setup.hereIs')} ${teacher.classroom_name}:\n\n${t('principal.setup.code')}: ${teacher.login_code}\n\n${t('principal.setup.loginHere')}: ${shareUrl}`;

    navigator.clipboard.writeText(message);
    setCopiedCode(`share-${teacher.login_code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const copyAllCodes = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://montree.xyz';

    let content = `🌳 ${t('principal.setup.welcome')}\n\n`;
    content += `${t('principal.setup.hiTeachers')}\n\n`;
    content += `${t('principal.setup.findName')}\n${baseUrl}/montree/login\n\n`;
    content += `${t('principal.setup.enterCode')}\n`;
    content += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    createdTeachers.forEach(teacher => {
      content += `${teacher.classroom_icon} ${teacher.name} (${teacher.classroom_name})\n`;
      content += `   ${t('principal.setup.code')}: ${teacher.login_code}\n\n`;
    });

    content += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    content += `${t('principal.setup.questions')}`;

    navigator.clipboard.writeText(content);
    setCopiedCode('all');
    setTimeout(() => setCopiedCode(null), 3000);
  };

  if (!school) return null;

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('montree_principal_welcome_done', '1');
  };

  return (
    <>
    {/* HIDDEN: onboarding guides disabled */}
    <PrincipalSetupGuide
      isVisible={false && showSetupGuide && !showWelcome && !loading}
      onComplete={() => { localStorage.setItem('montree_guide_principal_done', '1'); setShowSetupGuide(false); }}
      onSkip={() => { localStorage.setItem('montree_guide_principal_done', '1'); setShowSetupGuide(false); }}
      wizardStep={step}
      hasClassrooms={classrooms.length > 0}
      hasTeachers={createdTeachers.length > 0}
    />
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">

      {/* ============ WELCOME OVERLAY — HIDDEN: onboarding guides disabled ============ */}
      {false && showWelcome && school && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md">
          {/* Ambient glow behind the card */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />

          <div
            className="relative z-10 text-center px-6"
            style={{ animation: 'welcome-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          >
            {/* Tree icon with glow ring */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-400/20 blur-xl" style={{ animation: 'welcome-pulse 3s ease-in-out infinite' }} />
              <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/40 flex items-center justify-center">
                <span className="text-5xl">🌳</span>
              </div>
            </div>

            {/* Welcome text */}
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3 tracking-tight">
              {t('principal.setup.welcome')} {principalName ? `${t('principal.setup.principal')} ${principalName.split(' ')[0]}` : `${t('principal.setup.principal')}!`}
            </h1>

            <p className="text-lg sm:text-xl text-emerald-200/80 mb-2 font-light">
              {t('principal.setup.readyToSetup')}{' '}
              <span className="text-emerald-300 font-medium">{school.name}</span>?
            </p>

            <p className="text-emerald-400/60 text-sm mb-10">
              {t('principal.setup.addClassroomsFirst')}
            </p>

            {/* Let's Go button */}
            <button
              onClick={dismissWelcome}
              className="group relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-lg font-semibold rounded-2xl shadow-xl shadow-emerald-500/30 hover:shadow-2xl hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200"
            >
              <span>{t('principal.setup.letsGo')}</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            {/* Subtle Montree branding */}
            <p className="mt-12 text-slate-500 text-xs tracking-widest uppercase">
              Montree
            </p>
          </div>

          {/* Animations */}
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes welcome-enter {
              from { opacity: 0; transform: scale(0.92) translateY(20px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes welcome-pulse {
              0%, 100% { opacity: 0.4; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(1.15); }
            }
          `}} />
        </div>
      )}

      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg shadow-emerald-500/30 mb-4">
            <span className="text-3xl">{step === 3 ? '🎉' : '🏫'}</span>
          </div>
          <h1 className="text-2xl font-light text-white mb-1">
            {step === 3 ? t('principal.setup.setupComplete') : `${t('principal.setup.settingUp')} ${school.name}`}
          </h1>
          <p className="text-emerald-300/70 text-sm">
            {step === 1 && t('principal.setup.addClassrooms')}
            {step === 2 && t('principal.setup.assignTeachers')}
            {step === 3 && (createdTeachers.length > 0 ? t('principal.setup.shareCodesWithTeachers') : t('principal.setup.goToDashboard'))}
          </p>
          
          {step < 3 && (
            <div className="flex justify-center gap-2 mt-4">
              <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
              <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            </div>
          )}
        </div>

        {/* Loading Overlay — smooth curated step progression */}
        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-8 text-center max-w-md mx-4">
              <div className="text-6xl mb-6 transition-all duration-700 ease-in-out" key={setupStepIndex}>
                {SETUP_STEPS[setupStepIndex]?.emoji || '⏳'}
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">
                {t('principal.setup.settingUpSchool')}
              </h2>
              <p className="text-emerald-300 text-lg mb-4 transition-opacity duration-500" key={`text-${setupStepIndex}`}>
                {getSetupSteps(t)[setupStepIndex]?.text || t('principal.setup.gettingReady')}
              </p>

              {/* Step indicators */}
              <div className="flex justify-center gap-2 mb-5">
                {getSetupSteps(t).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i <= setupStepIndex
                        ? 'w-6 bg-emerald-400'
                        : 'w-3 bg-white/20'
                    }`}
                  />
                ))}
              </div>

              {/* Progress bar for curriculum seeding */}
              {progressPercent > 0 && (
                <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              )}

              <p className="text-white/40 text-xs">
                {progressPercent > 0
                  ? t('principal.setup.percentComplete').replace('{percent}', String(progressPercent))
                  : t('principal.setup.buildingEnvironment')}
              </p>
            </div>
          </div>
        )}

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
                      placeholder={t('principal.setup.classroomName').replace('{num}', String(index + 1))}
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
              data-tutorial="create-classroom-button"
              data-guide="add-classroom-btn"
              className="w-full py-4 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:text-white hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-all"
            >
              + {t('principal.setup.addClassroom')}
            </button>

            <button
              onClick={() => setStep(2)}
              disabled={classrooms.length === 0 || classrooms.some(c => !c.name.trim())}
              data-guide="continue-teachers-btn"
              className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('principal.setup.continueTeachers')} →
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
                    {classroom.teachers.map((teacher, tIndex) => (
                      <div key={teacher.id} className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={teacher.name}
                          onChange={(e) => updateTeacher(classroom.id, teacher.id, { name: e.target.value })}
                          placeholder={t('principal.setup.teacherName')}
                          {...(tIndex === 0 ? { 'data-guide': 'teacher-name-first' } : {})}
                          className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:border-emerald-400 outline-none"
                        />
                        <input
                          type="email"
                          value={teacher.email}
                          onChange={(e) => updateTeacher(classroom.id, teacher.id, { email: e.target.value })}
                          placeholder={t('principal.setup.emailOptional')}
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
                    data-tutorial="add-teacher-button"
                    className="mt-3 text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    + {t('principal.setup.addAnotherTeacher')}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 bg-white/10 border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all"
              >
                ← {t('principal.setup.back')}
              </button>
              <button
                data-tutorial="setup-submit-button"
                data-guide="complete-setup-btn"
                onClick={handleSubmit}
                disabled={loading || classrooms.some(c => c.teachers.every(t => !t.name.trim()))}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <span>{t('principal.setup.settingUp')}</span>
                  </span>
                ) : `${t('principal.setup.completeSetup')} ✓`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success - Onboarding Complete */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Warning if some items failed */}
            {warnings.length > 0 && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⚠️</span>
                  <h3 className="text-red-300 font-semibold">{t('principal.setup.warning.itemsNotCreated')}</h3>
                </div>
                <ul className="text-red-200/80 text-sm space-y-1">
                  {warnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
                <p className="text-red-200/60 text-xs mt-2">{t('principal.setup.warning.tryAgain')}</p>
              </div>
            )}

            {/* Success Message */}
            <div data-tutorial="overview-section" data-guide="setup-overview" className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {t('principal.setup.success.classroomsReady').replace('{count}', String(classrooms.length))}
              </h2>
              <p className="text-emerald-200">
                {t('principal.setup.success.shareWithTeachers')}
              </p>
            </div>

            {/* Teacher Codes */}
            {createdTeachers.length > 0 && (
              <div data-tutorial="manage-teachers-button" data-guide="teacher-codes" className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>🔑</span> {t('principal.setup.teacherLoginCodes')}
                  </h3>
                </div>

                {/* Share to Group Chat CTA */}
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                  <p className="text-emerald-200 text-sm mb-3">
                    📱 {t('principal.setup.shareToGroupChat')}
                  </p>
                  <button
                    onClick={copyAllCodes}
                    className={`w-full py-3 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      copiedCode === 'all'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-500 text-white hover:bg-emerald-600'
                    }`}
                  >
                    {copiedCode === 'all' ? `✓ ${t('principal.setup.copiedPaste')}` : `📋 ${t('principal.setup.copyMessage')}`}
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
                          {copiedCode === teacher.login_code ? '✓' : t('principal.setup.copy')}
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
                    {t('principal.setup.warning.saveCodes')}
                  </p>
                </div>
              </div>
            )}

            {/* Go to Dashboard */}
            <button
              onClick={() => router.push('/montree/admin')}
              data-guide="go-dashboard-btn"
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all"
            >
              {t('principal.setup.goDashboard')} →
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-slate-500 text-xs">
          🌳 Montree • montree.xyz
        </p>
      </div>
    </div>
    </>
  );
}
