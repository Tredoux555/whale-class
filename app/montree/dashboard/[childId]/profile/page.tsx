// /montree/dashboard/[childId]/profile/page.tsx
// Mental Profile Editor - Temperament, sensitive periods, context
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';

interface MentalProfile {
  // Temperament (1-5)
  temperament_activity_level?: number;
  temperament_regularity?: number;
  temperament_initial_reaction?: number;
  temperament_adaptability?: number;
  temperament_intensity?: number;
  temperament_mood_quality?: number;
  temperament_distractibility?: number;
  temperament_persistence?: number;
  temperament_sensory_threshold?: number;
  // Learning modality
  learning_modality_visual?: number;
  learning_modality_auditory?: number;
  learning_modality_kinesthetic?: number;
  // Focus
  baseline_focus_minutes?: number;
  optimal_time_of_day?: string;
  // Sensitive periods
  sensitive_period_order?: string;
  sensitive_period_language?: string;
  sensitive_period_movement?: string;
  sensitive_period_sensory?: string;
  sensitive_period_small_objects?: string;
  sensitive_period_grace_courtesy?: string;
  // Context
  family_notes?: string;
  sleep_status?: string;
  special_considerations?: string;
  successful_strategies?: string[];
  challenging_triggers?: string[];
}

interface Child {
  id: string;
  name: string;
}

const TEMPERAMENT_LABELS: Record<string, { label: string; low: string; high: string }> = {
  activity_level: { label: 'Activity Level', low: 'Calm', high: 'Very Active' },
  regularity: { label: 'Regularity', low: 'Unpredictable', high: 'Predictable' },
  initial_reaction: { label: 'Initial Reaction', low: 'Withdraws', high: 'Approaches' },
  adaptability: { label: 'Adaptability', low: 'Slow to adapt', high: 'Quick to adapt' },
  intensity: { label: 'Intensity', low: 'Mild reactions', high: 'Intense reactions' },
  mood_quality: { label: 'Mood', low: 'Serious', high: 'Cheerful' },
  distractibility: { label: 'Distractibility', low: 'Focused', high: 'Easily distracted' },
  persistence: { label: 'Persistence', low: 'Gives up easily', high: 'Very persistent' },
  sensory_threshold: { label: 'Sensory Sensitivity', low: 'Low sensitivity', high: 'Highly sensitive' },
};

const SENSITIVE_PERIOD_OPTIONS = [
  { value: 'not_started', label: 'Not Started', color: 'bg-gray-200 text-gray-600' },
  { value: 'active', label: 'Active', color: 'bg-green-400 text-green-800' },
  { value: 'waning', label: 'Waning', color: 'bg-amber-300 text-amber-800' },
  { value: 'complete', label: 'Complete', color: 'bg-blue-300 text-blue-800' },
];

const SENSITIVE_PERIODS = [
  { key: 'order', label: 'Order', description: 'Need for consistency and routine' },
  { key: 'language', label: 'Language', description: 'Absorbing spoken and written language' },
  { key: 'movement', label: 'Movement', description: 'Refining gross and fine motor skills' },
  { key: 'sensory', label: 'Sensory', description: 'Exploring through senses' },
  { key: 'small_objects', label: 'Small Objects', description: 'Fascination with tiny things' },
  { key: 'grace_courtesy', label: 'Grace & Courtesy', description: 'Social awareness and manners' },
];

