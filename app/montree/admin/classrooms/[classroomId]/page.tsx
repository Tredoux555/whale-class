// /montree/admin/classrooms/[classroomId]/page.tsx
//
// Classroom drill-down — the principal's view of one classroom.
//
// DESIGN MENTAL MODEL (Session — May 8 redesign):
//   The principal is an OVERSEER, not a data-entry admin. Teachers add their
//   own students. The principal's actual job in this view is to make sure
//   each teacher has their login code so they can join — that's why the
//   Teaching Team section is foregrounded with Copy + Send actions per
//   teacher, while the Students section is quiet and explanatory when empty.
//   Manual student-add is preserved (legitimate edge cases) but tucked
//   behind an "Advanced setup" disclosure inside the empty-state card so it
//   doesn't shout at someone who isn't supposed to be doing data entry.
//
// HIERARCHY:
//   1. Quiet header (back link + classroom icon + name + small stat)
//   2. Teaching team — the focal section
//   3. Students — calm empty state OR avatar grid
//
// Tracy floats upper-right via the layout. She'll greet on first session
// login and offer to draft welcome messages with codes — that flow runs in
// parallel to whatever the principal does on this page.
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import {
  ArrowLeft,
  Copy,
  Send,
  MoreVertical,
  Plus,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

// ── Dark forest tokens — match the cockpit shell ────────────────────────
const T = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.80)',
  cardBorder: '1px solid rgba(52,211,153,0.16)',
  cardBorderHover: '1px solid rgba(52,211,153,0.32)',
  divider: '1px solid rgba(52,211,153,0.10)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldDim: 'rgba(52,211,153,0.65)',
  gold: '#E8C96A',
  goldSoft: 'rgba(232,201,106,0.08)',
  goldText: '#f0d68a',
  goldSubtle: 'rgba(232,201,106,0.18)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSoft: '#eaf1e6',
  textSecondary: 'rgba(234,241,230,0.62)',
  textMuted: 'rgba(255,255,255,0.42)',
  red: '#f87171',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"SF Mono", Menlo, Monaco, Consolas, monospace',
};

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  login_code: string | null;
  last_login: string | null;
  is_active: boolean;
  photos_this_week?: number;
  notes_this_week?: number;
}

interface ProgressBucket {
  mastered: number;
  practicing: number;
  presented: number;
  by_area?: Record<string, { mastered: number; practicing: number; presented: number }>;
}

interface Student {
  id: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  is_active: boolean;
  progress?: ProgressBucket;
  photos_this_week?: number;
}

