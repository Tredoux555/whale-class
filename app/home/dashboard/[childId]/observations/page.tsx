'use client';

// /home/dashboard/[childId]/observations/page.tsx
// Observations page with ABC model tracking
// Behavioral, work, milestone observations for home learning context

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getHomeSession, type HomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface Observation {
  id: string;
  child_id: string;
  family_id: string;
  behavior_description: string;
  antecedent: string | null;
  behavior_function: string | null;
  consequence: string | null;
  time_of_day: string | null;
  activity_during: string | null;
  environmental_notes: string | null;
  intervention_used: string | null;
  effectiveness: string | null;
  observed_at: string;
  created_at: string;
}

interface ObservationFormData {
  behavior_description: string;
  antecedent: string;
  behavior_function: string;
  consequence: string;
  time_of_day: string;
  activity_during: string;
  environmental_notes: string;
  intervention_used: string;
  effectiveness: string;
}

const BEHAVIOR_FUNCTIONS = [
  { value: 'attention', label: 'Seeking Attention' },
  { value: 'escape', label: 'Escape/Avoidance' },
  { value: 'sensory', label: 'Sensory Stimulation' },
  { value: 'tangible', label: 'Seeking Tangible Item' },
  { value: 'unknown', label: 'Unknown' },
];

const TIME_OF_DAY = [
  { value: 'arrival', label: 'Arrival' },
  { value: 'morning_work', label: 'Morning Work' },
  { value: 'snack', label: 'Snack Time' },
  { value: 'outdoor', label: 'Outdoor Play' },
  { value: 'afternoon_work', label: 'Afternoon Work' },
  { value: 'dismissal', label: 'Dismissal' },
];

const EFFECTIVENESS = [
  { value: 'effective', label: 'Effective' },
  { value: 'partially', label: 'Partially Effective' },
  { value: 'ineffective', label: 'Ineffective' },
  { value: 'not_applicable', label: 'Not Applicable' },
];

