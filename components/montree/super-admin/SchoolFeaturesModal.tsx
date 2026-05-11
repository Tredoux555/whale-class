'use client';

import { useState, useEffect, useCallback } from 'react';

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
}

interface SchoolFeaturesModalProps {
  schoolId: string;
  schoolName: string;
  onClose: () => void;
  sessionToken: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  dashboard: '📊 Dashboard',
  ai_tools: '🧠 AI Tools',
  management: '⚙️ Management',
  media: '📷 Photo & Media',
  reporting: '📝 Reports',
  learning: '📚 Library & Tools',
  reading: '📖 Reading',
  planning: '📋 Planning',
  communication: '💬 Communication',
  general: '🔧 General',
};

export default function SchoolFeaturesModal({ schoolId, schoolName, onClose, sessionToken }: SchoolFeaturesModalProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const loadFeatures = useCallback(async () => {
    try {
      const res = await fetch(`/api/montree/features?school_id=${schoolId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeatures(data.features || []);
    } catch (err) {
      console.error('Failed to load features:', err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  const toggleFeature = async (featureKey: string, currentEnabled: boolean) => {
    setToggling(featureKey);
    try {
      const res = await fetch('/api/montree/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-super-admin-token': sessionToken,
        },
        body: JSON.stringify({
          school_id: schoolId,
          feature_key: featureKey,
          enabled: !currentEnabled,
          enabled_by: 'super_admin',
        }),
      });
      if (res.ok) {
        // Update locally
        setFeatures(prev => prev.map(f =>
          f.feature_key === featureKey
            ? { ...f, enabled: !currentEnabled, school_enabled: !currentEnabled }
            : f
        ));
      }
    } catch (err) {
      console.error('Toggle error:', err);
    } finally {
      setToggling(null);
    }
  };

  const enableAll = async () => {
    for (const f of features) {
      if (!f.enabled) {
        await toggleFeature(f.feature_key, false); // false = current state, toggles to true
      }
    }
  };

  const disableAll = async () => {
    for (const f of features) {
      if (f.enabled) {
        await toggleFeature(f.feature_key, true); // true = current state, toggles to false
      }
    }
  };

  // Group by category
  const grouped = features.reduce<Record<string, Feature[]>>((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  // Sort categories: dashboard first, then ai_tools, then rest
  const categoryOrder = ['dashboard', 'ai_tools', 'management', 'media', 'reporting', 'learning', 'reading', 'planning', 'communication', 'general'];
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const enabledCount = features.filter(f => f.enabled).length;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1f2e] border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-700/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white tracking-tight">{schoolName}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {enabledCount}/{features.length} features enabled
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Bulk actions */}
        <div className="px-6 py-3 flex gap-2 border-b border-slate-700/50 bg-slate-900/30">
          <button
            onClick={enableAll}
            className="px-3 py-1.5 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 rounded-md text-xs font-medium transition-colors"
          >
            Enable all
          </button>
          <button
            onClick={disableAll}
            className="px-3 py-1.5 bg-red-500/15 text-red-300 hover:bg-red-500/25 rounded-md text-xs font-medium transition-colors"
          >
            Disable all
          </button>
        </div>

        {/* Feature list */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading features...</div>
          ) : (
            <div className="space-y-7">
              {sortedCategories.map(cat => (
                <div key={cat}>
                  <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-3 pl-1">
                    {CATEGORY_LABELS[cat] || cat}
                  </h3>
                  <div className="space-y-1.5">
                    {grouped[cat].map(f => (
                      <button
                        key={f.feature_key}
                        onClick={() => toggleFeature(f.feature_key, f.enabled)}
                        disabled={toggling === f.feature_key}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg transition-colors text-left ${
                          f.enabled
                            ? 'bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/15'
                            : 'bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600/60'
                        } disabled:opacity-60`}
                      >
                        <span className="text-base flex-shrink-0">{f.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${f.enabled ? 'text-emerald-200' : 'text-slate-200'}`}>
                              {f.name}
                            </span>
                            {f.is_premium && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px] font-bold tracking-wide">
                                PRO
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`w-9 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ${
                          f.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-600 justify-start'
                        }`}>
                          <div className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
