'use client';

/**
 * VisitorsTab — Super-admin dashboard tab showing site visitor analytics.
 * Displays real-time visitor data with geolocation (country, city, flags).
 * Designed for monitoring outreach email campaign effectiveness.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface Visitor {
  id: string;
  ip: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  region: string | null;
  timezone: string | null;
  page_url: string;
  referrer: string | null;
  user_agent: string | null;
  fingerprint: string | null;
  visited_at: string;
}

interface CountryBreakdown {
  country: string;
  country_code: string | null;
  count: number;
}

interface TopPage {
  url: string;
  count: number;
}

interface TopCity {
  city: string;
  country: string | null;
  count: number;
}

interface VisitorStats {
  unique_visitors: number;
  total_page_views: number;
  country_breakdown: CountryBreakdown[];
  top_pages: TopPage[];
  top_cities: TopCity[];
  days: number;
}

interface VisitorsTabProps {
  saToken: string;
}

function getCountryFlag(countryCode: string | null): string {
  try {
    if (!countryCode || countryCode.length !== 2) return '\u{1F30D}';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '\u{1F30D}';
  }
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function shortenUrl(url: string): string {
  return url.replace(/^\/montree/, '').replace(/^\//, '') || '/';
}

function shortenUA(ua: string | null): string {
  if (!ua) return '—';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
}

export default function VisitorsTab({ saToken }: VisitorsTabProps) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [view, setView] = useState<'live' | 'countries' | 'pages' | 'cities'>('live');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchVisitors = useCallback(async () => {
    if (!saToken) {
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);
    setStats(null);
    try {
      const params = new URLSearchParams({
        days: String(days),
        limit: '200',
      });
      if (countryFilter) params.set('country', countryFilter);

      const res = await fetch(`/api/montree/visitors?${params}`, {
        headers: { 'x-super-admin-token': saToken },
        signal: ac.signal,
      });

      if (!res.ok) {
        console.error('[VisitorsTab] Fetch failed:', res.status);
        setError(`Failed to load visitors (${res.status})`);
        return;
      }

      const data = await res.json();
      setVisitors(data.visitors || []);
      setStats(data.stats || null);
      setTotal(data.total || 0);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[VisitorsTab] Error:', err);
      setError('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  }, [saToken, days, countryFilter]);

  useEffect(() => {
    fetchVisitors();
    return () => abortRef.current?.abort();
  }, [fetchVisitors]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(fetchVisitors, 60_000);
    return () => clearInterval(interval);
  }, [fetchVisitors]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{stats.unique_visitors}</div>
            <div className="text-xs text-slate-400 mt-1">Unique Visitors</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{stats.total_page_views}</div>
            <div className="text-xs text-slate-400 mt-1">Page Views</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">{stats.country_breakdown.length}</div>
            <div className="text-xs text-slate-400 mt-1">Countries</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{stats.top_cities.length}</div>
            <div className="text-xs text-slate-400 mt-1">Cities</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range */}
        <div className="flex gap-1">
          {[1, 3, 7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                days === d
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex gap-1 ml-auto">
          {(['live', 'countries', 'cities', 'pages'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
                view === v
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {v === 'live' ? '\u{1F4E1} Live' : v === 'countries' ? '\u{1F30D} Countries' : v === 'cities' ? '\u{1F3D9} Cities' : '\u{1F4C4} Pages'}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={fetchVisitors}
          disabled={loading}
          className="px-3 py-1.5 rounded text-sm font-medium bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? '\u{23F3}' : '\u{1F504}'} Refresh
        </button>

        {/* Country filter clear */}
        {countryFilter && (
          <button
            onClick={() => setCountryFilter(null)}
            className="px-3 py-1.5 rounded text-sm font-medium bg-red-600/30 text-red-300 hover:bg-red-600/50 transition-colors"
          >
            \u{2715} {countryFilter}
          </button>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchVisitors}
            className="ml-3 px-3 py-1 rounded text-xs font-medium bg-red-700/40 hover:bg-red-700/60 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Live Feed View */}
      {view === 'live' && (
        <div className="space-y-2">
          {loading && visitors.length === 0 && (
            <div className="text-center py-12 text-slate-500">Loading visitors...</div>
          )}
          {!loading && visitors.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No visitors in the last {days} day{days !== 1 ? 's' : ''}
              {countryFilter ? ` from ${countryFilter}` : ''}
            </div>
          )}
          <div className="text-xs text-slate-500 mb-2">{total} total visits</div>
          {visitors.map(v => (
            <div
              key={v.id}
              className="bg-slate-800/60 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors"
            >
              {/* Flag */}
              <span className="text-2xl flex-shrink-0" title={v.country || 'Unknown'}>
                {getCountryFlag(v.country_code)}
              </span>

              {/* Location + Page */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium text-sm">
                    {v.city || v.country || 'Unknown'}
                  </span>
                  {v.city && v.country && (
                    <span className="text-slate-500 text-xs">{v.country}</span>
                  )}
                  {v.country && (
                    <button
                      onClick={() => setCountryFilter(v.country)}
                      className="text-slate-600 hover:text-emerald-400 text-xs transition-colors"
                      title="Filter by country"
                    >
                      [filter]
                    </button>
                  )}
                </div>
                <div className="text-slate-400 text-xs truncate mt-0.5">
                  {shortenUrl(v.page_url)}
                  {v.referrer && (
                    <span className="text-slate-600 ml-2">
                      via {v.referrer.replace(/^https?:\/\//, '').split('/')[0]}
                    </span>
                  )}
                </div>
              </div>

              {/* Device + Time */}
              <div className="flex-shrink-0 text-right">
                <div className="text-xs text-slate-500">{shortenUA(v.user_agent)}</div>
                <div className="text-xs text-slate-600">{formatTimeAgo(v.visited_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Countries View */}
      {view === 'countries' && !stats && loading && (
        <div className="text-center py-12 text-slate-500">Loading country data...</div>
      )}
      {view === 'countries' && stats && (
        <div className="space-y-2">
          {stats.country_breakdown.length === 0 && (
            <div className="text-center py-8 text-slate-500">No country data</div>
          )}
          {stats.country_breakdown.map(c => {
            const pct = stats.total_page_views > 0 ? ((c.count / stats.total_page_views) * 100) : 0;
            return (
              <div
                key={c.country}
                className="bg-slate-800/60 rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors"
                onClick={() => { setCountryFilter(c.country); setView('live'); }}
              >
                <span className="text-2xl flex-shrink-0">{getCountryFlag(c.country_code)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium text-sm">{c.country}</div>
                  <div className="h-1.5 bg-slate-700 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-emerald-400 font-bold text-lg">{c.count}</div>
                  <div className="text-xs text-slate-500">{pct.toFixed(1)}%</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cities View */}
      {view === 'cities' && !stats && loading && (
        <div className="text-center py-12 text-slate-500">Loading city data...</div>
      )}
      {view === 'cities' && stats && (
        <div className="space-y-2">
          {stats.top_cities.length === 0 && (
            <div className="text-center py-8 text-slate-500">No city data</div>
          )}
          {stats.top_cities.map((c, i) => (
            <div
              key={`${c.city}-${c.country}-${i}`}
              className="bg-slate-800/60 rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <span className="text-slate-500 font-mono text-sm w-6 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium text-sm">{c.city}</span>
                {c.country && <span className="text-slate-500 text-xs ml-2">{c.country}</span>}
              </div>
              <span className="text-blue-400 font-bold">{c.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Pages View */}
      {view === 'pages' && !stats && loading && (
        <div className="text-center py-12 text-slate-500">Loading page data...</div>
      )}
      {view === 'pages' && stats && (
        <div className="space-y-2">
          {stats.top_pages.length === 0 && (
            <div className="text-center py-8 text-slate-500">No page data</div>
          )}
          {stats.top_pages.map((p, i) => (
            <div
              key={p.url}
              className="bg-slate-800/60 rounded-lg px-4 py-3 flex items-center gap-3"
            >
              <span className="text-slate-500 font-mono text-sm w-6 text-right">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium text-sm truncate block">{shortenUrl(p.url)}</span>
              </div>
              <span className="text-purple-400 font-bold">{p.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