function Slider({
  value,
  onChange,
  trait,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  trait: string;
}) {
  const config = TEMPERAMENT_LABELS[trait];
  const currentValue = value || 3;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
        <span className="text-xs text-gray-500">{currentValue}/5</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 w-20 text-right">{config.low}</span>
        <input
          type="range"
          min={1}
          max={5}
          value={currentValue}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
        />
        <span className="text-xs text-gray-400 w-20">{config.high}</span>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;

  const [child, setChild] = useState<Child | null>(null);
  const [profile, setProfile] = useState<MentalProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStrategy, setNewStrategy] = useState('');
  const [newTrigger, setNewTrigger] = useState('');

  // Load child and profile
  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }

    // Fetch child info
    fetch(`/api/montree/children/${childId}`)
      .then(r => r.json())
      .then(data => {
        if (data.child) setChild(data.child);
      })
      .catch(() => {});

    // Fetch profile
    fetch(`/api/montree/children/${childId}/profile`)
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          setProfile(data.profile);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [childId, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/montree/children/${childId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Profile saved!');
      } else {
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save profile');
    }
    setSaving(false);
  };

  const updateTemperament = (trait: string, value: number) => {
    setProfile(prev => ({
      ...prev,
      [`temperament_${trait}`]: value,
    }));
  };

  const updateSensitivePeriod = (period: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [`sensitive_period_${period}`]: value,
    }));
  };

  const addStrategy = () => {
    if (!newStrategy.trim()) return;
    setProfile(prev => ({
      ...prev,
      successful_strategies: [...(prev.successful_strategies || []), newStrategy.trim()],
    }));
    setNewStrategy('');
  };

  const removeStrategy = (index: number) => {
    setProfile(prev => ({
      ...prev,
      successful_strategies: (prev.successful_strategies || []).filter((_, i) => i !== index),
    }));
  };

  const addTrigger = () => {
    if (!newTrigger.trim()) return;
    setProfile(prev => ({
      ...prev,
      challenging_triggers: [...(prev.challenging_triggers || []), newTrigger.trim()],
    }));
    setNewTrigger('');
  };

  const removeTrigger = (index: number) => {
    setProfile(prev => ({
      ...prev,
      challenging_triggers: (prev.challenging_triggers || []).filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-bounce text-4xl">🧠</div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            {child?.name?.split(' ')[0]}&apos;s Profile
          </h2>
          <p className="text-sm text-gray-500">Developmental & behavioral insights</p>
        </div>
        <Link
          href={`/montree/dashboard/guru?child=${childId}`}
          className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors flex items-center gap-2"
        >
          🔮 Ask Guru
        </Link>
      </div>

      {/* Temperament Section */}
      <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🎭</span> Temperament
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Rate each trait from 1-5 based on your observations
        </p>

        <Slider
          trait="activity_level"
          value={profile.temperament_activity_level}
          onChange={(v) => updateTemperament('activity_level', v)}
        />
        <Slider
          trait="persistence"
          value={profile.temperament_persistence}
          onChange={(v) => updateTemperament('persistence', v)}
        />
        <Slider
          trait="distractibility"
          value={profile.temperament_distractibility}
          onChange={(v) => updateTemperament('distractibility', v)}
        />
        <Slider
          trait="adaptability"
          value={profile.temperament_adaptability}
          onChange={(v) => updateTemperament('adaptability', v)}
        />
        <Slider
          trait="intensity"
          value={profile.temperament_intensity}
          onChange={(v) => updateTemperament('intensity', v)}
        />
        <Slider
          trait="sensory_threshold"
          value={profile.temperament_sensory_threshold}
          onChange={(v) => updateTemperament('sensory_threshold', v)}
        />
      </section>

      {/* Focus Section */}
      <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🎯</span> Focus & Learning
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Baseline Focus (minutes)
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={profile.baseline_focus_minutes || ''}
              onChange={(e) => setProfile(prev => ({
                ...prev,
                baseline_focus_minutes: parseInt(e.target.value) || undefined,
              }))}
              placeholder="e.g., 10"
              className="w-full p-2 border rounded-lg bg-gray-50"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Optimal Work Time
            </label>
            <select
              value={profile.optimal_time_of_day || ''}
              onChange={(e) => setProfile(prev => ({
                ...prev,
                optimal_time_of_day: e.target.value || undefined,
              }))}
              className="w-full p-2 border rounded-lg bg-gray-50"
            >
              <option value="">Select...</option>
              <option value="morning">Morning</option>
              <option value="midday">Midday</option>
              <option value="afternoon">Afternoon</option>
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Visual</label>
            <input
              type="range"
              min={1}
              max={5}
              value={profile.learning_modality_visual || 3}
              onChange={(e) => setProfile(prev => ({
                ...prev,
                learning_modality_visual: parseInt(e.target.value),
              }))}
              className="w-full accent-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Auditory</label>
            <input
              type="range"
              min={1}
              max={5}
              value={profile.learning_modality_auditory || 3}
              onChange={(e) => setProfile(prev => ({
                ...prev,
                learning_modality_auditory: parseInt(e.target.value),
              }))}
              className="w-full accent-violet-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Kinesthetic</label>
            <input
              type="range"
              min={1}
              max={5}
              value={profile.learning_modality_kinesthetic || 3}
              onChange={(e) => setProfile(prev => ({
                ...prev,
                learning_modality_kinesthetic: parseInt(e.target.value),
              }))}
              className="w-full accent-violet-500"
            />
          </div>
        </div>
      </section>

      {/* Sensitive Periods */}
      <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>🌱</span> Sensitive Periods
        </h3>

        <div className="space-y-3">
          {SENSITIVE_PERIODS.map(period => (
            <div key={period.key} className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-700">{period.label}</span>
                <p className="text-xs text-gray-400">{period.description}</p>
              </div>
              <div className="flex gap-1">
                {SENSITIVE_PERIOD_OPTIONS.map(option => {
                  const currentValue = profile[`sensitive_period_${period.key}` as keyof MentalProfile] || 'active';
                  const isSelected = currentValue === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => updateSensitivePeriod(period.key, option.value)}
                      className={`px-2 py-1 text-xs rounded-lg transition-all ${
                        isSelected
                          ? option.color + ' font-medium'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Family Context */}
      <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>👨‍👩‍👧</span> Family Context
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Family Notes
            </label>
            <textarea
              value={profile.family_notes || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, family_notes: e.target.value }))}
              placeholder="New sibling, recent move, custody arrangement, etc."
              className="w-full p-3 border rounded-lg bg-gray-50 resize-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Sleep Status
            </label>
            <select
              value={profile.sleep_status || 'normal'}
              onChange={(e) => setProfile(prev => ({ ...prev, sleep_status: e.target.value }))}
              className="w-full p-2 border rounded-lg bg-gray-50"
            >
              <option value="normal">Normal</option>
              <option value="disrupted">Disrupted (temporary)</option>
              <option value="concerning">Concerning (ongoing)</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Special Considerations
            </label>
            <textarea
              value={profile.special_considerations || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, special_considerations: e.target.value }))}
              placeholder="Allergies, medical conditions, IEP, etc."
              className="w-full p-3 border rounded-lg bg-gray-50 resize-none"
              rows={2}
            />
          </div>
        </div>
      </section>

      {/* What Works / Triggers */}
      <section className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span>✨</span> What Works & Triggers
        </h3>

        {/* Successful Strategies */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Successful Strategies
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newStrategy}
              onChange={(e) => setNewStrategy(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStrategy()}
              placeholder="Add a strategy that works..."
              className="flex-1 p-2 border rounded-lg bg-gray-50"
            />
            <button
              onClick={addStrategy}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(profile.successful_strategies || []).map((s, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm flex items-center gap-2"
              >
                {s}
                <button onClick={() => removeStrategy(i)} className="hover:text-green-900">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Challenging Triggers */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Challenging Triggers
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTrigger()}
              placeholder="Add a known trigger..."
              className="flex-1 p-2 border rounded-lg bg-gray-50"
            />
            <button
              onClick={addTrigger}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(profile.challenging_triggers || []).map((t, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm flex items-center gap-2"
              >
                {t}
                <button onClick={() => removeTrigger(i)} className="hover:text-red-900">
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium rounded-lg
                     disabled:opacity-50 hover:from-violet-600 hover:to-indigo-700 transition-all"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
