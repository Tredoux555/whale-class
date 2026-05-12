// /montree/admin/classrooms/page.tsx
// Principal Cockpit — Classrooms list (tile view).
// Migrated from /montree/admin/page.tsx so /admin can become the Today cockpit.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Plus, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

interface ClassroomTeacher {
  id: string;
  name: string;
  email: string;
  role: string;
  last_login: string | null;
  login_code: string | null;
}

interface Classroom {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacher_id: string | null;
  teacher_name: string | null;
  teachers: ClassroomTeacher[];
  teacher_count: number;
  student_count: number;
}

const ICONS = ['🐻', '🦁', '🐨', '🐼', '🦊', '🐰', '🦋', '🌈', '🌻', '⭐', '🎨', '📚'];
const COLORS = ['#34d399', '#3B82F6', '#8B5CF6', '#EC4899', '#E8C96A', '#EF4444'];

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function ClassroomsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isViewer, setIsViewer] = useState(false); // teacher-led school → no add
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classroomForm, setClassroomForm] = useState({ name: '', icon: '🐻', color: '#34d399' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    if (!schoolData || !principalData) {
      router.replace('/montree/login-select');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const s = schoolData ? JSON.parse(schoolData) : null;
    const p = principalData ? JSON.parse(principalData) : null;
    return {
      'Content-Type': 'application/json',
      'x-school-id': s?.id || '',
      'x-principal-id': p?.id || '',
    };
  };

  const fetchData = async () => {
    try {
      // Two parallel calls: classrooms list + plan info (today endpoint).
      const [overviewRes, todayRes] = await Promise.all([
        fetch('/api/montree/admin/overview', { headers: getHeaders() }),
        fetch('/api/montree/admin/today', { credentials: 'include' }),
      ]);
      if (overviewRes.status === 401) {
        router.replace('/montree/login-select');
        return;
      }
      if (!overviewRes.ok) {
        console.error('Failed to load classrooms:', overviewRes.status);
        return;
      }
      const data = await overviewRes.json();
      setClassrooms(data.classrooms || []);

      if (todayRes.ok) {
        const todayData = await todayRes.json();
        setIsViewer(!!todayData.plan?.is_teacher_led);
      }
    } catch {
      toast.error(t('admin.error.loadDashboard'));
    } finally {
      setLoading(false);
    }
  };

  const openClassroomModal = (classroom?: Classroom) => {
    if (classroom) {
      setEditingClassroom(classroom);
      setClassroomForm({ name: classroom.name, icon: classroom.icon, color: classroom.color });
    } else {
      setEditingClassroom(null);
      setClassroomForm({ name: '', icon: '🐻', color: '#34d399' });
    }
    setShowClassroomModal(true);
  };

  const saveClassroom = async () => {
    if (!classroomForm.name.trim()) return;
    setSaving(true);
    try {
      const method = editingClassroom ? 'PATCH' : 'POST';
      const body = editingClassroom
        ? { id: editingClassroom.id, ...classroomForm }
        : classroomForm;
      const res = await fetch('/api/montree/admin/classrooms', {
        method,
        headers: getHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowClassroomModal(false);
        toast.success(
          editingClassroom
            ? t('admin.success.classroomUpdated')
            : t('admin.success.classroomCreated')
        );
        fetchData();
      }
    } catch {
      toast.error(t('admin.error.saveClassroom'));
    } finally {
      setSaving(false);
    }
  };

  const leadTeacher = (c: Classroom) =>
    c.teachers?.find((tch) => tch.role === 'lead_teacher') || c.teachers?.[0] || null;
  const assistantCount = (c: Classroom) => Math.max(0, (c.teacher_count || 0) - 1);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.textSecondary, fontFamily: T.sans }}>
        {t('admin.loadingDashboard')}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      <Toaster position="top-center" theme="dark" />

      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: T.serif,
              fontSize: 30,
              fontWeight: 500,
              color: T.textPrimary,
              margin: 0,
              letterSpacing: -0.4,
            }}
          >
            Classrooms
          </h1>
          <p style={{ color: T.textSecondary, fontSize: 14, marginTop: 6, margin: '6px 0 0 0' }}>
            {classrooms.length === 1
              ? '1 classroom'
              : `${classrooms.length} classrooms`}
          </p>
        </div>
        {isViewer ? (
          <a
            href="https://montree.xyz/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: 'rgba(232,201,106,0.10)',
              color: '#E8C96A',
              border: '1px solid rgba(232,201,106,0.30)',
              borderRadius: 999,
              fontFamily: T.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
            title="Adding classrooms requires a school plan"
          >
            <Plus size={16} strokeWidth={2.25} />
            Upgrade to add classrooms
          </a>
        ) : (
          <button
            onClick={() => openClassroomModal()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 999,
              fontFamily: T.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={16} strokeWidth={2.25} />
            {t('admin.addClassroom')}
          </button>
        )}
      </div>

      {/* Empty state */}
      {classrooms.length === 0 && (
        <div
          style={{
            background: T.cardBg,
            backdropFilter: 'blur(18px)',
            border: T.cardBorder,
            borderRadius: 18,
            padding: 36,
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
            {t('admin.onboarding.createFirstClassroom')}
          </div>
          <p style={{ color: T.textSecondary, fontSize: 14, marginBottom: 20 }}>
            {t('admin.onboarding.addClassroomDesc')}
          </p>
          <button
            onClick={() => openClassroomModal()}
            style={{
              padding: '12px 22px',
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 999,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + {t('admin.addClassroom')}
          </button>
        </div>
      )}

      {/* Tile grid */}
      {classrooms.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {classrooms.map((classroom) => {
            const lead = leadTeacher(classroom);
            const assistants = assistantCount(classroom);
            return (
              <button
                key={classroom.id}
                onClick={() => router.push(`/montree/admin/classrooms/${classroom.id}`)}
                style={{
                  background: T.cardBg,
                  backdropFilter: 'blur(18px)',
                  border: T.cardBorder,
                  borderLeft: `4px solid ${classroom.color}`,
                  borderRadius: 16,
                  padding: 18,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: T.sans,
                  color: T.textPrimary,
                  transition: 'transform 0.15s ease, background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(8,20,12,0.75)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = T.cardBg;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 28 }}>{classroom.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: T.serif,
                        fontSize: 17,
                        fontWeight: 500,
                        color: T.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {classroom.name}
                    </div>
                    <div style={{ color: T.emeraldDim, fontSize: 12, marginTop: 2 }}>
                      {t('admin.studentCount').replace('{count}', String(classroom.student_count))}
                    </div>
                  </div>
                </div>

                {lead ? (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: T.textPrimary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {lead.name}
                    </div>
                    {assistants > 0 && (
                      <div style={{ color: T.emeraldDim, fontSize: 11, marginTop: 2 }}>
                        +{assistants}{' '}
                        {t('admin.assistantCount').replace('{count}', String(assistants))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'rgba(232,201,106,0.12)',
                      border: '1px solid rgba(232,201,106,0.25)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      marginBottom: 12,
                      textAlign: 'center',
                      fontSize: 12,
                      color: '#E8C96A',
                    }}
                  >
                    {t('admin.noTeacherAssigned')}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 6,
                    color: T.emeraldDim,
                    fontSize: 13,
                  }}
                >
                  {t('admin.view')}
                  <ChevronRight size={14} strokeWidth={2} />
                </div>
              </button>
            );
          })}

          {/* Add tile — gated for viewer principals */}
          {isViewer ? (
            <a
              href="https://montree.xyz/pricing"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(232,201,106,0.06)',
                border: '2px dashed rgba(232,201,153,0.30)',
                borderRadius: 16,
                padding: 24,
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: T.sans,
                color: '#E8C96A',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              <Plus size={28} strokeWidth={1.5} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Upgrade to add</span>
              <span style={{ fontSize: 11, color: 'rgba(232,201,106,0.65)' }}>school plan unlocks classrooms</span>
            </a>
          ) : (
            <button
              onClick={() => openClassroomModal()}
              style={{
                background: 'rgba(8,20,12,0.30)',
                border: '2px dashed rgba(52,211,153,0.30)',
                borderRadius: 16,
                padding: 24,
                minHeight: 160,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                fontFamily: T.sans,
                color: T.emeraldDim,
              }}
            >
              <Plus size={28} strokeWidth={1.5} />
              <span style={{ fontSize: 13 }}>{t('admin.addClassroom')}</span>
            </button>
          )}
        </div>
      )}

      {/* Classroom modal — same flow as before, restyled */}
      {showClassroomModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#0e2218',
              border: '1px solid rgba(52,211,153,0.25)',
              borderRadius: 18,
              padding: 24,
              maxWidth: 460,
              width: '100%',
              fontFamily: T.sans,
            }}
          >
            <h2
              style={{
                fontFamily: T.serif,
                fontSize: 22,
                fontWeight: 500,
                color: T.textPrimary,
                marginBottom: 18,
              }}
            >
              {editingClassroom ? t('admin.modal.editClassroom') : t('admin.modal.addClassroom')}
            </h2>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  color: T.emeraldDim,
                  fontSize: 12,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {t('admin.modal.name')}
              </label>
              <input
                type="text"
                value={classroomForm.name}
                onChange={(e) => setClassroomForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('admin.modal.namePlaceholder')}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(0,0,0,0.30)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  borderRadius: 10,
                  color: T.textPrimary,
                  fontFamily: T.sans,
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'block',
                  color: T.emeraldDim,
                  fontSize: 12,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {t('admin.modal.icon')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setClassroomForm((f) => ({ ...f, icon }))}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background:
                        classroomForm.icon === icon ? T.emerald : 'rgba(0,0,0,0.30)',
                      border: 'none',
                      fontSize: 20,
                      cursor: 'pointer',
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 22 }}>
              <label
                style={{
                  display: 'block',
                  color: T.emeraldDim,
                  fontSize: 12,
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {t('admin.modal.color')}
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setClassroomForm((f) => ({ ...f, color }))}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: color,
                      border: 'none',
                      cursor: 'pointer',
                      outline:
                        classroomForm.color === color
                          ? `2px solid ${T.textPrimary}`
                          : 'none',
                      outlineOffset: 2,
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowClassroomModal(false)}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  background: 'rgba(255,255,255,0.06)',
                  color: T.textPrimary,
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 999,
                  fontFamily: T.sans,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {t('admin.modal.cancel')}
              </button>
              <button
                onClick={saveClassroom}
                disabled={saving || !classroomForm.name.trim()}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  background: T.emerald,
                  color: '#0a1a0f',
                  border: 'none',
                  borderRadius: 999,
                  fontFamily: T.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  opacity: saving || !classroomForm.name.trim() ? 0.5 : 1,
                }}
              >
                {saving ? t('admin.modal.saving') : t('admin.modal.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
