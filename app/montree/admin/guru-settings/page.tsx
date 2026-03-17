// /montree/admin/guru-settings/page.tsx
// Per-School Guru Personality Settings — Principal/Lead Teacher configures Guru behavior
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import LanguageToggle from '@/components/montree/LanguageToggle';

const TONES = ['warm_nurturing', 'professional_direct', 'analytical', 'balanced'] as const;
const COMMUNICATION_STYLES = ['formal', 'casual', 'balanced'] as const;
const AGE_RANGES = ['0-3', '3-6', '6-9', 'mixed'] as const;
const AREAS = [
  { key: 'practical_life', emoji: '🧹', label: 'Practical Life' },
  { key: 'sensorial', emoji: '👁️', label: 'Sensorial' },
  { key: 'mathematics', emoji: '🔢', label: 'Mathematics' },
  { key: 'language', emoji: '📚', label: 'Language' },
  { key: 'cultural', emoji: '🌍', label: 'Cultural' },
] as const;

const MAX_LENGTHS = {
  philosophy: 500,
  materials_note: 500,
  language_preference: 200,
  custom_instructions: 1000,
} as const;

interface GuruPersonality {
  tone?: string;
  communication_style?: string;
  age_range_focus?: string;
  focus_areas?: string[];
  philosophy?: string;
  materials_note?: string;
  language_preference?: string;
  custom_instructions?: string;
}

