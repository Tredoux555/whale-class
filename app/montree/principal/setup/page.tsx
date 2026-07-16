// /montree/principal/setup/page.tsx
// Lanternlight Ceremony — the founding procession's back half (steps 4–6):
//   classrooms → teachers → SSE founding overlay → the handoff success.
// Reskin only. Every API call, the SSE reader/parser, the localStorage guard,
// and the per-teacher share/copy handlers behave byte-identically to the old
// green-theme page — the difference is skin + narrator (Astra top-left).
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { FT, FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';
import GoldenThread from '@/components/montree/funnel/GoldenThread';
import AstraNarrator from '@/components/montree/funnel/AstraNarrator';

const EMOJI_OPTIONS = ['🌳', '🐼', '🦁', '🐘', '🦋', '🌟', '🌈', '🌻', '🍎', '🎨', '📚', '🎵'];
const COLOR_OPTIONS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type Teacher = { id: string; name: string; email: string };
type Classroom = { id: string; name: string; icon: string; color: string; teachers: Teacher[] };
type CreatedTeacher = { id: string; name: string; login_code: string; classroom_name: string; classroom_icon: string };

// The founding ceremony's step lines, shown one at a time during the SSE.
// SIX entries BY DESIGN: the SSE step ticker + server-override index math is
// byte-identical to the original green page — Math.min(prev+1, len-2) caps the
// cosmetic ticker, completion sets len-1, and the server drives 'curriculum'→2,
// 'teachers'/'curriculum_done'→3. The two curriculum ticks (1,2) share the same
// "stocking" line while the real progress bar (current/total) fills.
const getSetupSteps = (t: any): string[] => [
  t('copilot.funnel.setup.building'),
  t('copilot.funnel.setup.stocking'),
  t('copilot.funnel.setup.stocking'),
  t('copilot.funnel.setup.teachers'),
  t('copilot.funnel.setup.keys'),
  t('copilot.funnel.setup.finishing'),
];

// Setup-only screen styles (classrooms / teachers / handoff) transcribed from
// the approved mock. Kept page-local (Build 1's shared funnel-theme.ts is left
// untouched — no fork, no restyle); concatenated into the single style
// injection alongside FUNNEL_CSS. All classes fn- prefixed to match convention.
const SETUP_CSS = `
.fn-croom{display:flex; align-items:center; gap:15px; background:${FT.glass}; border:1px solid ${FT.glassEdge}; border-radius:14px; padding:15px 17px; margin-bottom:13px}
.fn-cemoji{width:50px; height:50px; border-radius:13px; flex:none; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); display:flex; align-items:center; justify-content:center; font-size:1.5rem; cursor:pointer; transition:transform .15s ease; color:inherit}
.fn-cemoji:hover{transform:scale(1.07)}
.fn-cname{flex:1; min-width:0}
.fn-croom .fn-input{padding:11px 14px; font-size:0.96rem}
.fn-sws{display:flex; gap:8px}
.fn-sw{width:21px; height:21px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all .14s ease; padding:0}
.fn-sw.sel{border-color:${FT.gold}}
.fn-remove{width:30px; height:30px; border-radius:50%; flex:none; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.10); color:rgba(255,250,240,0.45); font-size:1.05rem; line-height:1; display:flex; align-items:center; justify-content:center; transition:all .15s ease}
.fn-remove:hover{background:rgba(239,68,68,0.18); color:rgba(252,165,165,0.9); border-color:rgba(239,68,68,0.3)}
.fn-addrow{width:100%; border:1px dashed rgba(255,255,255,0.17); border-radius:16px; padding:15px; text-align:center; color:${FT.whisper}; font-size:0.9rem; cursor:pointer; transition:all .16s ease; margin-bottom:13px; background:none}
.fn-addrow:hover{border-color:rgba(52,211,153,0.4); color:${FT.voice}}
.fn-tgroup{background:${FT.glass}; border:1px solid ${FT.glassEdge}; border-radius:14px; padding:18px; margin-bottom:14px}
.fn-ghead{display:flex; align-items:center; gap:9px; font-family:${FT.serif}; font-size:1.06rem; margin-bottom:13px; color:${FT.voice}}
.fn-trow{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; align-items:center}
.fn-trow .fn-input{padding:12px 14px; font-size:0.95rem}
.fn-temail{display:flex; gap:8px; align-items:center; min-width:0}
.fn-temail .fn-input{flex:1; min-width:0}
.fn-addteacher{font-size:0.84rem; color:${FT.emeraldHi}; cursor:pointer; display:inline-block; margin-top:2px; background:none; border:none; padding:0}
.fn-formfoot{display:flex; align-items:center; justify-content:flex-end; margin-top:8px}
.fn-bloom{width:48px; height:48px; border-radius:50%; border:1px solid ${FT.gold}; margin:20px auto 26px; display:flex; align-items:center; justify-content:center; color:${FT.gold}; font-size:1.2rem; box-shadow:none; animation:fnBloomIn 0.9s ease both}
@keyframes fnBloomIn{0%{transform:scale(0.9); opacity:0}100%{transform:scale(1); opacity:1}}
.fn-keycard{display:flex; align-items:center; gap:16px; background:${FT.glass}; border:1px solid ${FT.glassEdge}; border-radius:14px; padding:18px 20px; margin-bottom:14px; text-align:left; flex-wrap:wrap}
.fn-kemoji{width:52px; height:52px; border-radius:14px; flex:none; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09); display:flex; align-items:center; justify-content:center; font-size:1.5rem}
.fn-kwho{flex:1; min-width:0}
.fn-kname{font-family:${FT.serif}; font-size:1.12rem; color:${FT.voice}}
.fn-kroom{font-size:0.8rem; color:${FT.whisper}; margin-top:3px}
.fn-kcode{font-family:ui-monospace,Menlo,monospace; font-weight:600; font-size:1rem; letter-spacing:0.2em; color:${FT.gold}; background:transparent; border:1px solid rgba(232,201,106,0.3); border-radius:11px; padding:11px 16px 11px 19px; white-space:nowrap}
.fn-kbtn{border-radius:999px; padding:10px 17px; font-size:0.85rem; font-weight:600; background:rgba(255,255,255,0.06); color:${FT.voice}; border:1px solid rgba(255,255,255,0.13); transition:filter .15s ease}
.fn-kbtn:hover{filter:brightness(1.12)}
.fn-kbtn.send{background:#1D5C41; border-color:rgba(255,255,255,0.08); color:#fff; padding:9px 14px}
.fn-kbtn.send:hover{background:#236B4C; filter:none}
.fn-kbtn.done{background:${FT.emerald}; border-color:transparent; color:#fff}
.fn-groupcta{width:100%; margin-top:6px; border-radius:10px; padding:14px; font-size:0.9rem; font-weight:500; background:transparent; border:1px solid rgba(232,201,106,0.35); color:rgba(232,201,106,0.9); transition:background .16s ease}
.fn-groupcta:hover{background:rgba(232,201,106,0.06)}
.fn-groupcta.done{background:rgba(52,211,153,0.12); border-color:rgba(52,211,153,0.35); color:${FT.emeraldHi}}
.fn-walkin{margin-top:30px; text-align:center}
.fn-warn{width:100%; background:rgba(239,68,68,0.10); border:1px solid rgba(239,68,68,0.3); border-radius:16px; padding:16px 18px; margin-bottom:18px; text-align:left}
.fn-warn h3{color:rgba(252,165,165,0.95); font-family:${FT.serif}; font-weight:500; font-size:1.05rem; margin-bottom:8px}
.fn-warn ul{list-style:none; color:rgba(252,165,165,0.82); font-size:0.85rem; line-height:1.6; margin:0; padding:0}
.fn-warn p{color:rgba(252,165,165,0.6); font-size:0.78rem; margin-top:8px}
@media (max-width:1040px){
  .fn-trow{grid-template-columns:1fr}
}
`;

export default function PrincipalSetupPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState(1); // 1: classrooms, 2: teachers, 3: success
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [school, setSchool] = useState<any>(null);

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [createdTeachers, setCreatedTeachers] = useState<CreatedTeacher[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('montree_school');
    if (stored) {
      setSchool(JSON.parse(stored));
    } else {
      router.push('/montree/principal/login');
      return;
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

      if (!response.ok) {
        throw new Error(t('principal.setup.error.noResponseBody'));
      }
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

  // ── Narrator / thread derivation (presentational) ──────────────────────────
  // Astra walks the principal through the whole back half. The founding overlay
  // is a stage screen (loading===true), NOT a fixed takeover — the narrator
  // stays lit on the left throughout (matches the mock).
  const isFounding = loading;
  const screenKey = isFounding
    ? 'founding'
    : step === 1
      ? 'classrooms'
      : step === 2
        ? 'teachers'
        : 'handoff';
  const threadStep = step === 3 ? 6 : isFounding || step === 2 ? 5 : 4;

  return (
    <div className="fn-page">
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS + SETUP_CSS }} />

      {/* Topbar — M artwork + wordmark + EN toggle (consistent with /try) */}
      <div className="fn-topbar">
        <a className="fn-wordmark" href="/montree">
          <picture>
            <source srcSet="/brand/m-mark-transparent.webp" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/m-mark.png" alt="Montree" width={30} height={25} />
          </picture>
          <span>{t('app.name')}</span>
        </a>
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
      </div>

      {/* Golden thread */}
      <GoldenThread step={threadStep} />

      <div className="fn-hall">
        {/* The narrator — top-left, every screen (authed Astra, hands over at /admin) */}
        <AstraNarrator screenKey={screenKey} journey="principal" authed={true} />

        {/* The stage */}
        <div className="fn-stage-wrap">
          {isFounding ? (
            /* ── SSE founding overlay — the ceremony (real progress bar) ── */
            <div className="fn-screen center">
              <div className="fn-cere-line" style={{ marginTop: 120 }}>
                {getSetupSteps(t)[setupStepIndex] || t('copilot.funnel.setup.finishing')}
              </div>
              <div className="fn-cere-bar">
                <i style={{ width: `${Math.max(progressPercent, 6)}%` }} />
              </div>
            </div>
          ) : step === 3 ? (
            /* ── Handoff — the success ── */
            <div className="fn-screen center">
              {warnings.length > 0 && (
                <div className="fn-warn">
                  <h3>⚠️ {t('principal.setup.warning.itemsNotCreated')}</h3>
                  <ul>
                    {warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                  <p>{t('principal.setup.warning.tryAgain')}</p>
                </div>
              )}

              <div className="fn-bloom">✓</div>
              <h1 className="fn-h1" style={{ marginBottom: 30 }}>
                {t('copilot.funnel.handoff.heading', { school: school.name })}
              </h1>

              {createdTeachers.length > 0 && (
                <div style={{ width: '100%' }}>
                  {createdTeachers.map((teacher) => (
                    <div key={teacher.id} className="fn-keycard">
                      <div className="fn-kemoji">{teacher.classroom_icon}</div>
                      <div className="fn-kwho">
                        <div className="fn-kname">{teacher.name}</div>
                        <div className="fn-kroom">{teacher.classroom_name}</div>
                      </div>
                      <span className="fn-kcode">{teacher.login_code}</span>
                      <button
                        className={`fn-kbtn${copiedCode === teacher.login_code ? ' done' : ''}`}
                        onClick={() => copyCode(teacher.login_code)}
                      >
                        {copiedCode === teacher.login_code ? '✓' : t('copilot.funnel.handoff.copy')}
                      </button>
                      <button
                        className={`fn-kbtn send${copiedCode === `share-${teacher.login_code}` ? ' done' : ''}`}
                        onClick={() => shareCode(teacher)}
                      >
                        {copiedCode === `share-${teacher.login_code}` ? '✓' : `${t('copilot.funnel.handoff.send')} →`}
                      </button>
                    </div>
                  ))}

                  <button
                    className={`fn-groupcta${copiedCode === 'all' ? ' done' : ''}`}
                    onClick={copyAllCodes}
                  >
                    {copiedCode === 'all' ? `✓ ${t('principal.setup.copiedPaste')}` : t('copilot.funnel.handoff.groupCta')}
                  </button>
                </div>
              )}

              <div className="fn-walkin">
                <button
                  className="fn-pill"
                  onClick={() => router.push('/montree/admin')}
                >
                  {t('copilot.funnel.handoff.walkin')} →
                </button>
              </div>
            </div>
          ) : step === 1 ? (
            /* ── Classrooms ── */
            <div className="fn-screen" style={{ maxWidth: 600 }}>
              <h2 className="fn-h2" style={{ marginBottom: 28 }}>
                {t('copilot.funnel.classrooms.heading')}
              </h2>

              {error && (
                <div className="fn-error" style={{ marginBottom: 18 }}>
                  <pre>{error}</pre>
                </div>
              )}

              {classrooms.map((classroom, index) => (
                <div key={classroom.id} className="fn-croom">
                  <button
                    type="button"
                    className="fn-cemoji"
                    title={t('principal.setup.classroomName').replace('{num}', String(index + 1))}
                    onClick={() => {
                      const nextEmoji = EMOJI_OPTIONS[(EMOJI_OPTIONS.indexOf(classroom.icon) + 1) % EMOJI_OPTIONS.length];
                      updateClassroom(classroom.id, { icon: nextEmoji });
                    }}
                  >
                    {classroom.icon}
                  </button>
                  <div className="fn-cname">
                    <input
                      type="text"
                      className="fn-input"
                      value={classroom.name}
                      onChange={(e) => updateClassroom(classroom.id, { name: e.target.value })}
                      placeholder={t('principal.setup.classroomName').replace('{num}', String(index + 1))}
                    />
                  </div>
                  <div className="fn-sws">
                    {COLOR_OPTIONS.slice(0, 4).map((color) => (
                      <button
                        type="button"
                        key={color}
                        aria-label={color}
                        className={`fn-sw${classroom.color === color ? ' sel' : ''}`}
                        style={{ background: color }}
                        onClick={() => updateClassroom(classroom.id, { color })}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="fn-remove"
                    aria-label="remove"
                    onClick={() => removeClassroom(classroom.id)}
                  >
                    ×
                  </button>
                </div>
              ))}

              <button type="button" className="fn-addrow" onClick={addClassroom}>
                ＋ {t('copilot.funnel.classrooms.add')}
              </button>

              <div className="fn-formfoot">
                <button
                  className="fn-pill"
                  onClick={() => setStep(2)}
                  disabled={classrooms.length === 0 || classrooms.some((c) => !c.name.trim())}
                >
                  {t('copilot.funnel.classrooms.cta')} →
                </button>
              </div>
            </div>
          ) : (
            /* ── Teachers ── */
            <div className="fn-screen" style={{ maxWidth: 600 }}>
              <button type="button" className="fn-backlink" onClick={() => setStep(1)}>
                ← {t('copilot.funnel.teachers.back')}
              </button>
              <h2 className="fn-h2" style={{ marginBottom: 26 }}>
                {t('copilot.funnel.teachers.heading')}
              </h2>

              {error && (
                <div className="fn-error" style={{ marginBottom: 18 }}>
                  <pre>{error}</pre>
                </div>
              )}

              {classrooms.map((classroom) => (
                <div key={classroom.id} className="fn-tgroup">
                  <div className="fn-ghead">
                    <span>{classroom.icon}</span>
                    <span>{classroom.name}</span>
                  </div>

                  {classroom.teachers.map((teacher) => (
                    <div key={teacher.id} className="fn-trow">
                      <input
                        type="text"
                        className="fn-input"
                        value={teacher.name}
                        onChange={(e) => updateTeacher(classroom.id, teacher.id, { name: e.target.value })}
                        placeholder={t('copilot.funnel.teacherName')}
                      />
                      <div className="fn-temail">
                        <input
                          type="email"
                          className="fn-input"
                          value={teacher.email}
                          onChange={(e) => updateTeacher(classroom.id, teacher.id, { email: e.target.value })}
                          placeholder={t('copilot.funnel.teacherEmail')}
                        />
                        {classroom.teachers.length > 1 && (
                          <button
                            type="button"
                            className="fn-remove"
                            aria-label="remove"
                            onClick={() => removeTeacher(classroom.id, teacher.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="fn-addteacher"
                    onClick={() => addTeacher(classroom.id)}
                  >
                    ＋ {t('copilot.funnel.teachers.addAnother')}
                  </button>
                </div>
              ))}

              <div className="fn-formfoot">
                <button
                  className="fn-pill"
                  onClick={handleSubmit}
                  disabled={loading || classrooms.some((c) => c.teachers.every((tt) => !tt.name.trim()))}
                >
                  {t('copilot.funnel.teachers.cta')} ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fn-foot">Montree · montree.xyz</div>
    </div>
  );
}