interface ClassroomDetail {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface School {
  name: string;
}

// ── Page ────────────────────────────────────────────────────────────────

export default function ClassroomDetailPage({
  params,
}: {
  params: Promise<{ classroomId: string }>;
}) {
  const { classroomId } = use(params);
  const router = useRouter();
  const { t } = useI18n();

  // Data
  const [classroom, setClassroom] = useState<ClassroomDetail | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  // Per-teacher copy feedback (keyed by code)
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Per-teacher kebab menu (only one open at a time)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Add Teacher modal
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '' });
  const [newCode, setNewCode] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add Student modal (rarely surfaced — gated behind Advanced disclosure)
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', age: '' });

  // Advanced disclosure inside the empty-students card
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // ── Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) {
      router.push('/montree/principal/login');
      return;
    }
    try {
      const s = JSON.parse(schoolData);
      setSchool({ name: s.name || '' });
    } catch {
      // ignore — school name is best-effort, used for email body fallback only
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classroomId]);

  // Close kebab on outside click — every kebab + menu is wrapped in
  // [data-teacher-menu]; clicks anywhere outside that scope close the menu.
  useEffect(() => {
    if (!openMenuId) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-teacher-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [openMenuId]);

  // ── Data ─────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/montree/admin/classrooms/${classroomId}`);
      if (!res.ok) {
        toast.error(t('admin.classroomNotFound'));
        router.push('/montree/admin/classrooms');
        return;
      }
      const data = await res.json();
      setClassroom(data.classroom);
      setTeachers(data.teachers || []);
      setStudents(data.students || []);
    } catch {
      toast.error(t('admin.failedToLoadClassroom'));
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────
  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {
      // best-effort fallback
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {
        // give up silently
      }
    });
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
  };

  const sendEmailToTeacher = (teacher: Teacher) => {
    if (!teacher.login_code) {
      toast.error('No login code yet — regenerate one first.');
      return;
    }
    if (!teacher.email) {
      copyCode(teacher.login_code);
      toast.success(`Code copied — share with ${teacher.name}.`);
      return;
    }
    const firstName = (teacher.name || '').split(' ')[0] || 'there';
    const schoolName = school?.name || 'our school';
    const classroomName = classroom?.name || 'your classroom';
    const subject = `Welcome to ${schoolName} — your Montree login`;
    // Keep this body in lockstep with Tracy's draft_teacher_welcome_messages
    // tool (lib/montree/tracy/tool-executor.ts). Both paths produce the same
    // welcome — feels like one product whether the principal sends from the
    // classroom row or asks Tracy to draft for the whole team.
    const body =
      `Hi ${firstName},\n\n` +
      `Welcome to ${schoolName}'s classroom system. Your login code for Montree is ${teacher.login_code}.\n\n` +
      `Go to montree.xyz, type the code, and you'll land on ${classroomName}. Tip: once you're in, save the page to your home screen so it works like an app — on iPhone tap the share icon then "Add to Home Screen", on Android tap the menu then "Install app" or "Add to Home Screen".\n\n` +
      `Once you're in, ask Guru — the AI assistant inside the app — anything you need. Adding students, your first photos, how Montree works. Guru's there for you.\n\n` +
      `Let me know if you get stuck.`;
    const href = `mailto:${encodeURIComponent(
      teacher.email
    )}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  const changeRole = async (teacherId: string, newRole: string) => {
    try {
      await fetch('/api/montree/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacherId, role: newRole }),
      });
      toast.success(t('admin.roleUpdated'));
      fetchData();
    } catch {
      toast.error(t('admin.failedToUpdateRole'));
    }
  };

  const regenerateCode = async (teacherId: string) => {
    if (!confirm(t('admin.regenerateCodeConfirm'))) return;
    try {
      const res = await fetch('/api/montree/admin/teachers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: teacherId, regenerate_code: true }),
      });
      const data = await res.json();
      if (data.new_login_code) {
        setNewCode(data.new_login_code);
        setShowAddTeacher(true); // reuse the modal as the "code reveal" surface
        fetchData();
      }
    } catch {
      toast.error(t('admin.failedToRegenerateCode'));
    }
  };

  const addTeacher = async () => {
    if (!teacherForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/admin/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teacherForm.name.trim(),
          email: teacherForm.email.trim() || null,
          classroom_id: classroomId,
        }),
      });
      const data = await res.json();
      if (data.success && data.teacher?.login_code) {
        setNewCode(data.teacher.login_code);
        fetchData();
      }
    } catch {
      toast.error(t('admin.failedToAddTeacher'));
    } finally {
      setSaving(false);
    }
  };

  const addStudent = async () => {
    if (!studentForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/montree/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentForm.name.trim(),
          age: studentForm.age ? parseFloat(studentForm.age) : null,
          classroom_id: classroomId,
        }),
      });
      if (res.ok) {
        toast.success(t('admin.studentAdded'));
        setShowAddStudent(false);
        setStudentForm({ name: '', age: '' });
        fetchData();
      }
    } catch {
      toast.error(t('admin.failedToAddStudent'));
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.emeraldDim,
          fontFamily: T.sans,
          fontSize: 13.5,
          letterSpacing: 0.4,
        }}
      >
        Loading…
      </div>
    );
  }

  if (!classroom) return null;

  // Sort: lead first, then by name
  const sortedTeachers = [...teachers].sort((a, b) => {
    const order: Record<string, number> = {
      lead_teacher: 0,
      teacher: 1,
      assistant_teacher: 2,
    };
    const oa = order[a.role || 'teacher'] ?? 1;
    const ob = order[b.role || 'teacher'] ?? 1;
    if (oa !== ob) return oa - ob;
    return (a.name || '').localeCompare(b.name || '');
  });

  const teacherCount = teachers.length;
  const studentCount = students.length;
  const stat = `${teacherCount} ${teacherCount === 1 ? 'teacher' : 'teachers'} · ${studentCount} ${studentCount === 1 ? 'student' : 'students'}`;

  return (
    <div
      style={{
        color: T.textSoft,
        fontFamily: T.sans,
        maxWidth: 920,
        margin: '0 auto',
        paddingBottom: 80,
      }}
    >
      <Toaster position="top-center" />

      {/* ── Back link ─────────────────────────────────────────────── */}
      <Link
        href="/montree/admin/classrooms"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: T.emeraldDim,
          fontSize: 13,
          textDecoration: 'none',
          marginBottom: 20,
          transition: 'color 0.15s ease',
        }}
        className="back-link"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Classrooms
      </Link>

      {/* ── Header card ───────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '20px 22px',
          background: T.cardBg,
          backdropFilter: 'blur(14px)',
          border: T.cardBorder,
          borderRadius: 18,
          marginBottom: 36,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: T.emeraldSoft,
            border: '1px solid rgba(52,211,153,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            flexShrink: 0,
          }}
        >
          {classroom.icon || '🌱'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: T.serif,
              fontSize: 28,
              fontWeight: 500,
              margin: 0,
              color: T.textPrimary,
              letterSpacing: -0.4,
              lineHeight: 1.1,
            }}
          >
            {classroom.name}
          </h1>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: 13,
              color: T.textSecondary,
              letterSpacing: 0.2,
            }}
          >
            {stat}
          </p>
        </div>
      </header>

      {/* ── Teaching team section ─────────────────────────────────── */}
      <section style={{ marginBottom: 44 }}>
        <SectionHeader
          title="Teaching team"
          actionLabel="Add teacher"
          onAction={() => {
            setShowAddTeacher(true);
            setNewCode(null);
            setTeacherForm({ name: '', email: '' });
          }}
        />
        {teacherCount > 0 ? (
          <p
            style={{
              margin: '0 0 18px 0',
              fontSize: 13.5,
              color: T.textSecondary,
              lineHeight: 1.55,
            }}
          >
            Send each teacher their login code so they can join.
          </p>
        ) : null}

        {teacherCount === 0 ? (
          <EmptyTeachersCard
            onAdd={() => {
              setShowAddTeacher(true);
              setNewCode(null);
              setTeacherForm({ name: '', email: '' });
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sortedTeachers.map((teacher) => (
              <TeacherRow
                key={teacher.id}
                teacher={teacher}
                isLead={teacher.role === 'lead_teacher'}
                copiedCode={copiedCode}
                menuOpen={openMenuId === teacher.id}
                onCopy={() => teacher.login_code && copyCode(teacher.login_code)}
                onSend={() => sendEmailToTeacher(teacher)}
                onMenuToggle={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(openMenuId === teacher.id ? null : teacher.id);
                }}
                onChangeRole={(role) => {
                  changeRole(teacher.id, role);
                  setOpenMenuId(null);
                }}
                onRegenerate={() => {
                  regenerateCode(teacher.id);
                  setOpenMenuId(null);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Students section ──────────────────────────────────────── */}
      <section>
        <SectionHeader title="Students" actionLabel={null} />
        {studentCount === 0 ? (
          <EmptyStudentsCard
            advancedOpen={advancedOpen}
            onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
            onAddManually={() => {
              setShowAddStudent(true);
              setStudentForm({ name: '', age: '' });
            }}
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(110px, 1fr))',
              gap: 12,
            }}
          >
            {students.map((student) => (
              <StudentTile
                key={student.id}
                student={student}
                onClick={() =>
                  router.push(
                    `/montree/admin/classrooms/${classroomId}/students/${student.id}`
                  )
                }
              />
            ))}
            <button
              onClick={() => {
                setShowAddStudent(true);
                setStudentForm({ name: '', age: '' });
              }}
              style={{
                background: 'transparent',
                border: '1.5px dashed rgba(52,211,153,0.25)',
                borderRadius: 14,
                color: T.emeraldDim,
                fontFamily: T.sans,
                fontSize: 12.5,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                minHeight: 132,
                transition: 'all 0.15s ease',
              }}
            >
              <Plus size={20} strokeWidth={1.75} />
              Add student
            </button>
          </div>
        )}
      </section>

      {/* ── Add Teacher modal ─────────────────────────────────────── */}
      {showAddTeacher && (
        <Modal
          title={newCode ? 'Login code' : t('admin.addTeacher')}
          onClose={() => {
            setShowAddTeacher(false);
            setNewCode(null);
          }}
        >
          {newCode ? (
            <CodeRevealBlock
              code={newCode}
              copied={copiedCode === newCode}
              onCopy={() => copyCode(newCode)}
              onDone={() => {
                setShowAddTeacher(false);
                setNewCode(null);
              }}
            />
          ) : (
            <AddTeacherForm
              form={teacherForm}
              setForm={setTeacherForm}
              saving={saving}
              onCancel={() => setShowAddTeacher(false)}
              onSubmit={addTeacher}
              t={t}
            />
          )}
        </Modal>
      )}

      {/* ── Add Student modal ─────────────────────────────────────── */}
      {showAddStudent && (
        <Modal
          title={t('admin.addStudent')}
          onClose={() => setShowAddStudent(false)}
        >
          <AddStudentForm
            form={studentForm}
            setForm={setStudentForm}
            saving={saving}
            onCancel={() => setShowAddStudent(false)}
            onSubmit={addStudent}
            t={t}
          />
        </Modal>
      )}

      <style jsx global>{`
        .back-link:hover {
          color: ${T.emerald} !important;
        }
        .teacher-row:hover {
          border-color: rgba(52, 211, 153, 0.32) !important;
        }
        .icon-btn:hover {
          background: rgba(52, 211, 153, 0.16) !important;
          color: ${T.emerald} !important;
        }
        .student-tile:hover {
          background: rgba(255, 255, 255, 0.10) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

// ── Subcomponents ───────────────────────────────────────────────────────

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel: string | null;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}
    >
      <h2
        style={{
          fontFamily: T.sans,
          fontSize: 17,
          fontWeight: 600,
          margin: 0,
          color: T.textPrimary,
          letterSpacing: -0.1,
        }}
      >
        {title}
      </h2>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          style={{
            background: 'transparent',
            border: '1px solid rgba(52,211,153,0.28)',
            borderRadius: 10,
            color: T.emerald,
            padding: '6px 12px',
            fontFamily: T.sans,
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            transition: 'all 0.15s ease',
          }}
        >
          <Plus size={14} strokeWidth={2} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function TeacherRow({
  teacher,
  isLead,
  copiedCode,
  menuOpen,
  onCopy,
  onSend,
  onMenuToggle,
  onChangeRole,
  onRegenerate,
}: {
  teacher: Teacher;
  isLead: boolean;
  copiedCode: string | null;
  menuOpen: boolean;
  onCopy: () => void;
  onSend: () => void;
  onMenuToggle: (e: React.MouseEvent) => void;
  onChangeRole: (role: string) => void;
  onRegenerate: () => void;
}) {
  const initial = (teacher.name || '?').trim().charAt(0).toUpperCase();
  const justCopied = !!teacher.login_code && copiedCode === teacher.login_code;
  const roleLabel = isLead
    ? 'Lead'
    : teacher.role === 'assistant_teacher'
      ? 'Assistant'
      : 'Teacher';

  return (
    <div
      data-teacher-menu
      className="teacher-row"
      style={{
        // STACKING CONTEXT TRAP: backdropFilter creates its own stacking
        // context per row, so the kebab dropdown (zIndex 10 inside this row)
        // can't paint above the NEXT row's context unless THIS row also has
        // an explicit zIndex. Bump it high when our menu is open so the
        // dropdown floats above sibling rows below.
        position: 'relative',
        zIndex: menuOpen ? 30 : 1,
        background: T.cardBg,
        backdropFilter: 'blur(14px)',
        border: isLead
          ? '1px solid rgba(52,211,153,0.32)'
          : T.cardBorder,
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        transition: 'border-color 0.18s ease',
        flexWrap: 'wrap',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: isLead
            ? 'linear-gradient(135deg, rgba(52,211,153,0.32), rgba(52,211,153,0.16))'
            : 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(52,211,153,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: T.serif,
          fontSize: 17,
          fontWeight: 500,
          color: isLead ? '#07120c' : T.textSoft,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>

      {/* Name + role + email */}
      <div style={{ flex: 1, minWidth: 160 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              color: T.textPrimary,
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: -0.1,
            }}
          >
            {teacher.name}
          </span>
          <span
            style={{
              padding: '2px 8px',
              background: isLead ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.06)',
              color: isLead ? T.emerald : T.textSecondary,
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              borderRadius: 6,
            }}
          >
            {roleLabel}
          </span>
        </div>
        {teacher.email ? (
          <div
            style={{
              fontSize: 12.5,
              color: T.textMuted,
              marginTop: 2,
              wordBreak: 'break-all',
            }}
          >
            {teacher.email}
          </div>
        ) : null}
      </div>

      {/* Login code + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {teacher.login_code ? (
          <button
            onClick={onCopy}
            title="Copy login code"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 12px',
              background: justCopied
                ? 'rgba(52,211,153,0.20)'
                : T.goldSoft,
              border: justCopied
                ? '1px solid rgba(52,211,153,0.45)'
                : '1px solid ' + T.goldSubtle,
              borderRadius: 10,
              fontFamily: T.mono,
              fontSize: 13,
              fontWeight: 600,
              color: justCopied ? T.emerald : T.goldText,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              letterSpacing: 0.6,
            }}
          >
            {justCopied ? (
              <>
                <Check size={13} strokeWidth={2.5} />
                Copied
              </>
            ) : (
              <>
                <Copy size={13} strokeWidth={2} />
                {teacher.login_code}
              </>
            )}
          </button>
        ) : (
          <span
            style={{
              padding: '6px 10px',
              fontSize: 12,
              color: T.textMuted,
              fontStyle: 'italic',
            }}
          >
            No code
          </span>
        )}

        {/* Send button — opens mailto if email; copies if no email */}
        <button
          onClick={onSend}
          disabled={!teacher.login_code}
          title={
            teacher.email
              ? `Email ${teacher.name} their login`
              : `Copy code to share with ${teacher.name}`
          }
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            background: teacher.login_code ? T.emerald : 'rgba(52,211,153,0.16)',
            border: 'none',
            borderRadius: 10,
            fontFamily: T.sans,
            fontSize: 12.5,
            fontWeight: 600,
            color: teacher.login_code ? '#07120c' : T.textMuted,
            cursor: teacher.login_code ? 'pointer' : 'not-allowed',
            transition: 'all 0.15s ease',
          }}
        >
          <Send size={13} strokeWidth={2} />
          Send
        </button>

        {/* Kebab — advanced actions */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={onMenuToggle}
            className="icon-btn"
            aria-label="More actions"
            style={{
              padding: 8,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 10,
              color: T.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <MoreVertical size={15} strokeWidth={2} />
          </button>
          {menuOpen ? (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
                minWidth: 200,
                background: T.cardBgStrong,
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(52,211,153,0.22)',
                borderRadius: 12,
                padding: 6,
                boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
                zIndex: 10,
              }}
            >
              <MenuItem
                label="Set as Lead"
                onClick={() => onChangeRole('lead_teacher')}
                disabled={teacher.role === 'lead_teacher'}
              />
              <MenuItem
                label="Set as Assistant"
                onClick={() => onChangeRole('assistant_teacher')}
                disabled={teacher.role === 'assistant_teacher'}
              />
              <MenuItem
                label="Set as Teacher"
                onClick={() => onChangeRole('teacher')}
                disabled={!teacher.role || teacher.role === 'teacher'}
              />
              <div
                style={{
                  borderTop: T.divider,
                  margin: '4px 0',
                }}
              />
              <MenuItem label="Regenerate code" onClick={onRegenerate} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  disabled = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '8px 10px',
        background: 'transparent',
        border: 'none',
        borderRadius: 8,
        color: disabled
          ? T.textMuted
          : danger
            ? T.red
            : T.textSoft,
        fontFamily: T.sans,
        fontSize: 13,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background =
            danger ? 'rgba(248,113,113,0.10)' : 'rgba(52,211,153,0.10)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

function EmptyTeachersCard({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        background: T.cardBg,
        backdropFilter: 'blur(14px)',
        border: T.cardBorder,
        borderRadius: 16,
        padding: '28px 24px',
        textAlign: 'center',
        color: T.textSecondary,
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      <p style={{ margin: 0, color: T.textPrimary, fontWeight: 500 }}>
        No teachers in this classroom yet.
      </p>
      <p style={{ margin: '6px 0 16px 0' }}>
        Add a teacher and they&rsquo;ll get a login code you can share with them.
      </p>
      <button
        onClick={onAdd}
        style={{
          padding: '9px 18px',
          background: T.emerald,
          border: 'none',
          borderRadius: 10,
          color: '#07120c',
          fontFamily: T.sans,
          fontSize: 13.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Add a teacher
      </button>
    </div>
  );
}

function EmptyStudentsCard({
  advancedOpen,
  onToggleAdvanced,
  onAddManually,
}: {
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  onAddManually: () => void;
}) {
  return (
    <div
      style={{
        background: T.cardBg,
        backdropFilter: 'blur(14px)',
        border: T.cardBorder,
        borderRadius: 16,
        padding: '24px 22px',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.65,
          color: T.textSoft,
        }}
      >
        Your teachers will add their students here once they log in.
      </p>
      <p
        style={{
          margin: '6px 0 0 0',
          fontSize: 13.5,
          color: T.textSecondary,
          lineHeight: 1.6,
        }}
      >
        Make sure each one has their login code — that&rsquo;s the unblock.
      </p>

      <button
        onClick={onToggleAdvanced}
        style={{
          marginTop: 18,
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: T.textMuted,
          fontFamily: T.sans,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          letterSpacing: 0.4,
        }}
      >
        {advancedOpen ? (
          <ChevronDown size={13} strokeWidth={2} />
        ) : (
          <ChevronRight size={13} strokeWidth={2} />
        )}
        Advanced setup
      </button>

      {advancedOpen ? (
        <div
          style={{
            marginTop: 12,
            padding: '12px 14px',
            background: 'rgba(0,0,0,0.18)',
            border: '1px solid rgba(52,211,153,0.10)',
            borderRadius: 10,
          }}
        >
          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: 12.5,
              color: T.textMuted,
              lineHeight: 1.55,
            }}
          >
            For most schools, teachers add their own students. These options are
            here for centralized data entry workflows.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={onAddManually}
              style={{
                padding: '7px 12px',
                background: 'transparent',
                border: '1px solid rgba(52,211,153,0.28)',
                borderRadius: 8,
                color: T.emeraldDim,
                fontFamily: T.sans,
                fontSize: 12.5,
                cursor: 'pointer',
              }}
            >
              Add a student manually
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StudentTile({
  student,
  onClick,
}: {
  student: Student;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="student-tile"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: T.cardBorder,
        borderRadius: 14,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background:
            'linear-gradient(135deg, rgba(52,211,153,0.30), rgba(20,184,166,0.30))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {student.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={student.photo_url}
            alt={student.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span
            style={{
              fontFamily: T.serif,
              fontSize: 22,
              fontWeight: 500,
              color: '#07120c',
            }}
          >
            {(student.name || '?').charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: T.textSoft,
          textAlign: 'center',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {(student.name || '').split(' ')[0]}
      </span>
      {student.age != null ? (
        <span
          style={{
            fontSize: 11,
            color: T.emeraldDim,
            letterSpacing: 0.4,
          }}
        >
          {student.age}y
        </span>
      ) : null}
    </button>
  );
}

// ── Modal + form helpers ────────────────────────────────────────────────

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.60)',
        backdropFilter: 'blur(6px)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cardBgStrong,
          backdropFilter: 'blur(22px)',
          border: T.cardBorder,
          borderRadius: 18,
          padding: '24px 22px',
          width: '100%',
          maxWidth: 440,
          color: T.textSoft,
          fontFamily: T.sans,
        }}
      >
        <h3
          style={{
            margin: '0 0 18px 0',
            fontFamily: T.serif,
            fontSize: 20,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

function CodeRevealBlock({
  code,
  copied,
  onCopy,
  onDone,
}: {
  code: string;
  copied: boolean;
  onCopy: () => void;
  onDone: () => void;
}) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p
        style={{
          margin: '0 0 18px 0',
          fontSize: 13.5,
          color: T.textSecondary,
          lineHeight: 1.55,
        }}
      >
        Share this code with the teacher so they can log in.
      </p>
      <div
        style={{
          padding: '20px 18px',
          background: T.goldSoft,
          border: '1px solid ' + T.goldSubtle,
          borderRadius: 14,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 28,
            fontWeight: 600,
            color: T.goldText,
            letterSpacing: 4,
            marginBottom: 10,
          }}
        >
          {code}
        </div>
        <button
          onClick={onCopy}
          style={{
            padding: '8px 16px',
            background: copied ? T.emerald : 'rgba(255,255,255,0.06)',
            color: copied ? '#07120c' : T.textSoft,
            border: '1px solid rgba(52,211,153,0.20)',
            borderRadius: 9,
            fontFamily: T.sans,
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {copied ? (
            <>
              <Check size={13} strokeWidth={2.5} />
              Copied
            </>
          ) : (
            <>
              <Copy size={13} strokeWidth={2} />
              Copy code
            </>
          )}
        </button>
      </div>
      <button
        onClick={onDone}
        style={{
          width: '100%',
          padding: '11px',
          background: T.emerald,
          color: '#07120c',
          border: 'none',
          borderRadius: 10,
          fontFamily: T.sans,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Done
      </button>
    </div>
  );
}

function AddTeacherForm({
  form,
  setForm,
  saving,
  onCancel,
  onSubmit,
  t,
}: {
  form: { name: string; email: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; email: string }>>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <>
      <FormField
        label={t('admin.nameRequired')}
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        placeholder="Ms. Sarah"
      />
      <FormField
        label={t('admin.emailOptional')}
        value={form.email}
        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
        placeholder="teacher@school.com"
        type="email"
      />
      <FormButtons
        cancelLabel={t('admin.cancel')}
        submitLabel={saving ? t('admin.creating') : t('admin.create')}
        submitDisabled={saving || !form.name.trim()}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </>
  );
}

function AddStudentForm({
  form,
  setForm,
  saving,
  onCancel,
  onSubmit,
  t,
}: {
  form: { name: string; age: string };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; age: string }>>;
  saving: boolean;
  onCancel: () => void;
  onSubmit: () => void;
  t: ReturnType<typeof useI18n>['t'];
}) {
  return (
    <>
      <FormField
        label={t('admin.nameRequired')}
        value={form.name}
        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
        placeholder="Student name"
      />
      <FormField
        label={t('admin.ageOptional')}
        value={form.age}
        onChange={(v) => setForm((f) => ({ ...f, age: v }))}
        placeholder="e.g. 3.5"
        type="number"
      />
      <FormButtons
        cancelLabel={t('admin.cancel')}
        submitLabel={saving ? t('admin.adding') : t('admin.add')}
        submitDisabled={saving || !form.name.trim()}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 12,
          fontWeight: 500,
          color: T.emeraldDim,
          marginBottom: 6,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={type === 'number' ? '0.5' : undefined}
        min={type === 'number' ? '2' : undefined}
        max={type === 'number' ? '7' : undefined}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'rgba(0,0,0,0.30)',
          border: '1px solid rgba(52,211,153,0.22)',
          borderRadius: 10,
          color: T.textSoft,
          fontFamily: T.sans,
          fontSize: 14,
          outline: 'none',
        }}
      />
    </div>
  );
}

function FormButtons({
  cancelLabel,
  submitLabel,
  submitDisabled,
  onCancel,
  onSubmit,
}: {
  cancelLabel: string;
  submitLabel: string;
  submitDisabled: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
      <button
        onClick={onCancel}
        style={{
          flex: 1,
          padding: '11px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 10,
          color: T.textSoft,
          fontFamily: T.sans,
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onSubmit}
        disabled={submitDisabled}
        style={{
          flex: 1,
          padding: '11px',
          background: submitDisabled
            ? 'rgba(52,211,153,0.18)'
            : T.emerald,
          color: submitDisabled ? T.textMuted : '#07120c',
          border: 'none',
          borderRadius: 10,
          fontFamily: T.sans,
          fontSize: 14,
          fontWeight: 600,
          cursor: submitDisabled ? 'default' : 'pointer',
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
