// /montree/admin/communication/page.tsx
// Session 97 — Communication hub. Replaces the old People hub.
//
// Tabs:
//   By Classroom — default. Classroom dropdown → teachers + parents in two columns.
//   All Teachers — flat school roster.
//   All Parents — flat school roster grouped by classroom.
//   Custom Groups — principal-defined mixed groups.
//   Inbox — thread list (most recent first).
//
// Principal-as-overseer mental model: foreground compose-to-many for routine
// announcements; foreground inbox for active threads; tuck "create custom
// group" behind progressive disclosure.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Send,
  MessageSquare,
  Plus,
  GraduationCap,
  Heart,
  Search,
  X,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

// Session 140 (P4): un-onboarded parents carry a synthetic placeholder email
// ("pending-<uuid>@parent.montree.local"). Don't surface that raw token as a
// row subtitle — show "Pending invite" instead. Real emails pass through.
function contactSubtitle(email: string | null | undefined): string {
  if (email && /^pending-[0-9a-f-]+@parent\.montree\.local$/i.test(email)) {
    return 'Pending invite';
  }
  return email || '';
}

// Session 125 rule #149: TFn must be ReturnType<typeof useI18n>['t'] —
// never a loose (key: string) => string (contravariance error).
type TFn = ReturnType<typeof useI18n>['t'];

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  inputBg: 'rgba(0,0,0,0.30)',
};

type TabId = 'by_classroom' | 'all_teachers' | 'all_parents' | 'groups' | 'inbox';

interface DirectoryClassroom {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  teachers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    login_code: string | null;
  }>;
  parents: Array<{
    id: string;
    name: string;
    email: string;
    child_ids: string[];
  }>;
  child_count: number;
}

interface DirectoryTeacher {
  id: string;
  name: string;
  email: string;
  classroom_id: string | null;
  role: string;
}

interface DirectoryParent {
  id: string;
  name: string;
  email: string;
  child_ids: string[];
  classroom_ids: string[];
}

interface Directory {
  classrooms: DirectoryClassroom[];
  all_teachers: DirectoryTeacher[];
  all_parents: DirectoryParent[];
}

interface ThreadListItem {
  id: string;
  thread_type: string;
  subject: string | null;
  classroom_id: string | null;
  child_id: string | null;
  last_message_at: string;
  last_snippet: string | null;
  last_sender_name: string | null;
  last_sender_role: string | null;
  unread_for_me: number;
  participants: Array<{ role: string; id: string; name: string | null; is_observer: boolean; is_primary: boolean }>;
}

interface MessageGroup {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  members: Array<{ role: string; id: string; name: string | null }>;
}

