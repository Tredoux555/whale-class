'use client';

import { useState, useEffect } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface WeeklyActivitySummaryProps {
  childId: string;
}

export default function WeeklyActivitySummary({ childId }: WeeklyActivitySummaryProps) {
  const { locale } = useI18n();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!childId) return;
    const controller = new AbortController();

    // Pass locale so the server caches EN and ZH separately and instructs Haiku accordingly
    montreeApi(`/api/montree/children/${childId}/activity-summary?locale=${locale}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.summary) setSummary(data.summary);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    return () => controller.abort();
  }, [childId, locale]);

  if (loading || !summary) return null;

  return (
    <div className="px-3 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl">
      <p className="text-sm text-amber-900/80 leading-relaxed">
        <span className="mr-1.5">💡</span>
        {summary}
      </p>
    </div>
  );
}
