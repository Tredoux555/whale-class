// /montree/dashboard/[childId]/observations/page.tsx
// Behavioral Observation Logging with ABC Model
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import VoiceDictate from '@/components/montree/voice/VoiceDictate';

interface Observation {
  id: string;
  observed_at: string;
  behavior_description: string;
  antecedent?: string;
  behavior_function?: string;
  consequence?: string;
  time_of_day?: string;
  activity_during?: string;
  intervention_used?: string;
  effectiveness?: string;
}

interface Pattern {
  id: string;
  pattern_type: string;
  pattern_description: string;
  confidence: string;
  still_active: boolean;
}

interface Child {
  id: string;
  name: string;
}

const EFFECTIVENESS = [
  { value: 'effective', label: '✅ Effective', color: 'bg-emerald-500/15 text-emerald-200' },
  { value: 'partially', label: '⚡ Partial', color: 'bg-yellow-500/15 text-yellow-200' },
  { value: 'ineffective', label: '❌ Ineffective', color: 'bg-red-500/15 text-red-200' },
  { value: 'not_applicable', label: '➖ N/A', color: 'bg-white/[0.08] text-white/70' },
];

export default function ObservationsPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;
  const { t } = useI18n();

  // Behavior function options - translated
  const BEHAVIOR_FUNCTIONS = [
    { value: 'attention', label: `👀 ${t('observations.attention')}`, description: t('observations.attentionDesc') },
    { value: 'escape', label: `🏃 ${t('observations.escape')}`, description: t('observations.escapeDesc') },
    { value: 'sensory', label: `✨ ${t('observations.sensory')}`, description: t('observations.sensoryDesc') },
    { value: 'tangible', label: `🎁 ${t('observations.tangible')}`, description: t('observations.tangibleDesc') },
    { value: 'unknown', label: `❓ ${t('observations.unknown')}`, description: t('observations.unknownDesc') },
  ];

  // Time of day options - translated
  const TIME_OF_DAY = [
    { value: 'arrival', label: t('observations.arrival') },
    { value: 'morning_work', label: t('observations.morningWork') },
    { value: 'snack', label: t('observations.snack') },
    { value: 'outdoor', label: t('observations.outdoor') },
    { value: 'afternoon_work', label: t('observations.afternoonWork') },
    { value: 'dismissal', label: t('observations.dismissal') },
  ];

  const [child, setChild] = useState<Child | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [form, setForm] = useState({
    behavior_description: '',
    antecedent: '',
    behavior_function: 'unknown',
    consequence: '',
    time_of_day: '',
    activity_during: '',
    intervention_used: '',
    effectiveness: '',
  });

  // Load data
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }

    // Fetch child info
    fetch(`/api/montree/children/${childId}`)
      .then(r => { if (!r.ok) throw new Error(`Child fetch: ${r.status}`); return r.json(); })
      .then(data => {
        if (data.child) setChild(data.child);
      })
      .catch(() => {});

    // Fetch observations
    fetchObservations();

    // Fetch patterns
    fetchPatterns();
  }, [childId, router]);

  const fetchObservations = async () => {
    try {
      const res = await fetch(`/api/montree/observations?child_id=${childId}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setObservations(data.observations || []);
      }
    } catch {
      // Silently fail
    }
    setLoading(false);
  };

  const fetchPatterns = async () => {
    try {
      const res = await fetch(`/api/montree/patterns?child_id=${childId}`);
      const data = await res.json();
      if (data.success) {
        setPatterns(data.patterns || []);
      }
    } catch {
      // Silently fail
    }
  };

  const handleSubmit = async () => {
    if (!form.behavior_description.trim()) {
      toast.error(t('observations.describeBehavior'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/montree/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          ...form,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(t('observations.saved'));
        setForm({
          behavior_description: '',
          antecedent: '',
          behavior_function: 'unknown',
          consequence: '',
          time_of_day: '',
          activity_during: '',
          intervention_used: '',
          effectiveness: '',
        });
        setShowForm(false);
        fetchObservations();
        fetchPatterns(); // Refresh patterns in case new ones detected
      } else {
        toast.error(data.error || t('observations.saveFailed'));
      }
    } catch {
      toast.error(t('observations.saveFailed'));
    }
    setSaving(false);
  };

  const deleteObservation = async (id: string) => {
    if (!confirm(t('observations.confirmDelete'))) return;

    try {
      const res = await fetch(`/api/montree/observations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('observations.deleted'));
        fetchObservations();
      }
    } catch {
      toast.error(t('observations.deleteFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-bounce text-4xl">📋</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white/95" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>
            {t('observations.title')}
          </h2>
          <p className="text-sm text-white/50">
            {t('observations.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#1D6B48] text-white rounded-lg hover:bg-[#236B4C] transition-colors flex items-center gap-2"
        >
          {showForm ? `✕ ${t('observations.close')}` : `+ ${t('observations.new')}`}
        </button>
      </div>

      {/* New Observation Form */}
      {showForm && (
        <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4 mb-4">
          <h3 className="font-bold text-white/90 mb-4">{t('observations.newObservation')}</h3>

          {/* ABC Model Explanation */}
          <div className="rounded-lg p-3 mb-4 text-sm border border-[rgba(52,211,153,0.15)]" style={{ background: 'rgba(52,211,153,0.06)' }}>
            <p className="font-medium text-[#34d399] mb-1">{t('observations.abcModel')}</p>
            <p className="text-white/70">
              <strong>A</strong>{t('observations.antecedentDescription')} →{' '}
              <strong>B</strong>{t('observations.behaviorDescription')} →{' '}
              <strong>C</strong>{t('observations.consequenceDescription')}
            </p>
          </div>

          {/* Antecedent */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-white/70">
                {t('observations.antecedentLabel')}
              </label>
              <VoiceDictate
                size="sm"
                onAppend={(text) => setForm(prev => ({ ...prev, antecedent: prev.antecedent ? prev.antecedent + ' ' + text : text }))}
                onError={(msg) => toast.error(msg)}
              />
            </div>
            <input
              type="text"
              value={form.antecedent}
              onChange={(e) => setForm(prev => ({ ...prev, antecedent: e.target.value }))}
              placeholder={t('observations.antecedentPlaceholder')}
              className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
            />
          </div>

          {/* Behavior */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-white/70">
                {t('observations.behaviorLabel')}
              </label>
              <VoiceDictate
                size="sm"
                onAppend={(text) => setForm(prev => ({ ...prev, behavior_description: prev.behavior_description ? prev.behavior_description + ' ' + text : text }))}
                onError={(msg) => toast.error(msg)}
              />
            </div>
            <textarea
              value={form.behavior_description}
              onChange={(e) => setForm(prev => ({ ...prev, behavior_description: e.target.value }))}
              placeholder={t('observations.behaviorPlaceholder')}
              className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none resize-none"
              rows={3}
            />
          </div>

          {/* Consequence */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-white/70">
                {t('observations.consequenceLabel')}
              </label>
              <VoiceDictate
                size="sm"
                onAppend={(text) => setForm(prev => ({ ...prev, consequence: prev.consequence ? prev.consequence + ' ' + text : text }))}
                onError={(msg) => toast.error(msg)}
              />
            </div>
            <input
              type="text"
              value={form.consequence}
              onChange={(e) => setForm(prev => ({ ...prev, consequence: e.target.value }))}
              placeholder={t('observations.consequencePlaceholder')}
              className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
            />
          </div>

          {/* Behavior Function */}
          <div className="mb-4">
            <label className="text-sm font-medium text-white/70 block mb-2">
              {t('observations.functionLabel')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BEHAVIOR_FUNCTIONS.map(func => (
                <button
                  key={func.value}
                  onClick={() => setForm(prev => ({ ...prev, behavior_function: func.value }))}
                  className={`p-3 rounded-lg text-left transition-all ${
                    form.behavior_function === func.value
                      ? 'bg-[#34d399]/15 border-2 border-[#34d399]'
                      : 'bg-white/[0.04] border-2 border-transparent hover:bg-white/[0.08]'
                  }`}
                >
                  <span className="font-medium text-white/90">{func.label}</span>
                  <p className="text-xs text-white/50">{func.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-white/70 block mb-1">
                {t('observations.timeOfDay')}
              </label>
              <select
                value={form.time_of_day}
                onChange={(e) => setForm(prev => ({ ...prev, time_of_day: e.target.value }))}
                className="w-full p-2 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
              >
                <option value="">{t('observations.select')}</option>
                {TIME_OF_DAY.map(time => (
                  <option key={time.value} value={time.value}>{time.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-white/70 block mb-1">
                {t('observations.activity')}
              </label>
              <input
                type="text"
                value={form.activity_during}
                onChange={(e) => setForm(prev => ({ ...prev, activity_during: e.target.value }))}
                placeholder={t('observations.activityPlaceholder')}
                className="w-full p-2 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
              />
            </div>
          </div>

          {/* Intervention */}
          <div className="mb-4">
            <label className="text-sm font-medium text-white/70 block mb-1">
              {t('observations.interventionLabel')}
            </label>
            <input
              type="text"
              value={form.intervention_used}
              onChange={(e) => setForm(prev => ({ ...prev, intervention_used: e.target.value }))}
              placeholder={t('observations.interventionPlaceholder')}
              className="w-full p-3 bg-black/30 border border-[rgba(52,211,153,0.18)] rounded-lg text-white/90 placeholder-white/40 focus:border-[#34d399] outline-none"
            />
          </div>

          {/* Effectiveness */}
          {form.intervention_used && (
            <div className="mb-4">
              <label className="text-sm font-medium text-white/70 block mb-2">
                {t('observations.effectivenessLabel')}
              </label>
              <div className="flex gap-2">
                {EFFECTIVENESS.map(eff => (
                  <button
                    key={eff.value}
                    onClick={() => setForm(prev => ({ ...prev, effectiveness: eff.value }))}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      form.effectiveness === eff.value
                        ? eff.color + ' ring-2 ring-[#34d399]/50'
                        : 'bg-white/[0.06] text-white/60 hover:bg-white/[0.12]'
                    }`}
                  >
                    {eff.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSubmit}
            disabled={saving || !form.behavior_description.trim()}
            className="w-full py-3 bg-[#1D6B48] text-white font-medium rounded-lg
                     disabled:opacity-50 hover:bg-[#236B4C] transition-all"
          >
            {saving ? t('observations.saving') : t('observations.saveButton')}
          </button>
        </div>
      )}

      {/* Detected Patterns */}
      {patterns.filter(p => p.still_active).length > 0 && (
        <div className="rounded-xl p-4 mb-4 border border-amber-500/25" style={{ background: 'rgba(245,158,11,0.08)' }}>
          <h3 className="font-bold text-amber-200 mb-2 flex items-center gap-2">
            <span>🔍</span> {t('observations.detectedPatterns')}
          </h3>
          <div className="space-y-2">
            {patterns.filter(p => p.still_active).map(pattern => (
              <div key={pattern.id} className="bg-white/[0.06] border border-[rgba(52,211,153,0.12)] rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/75">{pattern.pattern_description}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    pattern.confidence === 'high'
                      ? 'bg-red-500/15 text-red-200'
                      : 'bg-yellow-500/15 text-yellow-200'
                  }`}>
                    {pattern.confidence} confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href={`/montree/dashboard/guru?child=${childId}`}
            className="mt-3 inline-flex items-center gap-2 text-sm text-[#34d399] hover:text-[#5fe0b0]"
          >
            🔮 {t('observations.askGuruPatterns')} →
          </Link>
        </div>
      )}

      {/* Observation List */}
      <div className="bg-white/[0.06] border border-[rgba(52,211,153,0.15)] rounded-xl p-4">
        <h3 className="font-bold text-white/90 mb-4">
          {t('observations.recent')} ({observations.length})
        </h3>

        {observations.length === 0 ? (
          <div className="text-center py-8 text-white/40">
            <p className="text-4xl mb-2">📋</p>
            <p>{t('observations.none')}</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-[#34d399] hover:text-[#5fe0b0]"
            >
              {t('observations.addFirst')} →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {observations.map(obs => (
              <div key={obs.id} className="border border-[rgba(52,211,153,0.12)] rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/40">
                        {new Date(obs.observed_at).toLocaleDateString()}{' '}
                        {obs.time_of_day && `• ${obs.time_of_day.replace('_', ' ')}`}
                      </span>
                      {obs.behavior_function && obs.behavior_function !== 'unknown' && (
                        <span className="text-xs px-2 py-0.5 bg-[#34d399]/15 text-[#34d399] rounded-full">
                          {BEHAVIOR_FUNCTIONS.find(f => f.value === obs.behavior_function)?.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/85">{obs.behavior_description}</p>
                    {obs.antecedent && (
                      <p className="text-xs text-white/50 mt-1">
                        <span className="font-medium">Before:</span> {obs.antecedent}
                      </p>
                    )}
                    {obs.intervention_used && (
                      <p className="text-xs text-white/50 mt-1">
                        <span className="font-medium">Tried:</span> {obs.intervention_used}
                        {obs.effectiveness && (
                          <span className={`ml-2 ${
                            obs.effectiveness === 'effective' ? 'text-emerald-300' :
                            obs.effectiveness === 'ineffective' ? 'text-red-300' : 'text-yellow-300'
                          }`}>
                            ({obs.effectiveness})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteObservation(obs.id)}
                    className="text-white/40 hover:text-red-400 p-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
