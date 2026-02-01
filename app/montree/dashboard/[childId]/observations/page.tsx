// /montree/dashboard/[childId]/observations/page.tsx
// Behavioral Observation Logging with ABC Model
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { getSession } from '@/lib/montree/auth';

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

const BEHAVIOR_FUNCTIONS = [
  { value: 'attention', label: '👀 Attention', description: 'Seeking connection or recognition' },
  { value: 'escape', label: '🏃 Escape', description: 'Avoiding a task or situation' },
  { value: 'sensory', label: '✨ Sensory', description: 'Seeking or avoiding sensory input' },
  { value: 'tangible', label: '🎁 Tangible', description: 'Wanting an object or activity' },
  { value: 'unknown', label: '❓ Unknown', description: 'Not yet determined' },
];

const TIME_OF_DAY = [
  { value: 'arrival', label: 'Arrival' },
  { value: 'morning_work', label: 'Morning Work' },
  { value: 'snack', label: 'Snack' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'afternoon_work', label: 'Afternoon Work' },
  { value: 'dismissal', label: 'Dismissal' },
];

const EFFECTIVENESS = [
  { value: 'effective', label: '✅ Effective', color: 'bg-green-100 text-green-700' },
  { value: 'partially', label: '⚡ Partial', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'ineffective', label: '❌ Ineffective', color: 'bg-red-100 text-red-700' },
  { value: 'not_applicable', label: '➖ N/A', color: 'bg-gray-100 text-gray-600' },
];

