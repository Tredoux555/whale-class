// lib/montree/menu/registry.tsx
// CLIENT-side UI registry for the customizable menu: maps each menu item id to
// its icon, label (i18n key or hardcoded), and route. Mirrors the legacy
// DashboardHeader items 1:1 so a config-driven render looks identical.
//
// Kept separate from config.ts (pure data) so server routes don't import lucide.

import {
  Sparkles,
  BookOpen,
  Users,
  KeyRound,
  MessageSquare,
  Search,
  LayoutGrid,
  Calendar,
  CalendarDays,
  Mic,
  FileText,
  Globe,
  Target,
  Images,
  FolderOpen,
  BarChart2,
  TrendingUp,
  BookMarked,
  Settings2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MENU_ITEM_IDS, type MenuItemId } from './config';

export interface MenuItemDef {
  id: MenuItemId;
  labelKey: string | null; // i18n key, or null when label is hardcoded
  label: string; // fallback / hardcoded label
  route: string;
  icon: LucideIcon;
}

export const MENU_REGISTRY: Record<MenuItemId, MenuItemDef> = {
  guru: { id: 'guru', labelKey: 'nav.guru', label: 'Guru', route: '/montree/dashboard/guru', icon: Sparkles },
  curriculum: { id: 'curriculum', labelKey: 'nav.curriculum', label: 'Curriculum', route: '/montree/dashboard/curriculum', icon: BookOpen },
  manage_students: { id: 'manage_students', labelKey: 'students.manageStudents', label: 'Manage Students', route: '/montree/dashboard/students', icon: Users },
  parent_manager: { id: 'parent_manager', labelKey: null, label: 'Parent Manager', route: '/montree/dashboard/parent-codes', icon: KeyRound },
  parent_messages: { id: 'parent_messages', labelKey: 'nav.messages', label: 'Messages', route: '/montree/dashboard/parent-chats', icon: MessageSquare },
  photo_audit: { id: 'photo_audit', labelKey: 'audit.title', label: 'Photo Audit', route: '/montree/dashboard/photo-audit', icon: Search },
  classroom_overview: { id: 'classroom_overview', labelKey: 'nav.classroomOverview', label: 'Classroom Overview', route: '/montree/dashboard/classroom-overview', icon: LayoutGrid },
  calendar: { id: 'calendar', labelKey: 'nav.calendar', label: 'Calendar', route: '/montree/calendar', icon: Calendar },
  meeting_notes: { id: 'meeting_notes', labelKey: null, label: 'Meeting Notes', route: '/montree/dashboard/conversations', icon: Mic },
  notes: { id: 'notes', labelKey: 'nav.notes', label: 'Notes', route: '/montree/dashboard/notes', icon: FileText },
  // 'games' removed Jul 3 2026 — feature retired from all teacher-facing nav.
  english_corner: { id: 'english_corner', labelKey: 'dashboard.englishCorner', label: 'English Corner', route: '/montree/dashboard/language-tracker', icon: Globe },
  focus_list: { id: 'focus_list', labelKey: 'dashboard.focusList', label: 'Focus List', route: '/montree/dashboard/focus', icon: Target },
  weekly_plan: { id: 'weekly_plan', labelKey: 'dashboard.weeklyPlan', label: 'Weekly Plan', route: '/montree/dashboard/weekly-admin-docs', icon: CalendarDays },
  photo_albums: { id: 'photo_albums', labelKey: 'albums.title', label: 'Albums', route: '/montree/dashboard/albums', icon: Images },
  library: { id: 'library', labelKey: 'nav.library', label: 'Library', route: '/montree/library', icon: FolderOpen },
  class_progress: { id: 'class_progress', labelKey: null, label: 'Class Progress', route: '/montree/dashboard/progress-overview', icon: BarChart2 },
  language_semester: { id: 'language_semester', labelKey: 'dashboard.languageSemester', label: 'Language Semester', route: '/montree/dashboard/language-semester', icon: CalendarDays },
  earnings: { id: 'earnings', labelKey: null, label: 'My Earnings', route: '/montree/dashboard/earnings', icon: TrendingUp },
  raz: { id: 'raz', labelKey: 'nav.razReadingTracker', label: 'RAZ Reading', route: '/montree/dashboard/raz', icon: BookMarked },
  paperwork: { id: 'paperwork', labelKey: 'dashboard.paperworkTracker', label: 'Paperwork', route: '/montree/dashboard/paperwork', icon: FileText },
  classroom_setup: { id: 'classroom_setup', labelKey: 'nav.classroomBuilder', label: 'Classroom Setup', route: '/montree/dashboard/classroom-builder', icon: Settings2 },
};

// Canonical fallback order (used by Manage Menu when a teacher has no saved
// config yet — they start from the full list, all visible, and trim).
export const MENU_REGISTRY_ORDER: MenuItemId[] = [...MENU_ITEM_IDS];
