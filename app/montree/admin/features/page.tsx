// /montree/admin/features/page.tsx
// Feature Toggle Admin - Switch features on/off per classroom
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type MontreeSession } from '@/lib/montree/auth';
import { toast, Toaster } from 'sonner';
import { useI18n, type TranslationKey } from '@/lib/montree/i18n';
import { invalidateFeatures } from '@/lib/montree/features';

interface Feature {
  feature_key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_premium: boolean;
  default_enabled: boolean;
  enabled: boolean;
  school_enabled: boolean | null;
  classroom_enabled: boolean | null;
}

export default function FeaturesAdminPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setSession(sess);
  }, [router]);

  useEffect(() => {
    if (!session) return; // Session not loaded yet
    if (!session.classroom?.id) { setLoading(false); return; } // No classroom — stop loading
    loadFeatures();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadFeatures() {
    if (!session?.classroom?.id) return;
    try {
      const res = await fetch(`/api/montree/features?classroom_id=${session.classroom.id}`);
      if (!res.ok) throw new Error('Failed to load features');
      const data = await res.json();
      if (data.success) setFeatures(data.features || []);
    } catch (err) {
      toast.error(t('features.failedToLoad' as TranslationKey));
    }
    setLoading(false);
  }

  async function toggleFeature(featureKey: string, enabled: boolean) {
    if (!session?.classroom?.id) return;
    try {
      const res = await fetch('/api/montree/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_key: featureKey,
          enabled,
          classroom_id: session.classroom.id,
          enabled_by: session.teacher?.name || 'admin',
        }),
      });
      if (!res.ok) throw new Error('Failed to toggle feature');
      const data = await res.json();
      if (data.success) {
        setFeatures(prev => prev.map(f =>
          f.feature_key === featureKey ? { ...f, enabled, classroom_enabled: enabled } : f
        ));
        // Invalidate the shared features cache so other pages pick up the change
        if (session?.school?.id) invalidateFeatures(session.school.id);
        toast.success(`${enabled ? t('features.enabled' as TranslationKey) : t('features.disabled' as TranslationKey)} ${featureKey}`);
      }
    } catch (err) {
      toast.error(t('features.failedToToggle' as TranslationKey));
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <div style={{ color: '#94a3b8', fontSize: 18 }}>{t('features.loading' as TranslationKey)}</div>
      </div>
    );
  }

  // Group by category
  const categories = [...new Set(features.map(f => f.category))];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 16 }}>
      <Toaster position="top-center" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>⚙️ {t('features.title' as TranslationKey)}</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
            {session?.classroom?.name || t('features.classroom' as TranslationKey)} &middot; {t('features.subtitle' as TranslationKey)}
          </p>
        </div>
        <button
          onClick={() => router.push('/montree/admin')}
          style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
        >
          ← {t('common.back' as TranslationKey)}
        </button>
      </div>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {cat}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.filter(f => f.category === cat).map(feature => (
              <div
                key={feature.feature_key}
                style={{
                  background: '#1e293b', borderRadius: 12, padding: 14,
                  border: feature.enabled ? '2px solid #22c55e' : '1px solid #334155',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}
              >
                <span style={{ fontSize: 28 }}>{feature.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>
                    {feature.name}
                    {feature.is_premium && (
                      <span style={{ fontSize: 10, background: '#7c3aed', color: '#fff', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>PRO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{feature.description}</div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => toggleFeature(feature.feature_key, !feature.enabled)}
                  style={{
                    width: 52, height: 28, borderRadius: 14, border: 'none',
                    background: feature.enabled ? '#22c55e' : '#475569',
                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    left: feature.enabled ? 27 : 3,
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ height: 80 }} />
    </div>
  );
}