export default function ObservationsPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;

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
      .then(r => r.json())
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
      toast.error('Please describe the behavior');
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
        toast.success('Observation saved!');
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
        toast.error(data.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save observation');
    }
    setSaving(false);
  };

  const deleteObservation = async (id: string) => {
    if (!confirm('Delete this observation?')) return;

    try {
      const res = await fetch(`/api/montree/observations?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Deleted');
        fetchObservations();
      }
    } catch {
      toast.error('Failed to delete');
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
          <h2 className="text-xl font-bold text-gray-800">
            Observations
          </h2>
          <p className="text-sm text-gray-500">
            Track behaviors with the ABC model
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 transition-colors flex items-center gap-2"
        >
          {showForm ? '✕ Close' : '+ New'}
        </button>
      </div>

      {/* New Observation Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h3 className="font-bold text-gray-800 mb-4">New Observation</h3>

          {/* ABC Model Explanation */}
          <div className="bg-violet-50 rounded-lg p-3 mb-4 text-sm">
            <p className="font-medium text-violet-800 mb-1">ABC Model</p>
            <p className="text-violet-600">
              <strong>A</strong>ntecedent (what happened before) →{' '}
              <strong>B</strong>ehavior (what the child did) →{' '}
              <strong>C</strong>onsequence (what happened after)
            </p>
          </div>

          {/* Antecedent */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              A: What happened before? (Antecedent)
            </label>
            <input
              type="text"
              value={form.antecedent}
              onChange={(e) => setForm(prev => ({ ...prev, antecedent: e.target.value }))}
              placeholder="e.g., Teacher asked to put away work..."
              className="w-full p-3 border rounded-lg bg-gray-50"
            />
          </div>

          {/* Behavior */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              B: What did the child do? (Behavior) *
            </label>
            <textarea
              value={form.behavior_description}
              onChange={(e) => setForm(prev => ({ ...prev, behavior_description: e.target.value }))}
              placeholder="Describe the specific behavior observed..."
              className="w-full p-3 border rounded-lg bg-gray-50 resize-none"
              rows={3}
            />
          </div>

          {/* Consequence */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              C: What happened after? (Consequence)
            </label>
            <input
              type="text"
              value={form.consequence}
              onChange={(e) => setForm(prev => ({ ...prev, consequence: e.target.value }))}
              placeholder="e.g., Teacher redirected to another work..."
              className="w-full p-3 border rounded-lg bg-gray-50"
            />
          </div>

          {/* Behavior Function */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-2">
              What function did this behavior serve?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BEHAVIOR_FUNCTIONS.map(func => (
                <button
                  key={func.value}
                  onClick={() => setForm(prev => ({ ...prev, behavior_function: func.value }))}
                  className={`p-3 rounded-lg text-left transition-all ${
                    form.behavior_function === func.value
                      ? 'bg-violet-100 border-2 border-violet-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <span className="font-medium">{func.label}</span>
                  <p className="text-xs text-gray-500">{func.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Time of Day
              </label>
              <select
                value={form.time_of_day}
                onChange={(e) => setForm(prev => ({ ...prev, time_of_day: e.target.value }))}
                className="w-full p-2 border rounded-lg bg-gray-50"
              >
                <option value="">Select...</option>
                {TIME_OF_DAY.map(time => (
                  <option key={time.value} value={time.value}>{time.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Activity
              </label>
              <input
                type="text"
                value={form.activity_during}
                onChange={(e) => setForm(prev => ({ ...prev, activity_during: e.target.value }))}
                placeholder="e.g., Math work"
                className="w-full p-2 border rounded-lg bg-gray-50"
              />
            </div>
          </div>

          {/* Intervention */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Intervention Used (if any)
            </label>
            <input
              type="text"
              value={form.intervention_used}
              onChange={(e) => setForm(prev => ({ ...prev, intervention_used: e.target.value }))}
              placeholder="e.g., Offered choice of two works..."
              className="w-full p-3 border rounded-lg bg-gray-50"
            />
          </div>

          {/* Effectiveness */}
          {form.intervention_used && (
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                How effective was the intervention?
              </label>
              <div className="flex gap-2">
                {EFFECTIVENESS.map(eff => (
                  <button
                    key={eff.value}
                    onClick={() => setForm(prev => ({ ...prev, effectiveness: eff.value }))}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      form.effectiveness === eff.value
                        ? eff.color + ' ring-2 ring-offset-1 ring-gray-400'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-medium rounded-lg
                     disabled:opacity-50 hover:from-violet-600 hover:to-indigo-700 transition-all"
          >
            {saving ? 'Saving...' : 'Save Observation'}
          </button>
        </div>
      )}

      {/* Detected Patterns */}
      {patterns.filter(p => p.still_active).length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 mb-4 border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <span>🔍</span> Detected Patterns
          </h3>
          <div className="space-y-2">
            {patterns.filter(p => p.still_active).map(pattern => (
              <div key={pattern.id} className="bg-white rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{pattern.pattern_description}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    pattern.confidence === 'high'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {pattern.confidence} confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
          <Link
            href={`/montree/dashboard/guru?child=${childId}`}
            className="mt-3 inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-800"
          >
            🔮 Ask Guru about these patterns →
          </Link>
        </div>
      )}

      {/* Observation List */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 mb-4">
          Recent Observations ({observations.length})
        </h3>

        {observations.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p>No observations yet</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-violet-600 hover:text-violet-800"
            >
              Add first observation →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {observations.map(obs => (
              <div key={obs.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400">
                        {new Date(obs.observed_at).toLocaleDateString()}{' '}
                        {obs.time_of_day && `• ${obs.time_of_day.replace('_', ' ')}`}
                      </span>
                      {obs.behavior_function && obs.behavior_function !== 'unknown' && (
                        <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full">
                          {BEHAVIOR_FUNCTIONS.find(f => f.value === obs.behavior_function)?.label}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800">{obs.behavior_description}</p>
                    {obs.antecedent && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Before:</span> {obs.antecedent}
                      </p>
                    )}
                    {obs.intervention_used && (
                      <p className="text-xs text-gray-500 mt-1">
                        <span className="font-medium">Tried:</span> {obs.intervention_used}
                        {obs.effectiveness && (
                          <span className={`ml-2 ${
                            obs.effectiveness === 'effective' ? 'text-green-600' :
                            obs.effectiveness === 'ineffective' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            ({obs.effectiveness})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteObservation(obs.id)}
                    className="text-gray-400 hover:text-red-500 p-1"
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