export default function CommunicationPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = useState<TabId>('by_classroom');
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [groups, setGroups] = useState<MessageGroup[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState<null | {
    title: string;
    recipients: Array<{ role: 'teacher' | 'parent' | 'principal'; id: string; name: string }>;
    scope?: 'all_teachers' | 'all_parents' | 'classroom_teachers' | 'classroom_parents' | 'group';
    classroomId?: string;
    groupId?: string;
    threadType?: 'parent_teacher' | 'internal';
    childId?: string;
  }>(null);
  const [groupBuilderOpen, setGroupBuilderOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void loadEverything();
  }, []);

  async function loadEverything() {
    try {
      const [dirRes, threadsRes, groupsRes] = await Promise.all([
        fetch('/api/montree/admin/communication/directory', { credentials: 'include' }),
        fetch('/api/montree/messages/threads', { credentials: 'include' }),
        fetch('/api/montree/messages/groups', { credentials: 'include' }),
      ]);
      if (dirRes.ok) {
        const d = await dirRes.json();
        setDirectory(d);
        if (d.classrooms?.length) setSelectedClassroomId(d.classrooms[0].id);
      }
      if (threadsRes.ok) {
        const t = await threadsRes.json();
        setThreads(t.threads || []);
      }
      if (groupsRes.ok) {
        const g = await groupsRes.json();
        setGroups(g.groups || []);
      }
    } catch (err) {
      console.error('Load communication hub:', err);
    }
  }

  const selectedClassroom = useMemo(
    () => directory?.classrooms.find((c) => c.id === selectedClassroomId) || null,
    [directory, selectedClassroomId]
  );

  const totalUnread = threads.reduce((acc, t) => acc + (t.unread_for_me || 0), 0);

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      <header style={{ marginBottom: 26 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 500,
            letterSpacing: -0.4,
            margin: 0,
          }}
        >
          {t('comm.title')}
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 14, marginTop: 8, margin: '8px 0 0 0' }}>
          {t('comm.subtitle')}
        </p>
      </header>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          marginBottom: 22,
          borderBottom: T.cardBorder,
          paddingBottom: 0,
          overflowX: 'auto',
        }}
      >
        {([
          { id: 'by_classroom', label: t('comm.tab.byClassroom'), icon: GraduationCap },
          { id: 'all_teachers', label: t('comm.tab.allTeachers'), icon: Users },
          { id: 'all_parents', label: t('comm.tab.allParents'), icon: Heart },
          { id: 'groups', label: t('comm.tab.groups'), icon: Sparkles },
          {
            id: 'inbox',
            label: totalUnread
              ? `${t('comm.tab.inbox')} (${totalUnread})`
              : t('comm.tab.inbox'),
            icon: MessageSquare,
          },
        ] as Array<{ id: TabId; label: string; icon: typeof Users }>).map((tabItem) => {
          const Icon = tabItem.icon;
          const active = tab === tabItem.id;
          return (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: active
                  ? `2px solid ${T.emerald}`
                  : '2px solid transparent',
                color: active ? T.emerald : T.textSecondary,
                fontFamily: T.sans,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} strokeWidth={1.75} />
              {tabItem.label}
            </button>
          );
        })}
      </div>

      {/* By Classroom */}
      {tab === 'by_classroom' && directory && (
        <ByClassroomView
          directory={directory}
          selectedClassroomId={selectedClassroomId}
          onSelectClassroom={setSelectedClassroomId}
          selectedClassroom={selectedClassroom}
          onOpenCompose={(payload) => setComposeOpen(payload)}
        />
      )}

      {/* All Teachers */}
      {tab === 'all_teachers' && directory && (
        <AllTeachersView
          directory={directory}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          onComposeAll={() =>
            setComposeOpen({
              title: t('comm.compose.allTeachers'),
              recipients: directory.all_teachers.map((tch) => ({
                role: 'teacher',
                id: tch.id,
                name: tch.name,
              })),
              scope: 'all_teachers',
            })
          }
          onComposeOne={(teacher) =>
            setComposeOpen({
              title: t('comm.compose.person', { name: teacher.name }),
              recipients: [{ role: 'teacher', id: teacher.id, name: teacher.name }],
              threadType: 'internal',
            })
          }
        />
      )}

      {/* All Parents */}
      {tab === 'all_parents' && directory && (
        <AllParentsView
          directory={directory}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          onComposeAll={() =>
            setComposeOpen({
              title: t('comm.compose.allParents'),
              recipients: directory.all_parents.map((p) => ({
                role: 'parent',
                id: p.id,
                name: p.name,
              })),
              scope: 'all_parents',
            })
          }
          onComposeOne={(p) =>
            setComposeOpen({
              title: t('comm.compose.person', { name: p.name }),
              recipients: [{ role: 'parent', id: p.id, name: p.name }],
              threadType: 'parent_principal',
            })
          }
        />
      )}

      {/* Custom Groups */}
      {tab === 'groups' && (
        <GroupsView
          groups={groups}
          onCreate={() => setGroupBuilderOpen(true)}
          onComposeGroup={(g) =>
            setComposeOpen({
              title: t('comm.compose.group', { name: g.name }),
              recipients: g.members.map((m) => ({
                role: m.role as 'teacher' | 'parent' | 'principal',
                id: m.id,
                name: m.name || '',
              })),
              scope: 'group',
              groupId: g.id,
            })
          }
        />
      )}

      {/* Inbox */}
      {tab === 'inbox' && (
        <InboxView threads={threads} onOpen={(id) => router.push(`/montree/admin/communication/threads/${id}`)} />
      )}

      {/* Compose modal */}
      {composeOpen && (
        <ComposeModal
          {...composeOpen}
          onClose={() => setComposeOpen(null)}
          onSent={(threadId) => {
            setComposeOpen(null);
            void loadEverything();
            if (threadId) router.push(`/montree/admin/communication/threads/${threadId}`);
          }}
        />
      )}

      {/* Group builder modal */}
      {groupBuilderOpen && directory && (
        <GroupBuilderModal
          directory={directory}
          onClose={() => setGroupBuilderOpen(false)}
          onCreated={() => {
            setGroupBuilderOpen(false);
            void loadEverything();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────────────

function ByClassroomView({
  directory,
  selectedClassroomId,
  onSelectClassroom,
  selectedClassroom,
  onOpenCompose,
}: {
  directory: Directory;
  selectedClassroomId: string | null;
  onSelectClassroom: (id: string) => void;
  selectedClassroom: DirectoryClassroom | null;
  onOpenCompose: (payload: {
    title: string;
    recipients: Array<{ role: 'teacher' | 'parent' | 'principal'; id: string; name: string }>;
    scope?: 'all_teachers' | 'all_parents' | 'classroom_teachers' | 'classroom_parents' | 'group';
    classroomId?: string;
    groupId?: string;
    threadType?: 'parent_teacher' | 'internal';
    childId?: string;
  }) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      {/* Classroom selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {directory.classrooms.map((c) => {
          const active = c.id === selectedClassroomId;
          return (
            <button
              key={c.id}
              onClick={() => onSelectClassroom(c.id)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                background: active ? T.emerald : T.cardBg,
                color: active ? '#0a1a0f' : T.textSecondary,
                border: active ? 'none' : T.cardBorder,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {c.name}
              <span style={{ marginLeft: 8, opacity: 0.7 }}>
                {t('comm.classroomPill', { teachers: c.teachers.length, parents: c.parents.length })}
              </span>
            </button>
          );
        })}
      </div>

      {selectedClassroom && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {/* Teachers column */}
          <div
            style={{
              background: T.cardBg,
              border: T.cardBorder,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {t('comm.teachersCount', { count: selectedClassroom.teachers.length })}
              </h3>
              <button
                onClick={() =>
                  onOpenCompose({
                    title: t('comm.compose.classroomTeachers', { classroom: selectedClassroom.name }),
                    recipients: selectedClassroom.teachers.map((teacher) => ({
                      role: 'teacher',
                      id: teacher.id,
                      name: teacher.name,
                    })),
                    scope: 'classroom_teachers',
                    classroomId: selectedClassroom.id,
                  })
                }
                disabled={!selectedClassroom.teachers.length}
                style={{
                  padding: '6px 10px',
                  background: selectedClassroom.teachers.length ? T.emeraldSoft : 'transparent',
                  color: T.emerald,
                  border: T.cardBorder,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: selectedClassroom.teachers.length ? 'pointer' : 'not-allowed',
                  opacity: selectedClassroom.teachers.length ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Send size={12} strokeWidth={1.75} />
                {t('comm.messageAll')}
              </button>
            </div>
            {selectedClassroom.teachers.length === 0 ? (
              <p style={{ color: T.textMuted, fontSize: 13 }}>
                {t('comm.noTeachersYet', { classroom: selectedClassroom.name })}
              </p>
            ) : (
              selectedClassroom.teachers.map((teacher) => (
                <PersonRow
                  key={teacher.id}
                  initial={(teacher.name || 'T').charAt(0).toUpperCase()}
                  name={teacher.name}
                  subtitle={teacher.email}
                  badge={teacher.role === 'lead_teacher' ? t('comm.badgeLead') : null}
                  onMessage={() =>
                    onOpenCompose({
                      title: t('comm.compose.person', { name: teacher.name }),
                      recipients: [{ role: 'teacher', id: teacher.id, name: teacher.name }],
                      threadType: 'internal',
                    })
                  }
                />
              ))
            )}
          </div>

          {/* Parents column */}
          <div
            style={{
              background: T.cardBg,
              border: T.cardBorder,
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                {t('comm.parentsCount', { count: selectedClassroom.parents.length })}
              </h3>
              <button
                onClick={() =>
                  onOpenCompose({
                    title: t('comm.compose.classroomParents', { classroom: selectedClassroom.name }),
                    recipients: selectedClassroom.parents.map((p) => ({
                      role: 'parent',
                      id: p.id,
                      name: p.name,
                    })),
                    scope: 'classroom_parents',
                    classroomId: selectedClassroom.id,
                  })
                }
                disabled={!selectedClassroom.parents.length}
                style={{
                  padding: '6px 10px',
                  background: selectedClassroom.parents.length ? T.emeraldSoft : 'transparent',
                  color: T.emerald,
                  border: T.cardBorder,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: selectedClassroom.parents.length ? 'pointer' : 'not-allowed',
                  opacity: selectedClassroom.parents.length ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Send size={12} strokeWidth={1.75} />
                {t('comm.messageAll')}
              </button>
            </div>
            {selectedClassroom.parents.length === 0 ? (
              <p style={{ color: T.textMuted, fontSize: 13 }}>
                {t('comm.noParentsYet')}
              </p>
            ) : (
              selectedClassroom.parents.map((p) => (
                <PersonRow
                  key={p.id}
                  initial={(p.name || 'P').charAt(0).toUpperCase()}
                  name={p.name}
                  subtitle={contactSubtitle(p.email)}
                  badge={null}
                  onMessage={() =>
                    onOpenCompose({
                      title: t('comm.compose.person', { name: p.name }),
                      recipients: [{ role: 'parent', id: p.id, name: p.name }],
                      threadType: 'parent_principal',
                    })
                  }
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AllTeachersView({
  directory,
  searchTerm,
  onSearch,
  onComposeAll,
  onComposeOne,
}: {
  directory: Directory;
  searchTerm: string;
  onSearch: (s: string) => void;
  onComposeAll: () => void;
  onComposeOne: (t: DirectoryTeacher) => void;
}) {
  const { t } = useI18n();
  const filtered = directory.all_teachers.filter((teacher) =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div>
      <RosterControls
        searchTerm={searchTerm}
        onSearch={onSearch}
        onComposeAll={onComposeAll}
        composeAllLabel={t('comm.composeAllTeachers', { count: directory.all_teachers.length })}
      />
      <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: 16, padding: 12 }}>
        {filtered.length === 0 ? (
          <p style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>
            {t('comm.noTeachersMatch')}
          </p>
        ) : (
          filtered.map((teacher) => (
            <PersonRow
              key={teacher.id}
              initial={(teacher.name || 'T').charAt(0).toUpperCase()}
              name={teacher.name}
              subtitle={teacher.email}
              badge={teacher.role === 'lead_teacher' ? t('comm.badgeLead') : null}
              onMessage={() => onComposeOne(teacher)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function AllParentsView({
  directory,
  searchTerm,
  onSearch,
  onComposeAll,
  onComposeOne,
}: {
  directory: Directory;
  searchTerm: string;
  onSearch: (s: string) => void;
  onComposeAll: () => void;
  onComposeOne: (p: DirectoryParent) => void;
}) {
  const { t } = useI18n();
  const filtered = directory.all_parents.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <div>
      <RosterControls
        searchTerm={searchTerm}
        onSearch={onSearch}
        onComposeAll={onComposeAll}
        composeAllLabel={t('comm.composeAllParents', { count: directory.all_parents.length })}
      />
      <div style={{ background: T.cardBg, border: T.cardBorder, borderRadius: 16, padding: 12 }}>
        {filtered.length === 0 ? (
          <p style={{ color: T.textMuted, fontSize: 13, textAlign: 'center', padding: 20 }}>
            {t('comm.noParentsMatch')}
          </p>
        ) : (
          filtered.map((p) => (
            <PersonRow
              key={p.id}
              initial={(p.name || 'P').charAt(0).toUpperCase()}
              name={p.name}
              subtitle={contactSubtitle(p.email)}
              badge={null}
              onMessage={() => onComposeOne(p)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function GroupsView({
  groups,
  onCreate,
  onComposeGroup,
}: {
  groups: MessageGroup[];
  onCreate: () => void;
  onComposeGroup: (g: MessageGroup) => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ color: T.textSecondary, fontSize: 13, margin: 0 }}>
          {t('comm.groups.intro')}
        </p>
        <button
          onClick={onCreate}
          style={{
            padding: '8px 14px',
            background: T.emerald,
            color: '#0a1a0f',
            border: 'none',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} strokeWidth={2.25} />
          {t('comm.groups.newGroup')}
        </button>
      </div>
      {groups.length === 0 ? (
        <div
          style={{
            background: T.cardBg,
            border: T.cardBorder,
            borderRadius: 16,
            padding: 30,
            textAlign: 'center',
          }}
        >
          <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
            {t('comm.groups.empty')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                background: T.cardBg,
                border: T.cardBorder,
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 500 }}>{g.name}</div>
                {g.description && (
                  <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4 }}>{g.description}</div>
                )}
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary }}>{t('comm.groups.members', { count: g.member_count })}</div>
              <button
                onClick={() => onComposeGroup(g)}
                style={{
                  padding: '8px 12px',
                  background: T.emeraldSoft,
                  color: T.emerald,
                  border: T.cardBorder,
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <Send size={12} strokeWidth={1.75} />
                {t('comm.groups.messageGroup')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InboxView({
  threads,
  onOpen,
}: {
  threads: ThreadListItem[];
  onOpen: (id: string) => void;
}) {
  const { t } = useI18n();
  if (threads.length === 0) {
    return (
      <div
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: 16,
          padding: 30,
          textAlign: 'center',
        }}
      >
        <p style={{ color: T.textMuted, fontSize: 14, margin: 0 }}>
          {t('comm.inbox.empty')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {threads.map((thread) => (
        <button
          key={thread.id}
          onClick={() => onOpen(thread.id)}
          style={{
            background: thread.unread_for_me > 0 ? T.cardBgStrong : T.cardBg,
            border: thread.unread_for_me > 0 ? '1px solid rgba(52,211,153,0.45)' : T.cardBorder,
            borderRadius: 12,
            padding: 14,
            textAlign: 'left',
            cursor: 'pointer',
            color: T.textPrimary,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: T.emerald,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                  }}
                >
                  {threadTypeLabel(thread.thread_type, t)}
                </span>
                {thread.unread_for_me > 0 && (
                  <span
                    style={{
                      background: T.emerald,
                      color: '#0a1a0f',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {t('comm.inbox.unreadNew', { count: thread.unread_for_me })}
                  </span>
                )}
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 500, marginBottom: 4 }}>
                {thread.subject || t('comm.inbox.noSubject')}
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {thread.last_sender_name && <span style={{ color: T.emeraldDim }}>{thread.last_sender_name}: </span>}
                {thread.last_snippet || t('comm.inbox.noMessages')}
              </div>
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, whiteSpace: 'nowrap' }}>
              {formatRelativeDate(thread.last_message_at, t)}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────

function PersonRow({
  initial,
  name,
  subtitle,
  badge,
  onMessage,
}: {
  initial: string;
  name: string;
  subtitle: string;
  badge: string | null;
  onMessage: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          background: 'linear-gradient(135deg, rgba(52,211,153,0.45), rgba(20,184,166,0.45))',
          color: T.textPrimary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
          {name}
          {badge && (
            <span
              style={{
                background: 'rgba(232,201,106,0.18)',
                color: T.gold,
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 999,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: T.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {subtitle}
          </div>
        )}
      </div>
      <button
        onClick={onMessage}
        style={{
          padding: '6px 12px',
          background: 'transparent',
          color: T.emerald,
          border: T.cardBorder,
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <Send size={12} strokeWidth={1.75} />
        {t('comm.message')}
      </button>
    </div>
  );
}

function RosterControls({
  searchTerm,
  onSearch,
  onComposeAll,
  composeAllLabel,
}: {
  searchTerm: string;
  onSearch: (s: string) => void;
  onComposeAll: () => void;
  composeAllLabel: string;
}) {
  const { t } = useI18n();
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
        <Search
          size={14}
          strokeWidth={1.75}
          style={{ position: 'absolute', top: 12, left: 12, color: T.textMuted }}
        />
        <input
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('comm.searchPlaceholder')}
          style={{
            width: '100%',
            padding: '10px 12px 10px 34px',
            background: T.inputBg,
            border: T.cardBorder,
            borderRadius: 10,
            color: T.textPrimary,
            fontFamily: T.sans,
            fontSize: 13,
            outline: 'none',
          }}
        />
      </div>
      <button
        onClick={onComposeAll}
        style={{
          padding: '10px 14px',
          background: T.emerald,
          color: '#0a1a0f',
          border: 'none',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Send size={14} strokeWidth={1.75} />
        {composeAllLabel}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Compose modal
// ─────────────────────────────────────────────────────────────────

function ComposeModal({
  title,
  recipients,
  scope,
  classroomId,
  groupId,
  threadType,
  childId,
  onClose,
  onSent,
}: {
  title: string;
  recipients: Array<{ role: 'teacher' | 'parent' | 'principal'; id: string; name: string }>;
  scope?: 'all_teachers' | 'all_parents' | 'classroom_teachers' | 'classroom_parents' | 'group';
  classroomId?: string;
  groupId?: string;
  threadType?: 'parent_teacher' | 'internal';
  childId?: string;
  onClose: () => void;
  onSent: (threadId?: string) => void;
}) {
  const { t } = useI18n();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isBroadcast = !!scope;
  const isSingleRecipient = recipients.length === 1;

  async function send() {
    setSending(true);
    setError(null);
    try {
      if (isBroadcast) {
        const scopeBody =
          scope === 'all_teachers'
            ? { kind: 'all_teachers' }
            : scope === 'all_parents'
              ? { kind: 'all_parents' }
              : scope === 'classroom_teachers'
                ? { kind: 'classroom_teachers', classroom_id: classroomId }
                : scope === 'classroom_parents'
                  ? { kind: 'classroom_parents', classroom_id: classroomId }
                  : { kind: 'group', group_id: groupId };
        const res = await fetch('/api/montree/messages/broadcast', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scope: scopeBody,
            subject: subject || undefined,
            body: message,
            allow_replies: false,
          }),
        });
        if (!res.ok) throw new Error((await res.json())?.error || t('comm.error.sendFailed'));
        const data = await res.json();
        onSent(data.thread_id);
        return;
      }

      // 1:1 thread — create thread + post message in two calls.
      const tt = threadType || (recipients[0].role === 'parent' ? 'parent_principal' : 'internal');
      const threadRes = await fetch('/api/montree/messages/threads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_type: tt,
          subject: subject || null,
          classroom_id: classroomId || null,
          child_id: childId || null,
          participants: recipients.map((r) => ({ role: r.role, id: r.id })),
        }),
      });
      if (!threadRes.ok) throw new Error((await threadRes.json())?.error || t('comm.error.createThread'));
      const { thread_id } = await threadRes.json();

      const msgRes = await fetch(`/api/montree/messages/threads/${thread_id}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: message }),
      });
      if (!msgRes.ok) throw new Error((await msgRes.json())?.error || t('comm.error.sendMessage'));
      onSent(thread_id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('comm.error.sendFailed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* Session 103: restructured into sticky-header / scroll-body / sticky-footer
          so the Send button is always visible regardless of viewport height. */}
      <div
        style={{
          background: '#0a1a0f',
          border: T.cardBorder,
          borderRadius: 16,
          width: '100%',
          maxWidth: 540,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Sticky header */}
        <div
          style={{
            padding: '20px 24px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#0a1a0f',
          }}
        >
          <h2 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 500, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 24px',
          }}
        >
          {!isSingleRecipient && (
            <div style={{ marginBottom: 14, padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: T.emeraldDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                {t('comm.modal.recipients', { count: recipients.length })}
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary, maxHeight: 80, overflow: 'auto' }}>
                {recipients
                  .slice(0, 12)
                  .map((r) => r.name)
                  .filter(Boolean)
                  .join(', ')}
                {recipients.length > 12 ? t('comm.modal.andMore', { count: recipients.length - 12 }) : ''}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 11, color: T.emeraldDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('comm.modal.subjectLabel')}
            </label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('comm.modal.subjectPlaceholder')}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: T.inputBg,
                border: T.cardBorder,
                borderRadius: 10,
                color: T.textPrimary,
                fontFamily: T.sans,
                fontSize: 14,
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: T.emeraldDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {t('comm.modal.messageLabel')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('comm.modal.messagePlaceholder')}
              rows={6}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: T.inputBg,
                border: T.cardBorder,
                borderRadius: 10,
                color: T.textPrimary,
                fontFamily: T.sans,
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
                minHeight: 140,
              }}
            />
          </div>

          {error && <div style={{ color: '#f87171', fontSize: 12, marginTop: 12 }}>{error}</div>}
        </div>

        {/* Sticky footer — always visible */}
        <div
          style={{
            padding: '12px 24px 20px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: '#0a1a0f',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            disabled={sending}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: T.cardBorder,
              borderRadius: 999,
              color: T.textSecondary,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => void send()}
            disabled={sending || !message.trim()}
            style={{
              padding: '10px 18px',
              background: T.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              cursor: sending || !message.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !message.trim() ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Send size={14} strokeWidth={1.75} />
            {sending ? t('comm.modal.sending') : t('comm.modal.send')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Group builder modal
// ─────────────────────────────────────────────────────────────────

function GroupBuilderModal({
  directory,
  onClose,
  onCreated,
}: {
  directory: Directory;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole] = useState<'all' | 'teachers' | 'parents'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(role: 'teacher' | 'parent', id: string) {
    const k = `${role}:${id}`;
    const next = new Set(picked);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setPicked(next);
  }

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const teachers =
      filterRole === 'parents'
        ? []
        : directory.all_teachers.filter(
            (teacher) =>
              teacher.name.toLowerCase().includes(term) ||
              (teacher.email || '').toLowerCase().includes(term)
          );
    const parents =
      filterRole === 'teachers'
        ? []
        : directory.all_parents.filter(
            (p) =>
              p.name.toLowerCase().includes(term) ||
              (p.email || '').toLowerCase().includes(term)
          );
    return { teachers, parents };
  }, [directory, filterRole, searchTerm]);

  async function save() {
    if (!name.trim()) {
      setError(t('comm.error.nameRequired'));
      return;
    }
    if (picked.size === 0) {
      setError(t('comm.error.addMember'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const members = Array.from(picked).map((k) => {
        const [role, id] = k.split(':');
        return { role: role as 'teacher' | 'parent', id };
      });
      const res = await fetch('/api/montree/messages/groups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          members,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || t('comm.error.groupFailed'));
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('comm.error.groupFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#0a1a0f',
          border: T.cardBorder,
          borderRadius: 16,
          padding: 22,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 500, margin: 0 }}>{t('comm.groupBuilder.title')}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: T.textMuted, cursor: 'pointer' }}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('comm.groupBuilder.namePlaceholder')}
            style={{
              padding: '10px 12px',
              background: T.inputBg,
              border: T.cardBorder,
              borderRadius: 10,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 13,
              outline: 'none',
            }}
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('comm.groupBuilder.descPlaceholder')}
            style={{
              padding: '10px 12px',
              background: T.inputBg,
              border: T.cardBorder,
              borderRadius: 10,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 13,
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['all', 'teachers', 'parents'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              style={{
                padding: '6px 12px',
                background: filterRole === r ? T.emerald : T.cardBg,
                color: filterRole === r ? '#0a1a0f' : T.textSecondary,
                border: filterRole === r ? 'none' : T.cardBorder,
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {r === 'all'
                ? t('common.all')
                : r === 'teachers'
                  ? t('comm.groupBuilder.teachers')
                  : t('comm.groupBuilder.parents')}
            </button>
          ))}
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('comm.groupBuilder.searchPlaceholder')}
            style={{
              flex: 1,
              padding: '6px 10px',
              background: T.inputBg,
              border: T.cardBorder,
              borderRadius: 10,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>

        <div
          style={{
            background: T.cardBg,
            border: T.cardBorder,
            borderRadius: 12,
            padding: 8,
            flex: 1,
            overflow: 'auto',
            marginBottom: 12,
          }}
        >
          {filtered.teachers.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: T.emeraldDim, textTransform: 'uppercase', letterSpacing: 1, padding: '6px 8px' }}>
                {t('comm.groupBuilder.teachers')}
              </div>
              {filtered.teachers.map((teacher) => (
                <PickRow
                  key={`t:${teacher.id}`}
                  picked={picked.has(`teacher:${teacher.id}`)}
                  onToggle={() => toggle('teacher', teacher.id)}
                  name={teacher.name}
                  subtitle={teacher.email}
                />
              ))}
            </div>
          )}
          {filtered.parents.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: T.emeraldDim, textTransform: 'uppercase', letterSpacing: 1, padding: '6px 8px' }}>
                {t('comm.groupBuilder.parents')}
              </div>
              {filtered.parents.map((p) => (
                <PickRow
                  key={`p:${p.id}`}
                  picked={picked.has(`parent:${p.id}`)}
                  onToggle={() => toggle('parent', p.id)}
                  name={p.name}
                  subtitle={contactSubtitle(p.email)}
                />
              ))}
            </div>
          )}
        </div>

        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.textMuted }}>{t('comm.groupBuilder.selected', { count: picked.size })}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: T.cardBorder,
                borderRadius: 999,
                color: T.textSecondary,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => void save()}
              disabled={saving || !name.trim() || picked.size === 0}
              style={{
                padding: '10px 18px',
                background: T.emerald,
                color: '#0a1a0f',
                border: 'none',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                cursor: saving || !name.trim() || picked.size === 0 ? 'not-allowed' : 'pointer',
                opacity: saving || !name.trim() || picked.size === 0 ? 0.5 : 1,
              }}
            >
              {saving ? t('comm.groupBuilder.saving') : t('comm.groupBuilder.create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PickRow({
  picked,
  onToggle,
  name,
  subtitle,
}: {
  picked: boolean;
  onToggle: () => void;
  name: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: picked ? 'rgba(52,211,153,0.12)' : 'transparent',
        border: '1px solid transparent',
        borderRadius: 8,
        color: T.textPrimary,
        fontFamily: T.sans,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: picked ? T.emerald : 'transparent',
          border: picked ? `1px solid ${T.emerald}` : '1px solid rgba(255,255,255,0.25)',
          color: '#0a1a0f',
          fontSize: 11,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {picked ? '✓' : ''}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
        {subtitle && <div style={{ fontSize: 11, color: T.textMuted }}>{subtitle}</div>}
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────

function threadTypeLabel(threadType: string, t: TFn): string {
  switch (threadType) {
    case 'parent_teacher':
      return t('comm.threadType.parentTeacher');
    case 'parent_principal':
      return t('comm.threadType.parentPrincipal');
    case 'internal':
      return t('comm.threadType.internal');
    case 'broadcast':
      return t('comm.threadType.broadcast');
    case 'group':
      return t('comm.threadType.group');
    default:
      return threadType;
  }
}

function formatRelativeDate(iso: string, t: TFn): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return t('comm.time.justNow');
  if (min < 60) return t('comm.time.minutes', { count: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t('comm.time.hours', { count: h });
  const dd = Math.floor(h / 24);
  if (dd < 7) return t('comm.time.days', { count: dd });
  return d.toLocaleDateString();
}