export default function GuruSettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GuruPersonality>({
    tone: 'balanced',
    communication_style: 'balanced',
    age_range_focus: '3-6',
    focus_areas: [],
    philosophy: '',
    materials_note: '',
    language_preference: '',
    custom_instructions: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await montreeApi('/api/montree/guru/settings');
      const data = await res.json();
      if (data.success && data.guru_personality) {
        setSettings(prev => ({ ...prev, ...data.guru_personality }));
      }
    } catch {
      toast.error(t('admin.guruSettings.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await montreeApi('/api/montree/guru/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guru_personality: settings }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('admin.guruSettings.saved'));
      } else {
        toast.error(data.error || t('admin.guruSettings.saveError'));
      }
    } catch {
      toast.error(t('admin.guruSettings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const toggleArea = (area: string) => {
    setSettings(prev => {
      const current = prev.focus_areas || [];
      const next = current.includes(area)
        ? current.filter(a => a !== area)
        : [...current, area];
      return { ...prev, focus_areas: next };
    });
  };

  const updateField = (field: keyof GuruPersonality, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const charCount = (field: keyof typeof MAX_LENGTHS) => {
    const val = (settings[field] as string) || '';
    return t('admin.guruSettings.charCount')
      .replace('{count}', String(val.length))
      .replace('{max}', String(MAX_LENGTHS[field]));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0D1F1C] to-[#1a3a2a] flex items-center justify-center">
        <div className="text-emerald-300 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D1F1C] to-[#1a3a2a]">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => router.push('/montree/admin')} className="text-emerald-400 text-sm hover:underline">
            {t('admin.guruSettings.backToAdmin')}
          </button>
          <LanguageToggle />
        </div>
        <h1 className="text-2xl font-bold text-white">{t('admin.guruSettings.title')}</h1>
        <p className="text-emerald-300 text-sm mt-1">{t('admin.guruSettings.subtitle')}</p>
      </div>

      <div className="px-4 pb-8 space-y-6">

        {/* Tone */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-1">{t('admin.guruSettings.tone')}</h2>
          <p className="text-emerald-300/70 text-xs mb-3">{t('admin.guruSettings.toneDesc')}</p>
          <div className="space-y-2">
            {TONES.map(tone => (
              <label key={tone} className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${settings.tone === tone ? 'bg-emerald-600/30 border border-emerald-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                <input
                  type="radio"
                  name="tone"
                  checked={settings.tone === tone}
                  onChange={() => updateField('tone', tone)}
                  className="mt-1 accent-emerald-500"
                />
                <div>
                  <div className="text-white text-sm font-medium">{t(`admin.guruSettings.tone.${tone}`)}</div>
                  <div className="text-emerald-300/60 text-xs">{t(`admin.guruSettings.tone.${tone}.desc`)}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Communication Style */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-3">{t('admin.guruSettings.communicationStyle')}</h2>
          <div className="flex gap-2">
            {COMMUNICATION_STYLES.map(style => (
              <button
                key={style}
                onClick={() => updateField('communication_style', style)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${settings.communication_style === style ? 'bg-emerald-600 text-white' : 'bg-white/10 text-emerald-300 hover:bg-white/20'}`}
              >
                {t(`admin.guruSettings.communicationStyle.${style}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Age Range */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-3">{t('admin.guruSettings.ageRange')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {AGE_RANGES.map(range => (
              <button
                key={range}
                onClick={() => updateField('age_range_focus', range)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${settings.age_range_focus === range ? 'bg-emerald-600 text-white' : 'bg-white/10 text-emerald-300 hover:bg-white/20'}`}
              >
                {t(`admin.guruSettings.ageRange.${range}`)}
              </button>
            ))}
          </div>
        </section>

        {/* Focus Areas */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-1">{t('admin.guruSettings.focusAreas')}</h2>
          <p className="text-emerald-300/70 text-xs mb-3">{t('admin.guruSettings.focusAreasDesc')}</p>
          <div className="space-y-2">
            {AREAS.map(area => (
              <label key={area.key} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${(settings.focus_areas || []).includes(area.key) ? 'bg-emerald-600/30 border border-emerald-500/50' : 'bg-white/5 border border-transparent hover:bg-white/10'}`}>
                <input
                  type="checkbox"
                  checked={(settings.focus_areas || []).includes(area.key)}
                  onChange={() => toggleArea(area.key)}
                  className="accent-emerald-500"
                />
                <span className="text-lg">{area.emoji}</span>
                <span className="text-white text-sm">{area.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Philosophy */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-2">{t('admin.guruSettings.philosophy')}</h2>
          <textarea
            value={settings.philosophy || ''}
            onChange={e => updateField('philosophy', e.target.value.slice(0, MAX_LENGTHS.philosophy))}
            placeholder={t('admin.guruSettings.philosophyPlaceholder')}
            rows={3}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:border-emerald-500"
          />
          <div className="text-right text-xs text-emerald-300/50 mt-1">{charCount('philosophy')}</div>
        </section>

        {/* Materials Note */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-2">{t('admin.guruSettings.materialsNote')}</h2>
          <textarea
            value={settings.materials_note || ''}
            onChange={e => updateField('materials_note', e.target.value.slice(0, MAX_LENGTHS.materials_note))}
            placeholder={t('admin.guruSettings.materialsNotePlaceholder')}
            rows={3}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:border-emerald-500"
          />
          <div className="text-right text-xs text-emerald-300/50 mt-1">{charCount('materials_note')}</div>
        </section>

        {/* Language Preference */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-2">{t('admin.guruSettings.languagePreference')}</h2>
          <input
            type="text"
            value={settings.language_preference || ''}
            onChange={e => updateField('language_preference', e.target.value.slice(0, MAX_LENGTHS.language_preference))}
            placeholder={t('admin.guruSettings.languagePreferencePlaceholder')}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-emerald-500"
          />
          <div className="text-right text-xs text-emerald-300/50 mt-1">{charCount('language_preference')}</div>
        </section>

        {/* Custom Instructions */}
        <section className="bg-white/5 rounded-xl p-4">
          <h2 className="text-white font-semibold mb-2">{t('admin.guruSettings.customInstructions')}</h2>
          <textarea
            value={settings.custom_instructions || ''}
            onChange={e => updateField('custom_instructions', e.target.value.slice(0, MAX_LENGTHS.custom_instructions))}
            placeholder={t('admin.guruSettings.customInstructionsPlaceholder')}
            rows={4}
            className="w-full bg-white/10 border border-white/20 rounded-lg p-3 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:border-emerald-500"
          />
          <div className="text-right text-xs text-emerald-300/50 mt-1">{charCount('custom_instructions')}</div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? t('admin.guruSettings.saving') : t('admin.guruSettings.save')}
        </button>
      </div>
    </div>
  );
}
