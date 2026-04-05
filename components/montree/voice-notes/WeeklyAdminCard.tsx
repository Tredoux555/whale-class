'use client';

// components/montree/voice-notes/WeeklyAdminCard.tsx
// Simplified dashboard card — links to Weekly Admin Docs page
// which auto-fills from progress + Smart Capture data on load

import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

export default function WeeklyAdminCard({ classroomId, children }: Props) {
  const { t, locale } = useI18n();

  if (children.length === 0) return null;

  return (
    <Link
      href="/montree/dashboard/weekly-admin-docs"
      className="block bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📋</span>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">
              {locale === 'zh' ? '周计划 & 总结' : 'Weekly Plan & Summary'}
            </h3>
            <p className="text-xs text-gray-500">
              {children.length} {locale === 'zh' ? '个学生' : 'children'} · {locale === 'zh' ? '自动填充 + 下载 DOCX' : 'Auto-fills from photos · Download DOCX'}
            </p>
          </div>
        </div>
        <span className="text-emerald-500 text-lg">→</span>
      </div>
    </Link>
  );
}