export default function ObservationsPage() {
  const params = useParams();
  const childId = params.childId as string;

  const [session, setSession] = useState<HomeSession | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ObservationFormData>({
    behavior_description: '',
    antecedent: '',
    behavior_function: 'unknown',
    consequence: '',
    time_of_day: '',
    activity_during: '',
    environmental_notes: '',
    intervention_used: '',
    effectiveness: 'not_applicable',
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Load session and observations
  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) return;
    setSession(sess);

    loadObservations();
  }, [childId]);

  const loadObservations = async () => {
    try {
      const sess = getHomeSession();
      if (!sess) return;

      const res = await fetch(
        `/api/home/observations?child_id=${childId}&family_id=${sess.family.id}&limit=50&days=90`
      );
      const data = await res.json();

      if (data.success) {
        setObservations(data.observations || []);
      }
    } catch (err) {
      console.error('Failed to load observations:', err);
      toast.error('Failed to load observations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    if (!formData.behavior_description.trim()) {
      toast.error('Behavior description is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/home/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          family_id: session.family.id,
          behavior_description: formData.behavior_description,
          antecedent: formData.antecedent || null,
          behavior_function: formData.behavior_function,
          consequence: formData.consequence || null,
          time_of_day: formData.time_of_day || null,
          activity_during: formData.activity_during || null,
          environmental_notes: formData.environmental_notes || null,
          intervention_used: formData.intervention_used || null,
          effectiveness: formData.effectiveness,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Observation recorded');
        setFormData({
          behavior_description: '',
          antecedent: '',
          behavior_function: 'unknown',
          consequence: '',
          time_of_day: '',
          activity_during: '',
          environmental_notes: '',
          intervention_used: '',
          effectiveness: 'not_applicable',
        });
        setShowForm(false);
        loadObservations();
      } else {
        toast.error(data.error || 'Failed to save observation');
      }
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Failed to save observation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (observationId: string) => {
    if (!session) return;

    try {
      const res = await fetch(
        `/api/home/observations?id=${observationId}&family_id=${session.family.id}`,
        { method: 'DELETE' }
      );

      const data = await res.json();
      if (data.success) {
        toast.success('Observation deleted');
        setObservations((prev) => prev.filter((o) => o.id !== observationId));
        setDeleteConfirm(null);
      } else {
        toast.error('Failed to delete observation');
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete observation');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getBehaviorFunctionLabel = (value: string) => {
    return BEHAVIOR_FUNCTIONS.find((b) => b.value === value)?.label || value;
  };

  const getTimeOfDayLabel = (value: string) => {
    return TIME_OF_DAY.find((t) => t.value === value)?.label || value;
  };

  const getEffectivenessLabel = (value: string) => {
    return EFFECTIVENESS.find((e) => e.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center">
        <div className="animate-bounce text-3xl mb-2">📝</div>
        <p className="text-gray-500">Loading observations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header with button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Observations</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-xl font-medium hover:shadow-lg transition-all active:scale-95"
        >
          + Add Observation
        </button>
      </div>

      {/* Add Observation Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">Record Observation</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ABC Model Section */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
              <p className="text-sm font-semibold text-blue-900">ABC Model</p>

              {/* Antecedent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antecedent (What happened before?)
                </label>
                <textarea
                  value={formData.antecedent}
                  onChange={(e) => setFormData({ ...formData, antecedent: e.target.value })}
                  placeholder="Describe the situation or trigger..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>

              {/* Behavior */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Behavior (What did the child do?) *
                </label>
                <textarea
                  value={formData.behavior_description}
                  onChange={(e) => setFormData({ ...formData, behavior_description: e.target.value })}
                  placeholder="Describe the behavior in detail..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                  required
                />
              </div>

              {/* Consequence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Consequence (What happened after?)
                </label>
                <textarea
                  value={formData.consequence}
                  onChange={(e) => setFormData({ ...formData, consequence: e.target.value })}
                  placeholder="Describe the outcome or response..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={2}
                />
              </div>
            </div>

            {/* Behavior Function */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Likely Function of Behavior
              </label>
              <select
                value={formData.behavior_function}
                onChange={(e) => setFormData({ ...formData, behavior_function: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {BEHAVIOR_FUNCTIONS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Context */}
            <div className="grid grid-cols-2 gap-3">
              {/* Time of Day */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day</label>
                <select
                  value={formData.time_of_day}
                  onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select...</option>
                  {TIME_OF_DAY.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Activity During */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Activity</label>
                <input
                  type="text"
                  value={formData.activity_during}
                  onChange={(e) => setFormData({ ...formData, activity_during: e.target.value })}
                  placeholder="What activity was happening?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Intervention & Effectiveness */}
            <div className="grid grid-cols-2 gap-3">
              {/* Intervention Used */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Intervention Used
                </label>
                <input
                  type="text"
                  value={formData.intervention_used}
                  onChange={(e) => setFormData({ ...formData, intervention_used: e.target.value })}
                  placeholder="What did you do?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Effectiveness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Effectiveness</label>
                <select
                  value={formData.effectiveness}
                  onChange={(e) => setFormData({ ...formData, effectiveness: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {EFFECTIVENESS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Environmental Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Environmental Notes
              </label>
              <textarea
                value={formData.environmental_notes}
                onChange={(e) => setFormData({ ...formData, environmental_notes: e.target.value })}
                placeholder="Any environmental factors or other context..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Saving...' : 'Save Observation'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Observations List */}
      {observations.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <div className="text-3xl mb-2">📝</div>
          <p className="text-emerald-900 font-medium">No observations yet</p>
          <p className="text-emerald-700 text-sm mt-1">
            Start recording observations to track your child's learning journey and behaviors.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {observations.map((obs) => (
            <div
              key={obs.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    {obs.behavior_description.substring(0, 60)}...
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(obs.observed_at)}</p>
                </div>
                <button
                  onClick={() => setDeleteConfirm(obs.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === obs.id && (
                <div className="bg-red-50 border-t border-red-100 px-4 py-3 flex gap-2">
                  <p className="flex-1 text-sm text-red-900">Delete this observation?</p>
                  <button
                    onClick={() => handleDelete(obs.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Content */}
              {deleteConfirm !== obs.id && (
                <div className="px-4 py-4 space-y-3">
                  {/* ABC Model */}
                  <div className="space-y-2">
                    {obs.antecedent && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Antecedent:</span>
                        <p className="text-gray-600 mt-0.5">{obs.antecedent}</p>
                      </div>
                    )}
                    <div className="text-sm">
                      <span className="font-semibold text-gray-700">Behavior:</span>
                      <p className="text-gray-600 mt-0.5">{obs.behavior_description}</p>
                    </div>
                    {obs.consequence && (
                      <div className="text-sm">
                        <span className="font-semibold text-gray-700">Consequence:</span>
                        <p className="text-gray-600 mt-0.5">{obs.consequence}</p>
                      </div>
                    )}
                  </div>

                  {/* Metadata Badges */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {obs.behavior_function && obs.behavior_function !== 'unknown' && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {getBehaviorFunctionLabel(obs.behavior_function)}
                      </span>
                    )}
                    {obs.time_of_day && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        {getTimeOfDayLabel(obs.time_of_day)}
                      </span>
                    )}
                    {obs.effectiveness && obs.effectiveness !== 'not_applicable' && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          obs.effectiveness === 'effective'
                            ? 'bg-emerald-100 text-emerald-700'
                            : obs.effectiveness === 'partially'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {getEffectivenessLabel(obs.effectiveness)}
                      </span>
                    )}
                  </div>

                  {/* Additional Info */}
                  {(obs.activity_during || obs.intervention_used || obs.environmental_notes) && (
                    <div className="text-xs text-gray-600 space-y-1 border-t border-gray-100 pt-2 mt-2">
                      {obs.activity_during && <p>Activity: {obs.activity_during}</p>}
                      {obs.intervention_used && <p>Intervention: {obs.intervention_used}</p>}
                      {obs.environmental_notes && <p>Notes: {obs.environmental_notes}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
