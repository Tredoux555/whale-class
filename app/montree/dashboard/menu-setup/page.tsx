// /montree/dashboard/menu-setup/page.tsx
// Menu Setup — let teachers toggle which menu items appear in their school's menu
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useFeatures } from '@/hooks/useFeatures';
import {
  FileText, Target, Search, Sparkles, BookOpen, LayoutGrid,
  Images, FolderOpen, TrendingUp, Users, BarChart2, CalendarDays,
  Settings2, ChevronLeft, type LucideIcon,
} from 'lucide-react';

interface MenuItem {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultOn: boolean; // whether it's on for new schools
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'menu_notes',              label: 'Notes',              description: 'Teacher notes and voice observations',          icon: FileText,    defaultOn: true },
  { key: 'menu_guru',               label: 'Guru',               description: 'AI teaching assistant',                         icon: Sparkles,    defaultOn: true },
  { key: 'menu_curriculum',         label: 'Curriculum',         description: 'Browse curriculum works by area',               icon: BookOpen,    defaultOn: true },
  { key: 'menu_manage_students',    label: 'Manage Students',    description: 'Add, edit, and remove students',                icon: Users,       defaultOn: true },
  { key: 'menu_photo_audit',        label: 'Wrap Up',            description: 'Review and confirm weekly photos',              icon: Search,      defaultOn: false },
  { key: 'menu_classroom_overview', label: 'Classroom Overview', description: 'See all students at a glance',                 icon: LayoutGrid,  defaultOn: false },
  { key: 'menu_focus_list',         label: 'Focus List',         description: 'Classroom-wide focus works view',               icon: Target,      defaultOn: false },
  { key: 'menu_photo_albums',       label: 'Photo Albums',       description: 'Organised photo collections',                   icon: Images,      defaultOn: false },
  { key: 'menu_library',            label: 'Library',            description: 'Content creation tools and picture bank',       icon: FolderOpen,  defaultOn: false },
  { key: 'menu_class_progress',     label: 'Class Progress',     description: 'Progress analytics across all students',        icon: BarChart2,   defaultOn: false },
  { key: 'menu_language_semester',  label: 'Language Semester',  description: 'Semester language summary reports',              icon: CalendarDays,defaultOn: false },
  { key: 'menu_earnings',           label: 'My Earnings',        description: 'Teacher revenue share dashboard',               icon: TrendingUp,  defaultOn: false },
  { key: 'menu_classroom_setup',    label: 'Classroom Setup',    description: 'Teach the AI about your materials',             icon: Settings2,   defaultOn: false },
];

const SANS = "'Inter', -apple-system, system-ui, sans-serif";
const SERIF = "'Lora', Georgia, serif";

export default function MenuSetupPage() {
  const router = useRouter();
  const session = getSession();
  const { isEnabled, invalidate } = useFeatures();
  const [toggling, setToggling] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Wait for features to load
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 500);
    return () => clearTimeout(t);
  }, []);

  const toggleFeature = useCallback(async (key: string, currentlyEnabled: boolean) => {
    if (!session?.school?.id || toggling) return;
    setToggling(key);
    try {
      const res = await montreeApi('/api/montree/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_key: key,
          enabled: !currentlyEnabled,
          school_id: session.school.id,
        }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      // Invalidate the features cache so the menu updates immediately
      invalidate?.();
      toast.success(!currentlyEnabled ? 'Enabled' : 'Disabled', { duration: 1200 });
    } catch {
      toast.error('Failed to update');
    } finally {
      setToggling(null);
    }
  }, [session?.school?.id, toggling, invalidate]);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px 40px', fontFamily: SANS }}>
      <Toaster position="top-center" richColors />

      {/* Back button */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'none', border: 0, color: 'rgba(255,255,255,0.5)',
          fontSize: 13, cursor: 'pointer', padding: '8px 0', marginBottom: 8,
          fontFamily: SANS,
        }}
      >
        <ChevronLeft size={16} strokeWidth={1.75} />
        Back
      </button>

      {/* Header */}
      <h1 style={{
        fontFamily: SERIF, fontSize: 28, fontWeight: 500,
        color: 'rgba(255,255,255,0.95)', margin: '0 0 6px',
      }}>
        Menu Setup
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: '0 0 28px', lineHeight: 1.5 }}>
        Choose which tools appear in your menu. Turn on what you need, turn off what you don't.
      </p>

      {/* Menu items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MENU_ITEMS.map((item) => {
          const enabled = loaded ? isEnabled(item.key as any) : item.defaultOn;
          const isToggling = toggling === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => toggleFeature(item.key, enabled)}
              disabled={isToggling}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                background: enabled ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${enabled ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.06)'}`,
                cursor: isToggling ? 'wait' : 'pointer',
                transition: 'all 180ms ease',
                width: '100%', textAlign: 'left',
                opacity: isToggling ? 0.6 : 1,
                fontFamily: SANS,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: enabled ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.05)',
                flexShrink: 0, transition: 'background 180ms ease',
              }}>
                <Icon
                  size={18} strokeWidth={1.75}
                  color={enabled ? '#34d399' : 'rgba(255,255,255,0.35)'}
                />
              </div>

              {/* Label + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 500,
                  color: enabled ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                  transition: 'color 180ms ease',
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 12,
                  color: enabled ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.25)',
                  marginTop: 2, transition: 'color 180ms ease',
                }}>
                  {item.description}
                </div>
              </div>

              {/* Toggle pill */}
              <div style={{
                width: 42, height: 24, borderRadius: 12, flexShrink: 0,
                background: enabled ? '#34d399' : 'rgba(255,255,255,0.12)',
                position: 'relative', transition: 'background 200ms ease',
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: 9,
                  background: '#fff',
                  position: 'absolute', top: 3,
                  left: enabled ? 21 : 3,
                  transition: 'left 200ms ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer note */}
      <p style={{
        fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center',
        marginTop: 24, lineHeight: 1.5,
      }}>
        Changes apply immediately. Menu Setup and Logout are always visible.
      </p>
    </div>
  );
}
