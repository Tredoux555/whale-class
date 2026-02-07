import { Home, Users, Baby, BookOpen, Play } from 'lucide-react';

export const AREA_CONFIG: Record<string, { label: string; color: string; bgColor: string; emoji: string }> = {
  practical_life: { label: 'Practical Life', color: '#EF4444', bgColor: '#FEE2E2', emoji: '🔴' },
  sensorial: { label: 'Sensorial', color: '#EC4899', bgColor: '#FCE7F3', emoji: '🩷' },
  mathematics: { label: 'Mathematics', color: '#3B82F6', bgColor: '#DBEAFE', emoji: '🔵' },
  language: { label: 'Language', color: '#22C55E', bgColor: '#DCFCE7', emoji: '🟢' },
  cultural: { label: 'Cultural', color: '#EAB308', bgColor: '#FEF9C3', emoji: '🟡' },
};

export const STATUS_CONFIG: Record<number, { label: string; color: string; bgColor: string }> = {
  0: { label: 'Not Started', color: '#9CA3AF', bgColor: '#F3F4F6' },
  1: { label: 'Presented', color: '#F59E0B', bgColor: '#FEF3C7' },
  2: { label: 'Practicing', color: '#3B82F6', bgColor: '#DBEAFE' },
  3: { label: 'Mastered', color: '#22C55E', bgColor: '#DCFCE7' },
};

export const TABS = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'families', label: 'Families', icon: Users },
  { id: 'children', label: 'Children', icon: Baby },
  { id: 'curriculum', label: 'Curriculum', icon: BookOpen },
  { id: 'demo', label: 'Demo Mode', icon: Play },
];

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  const adjustedMonths = months < 0 ? months + 12 : months;
  const adjustedYears = months < 0 ? years - 1 : years;

  if (adjustedYears === 0) return `${adjustedMonths}mo`;
  return `${adjustedYears}y ${adjustedMonths}mo`;
}
