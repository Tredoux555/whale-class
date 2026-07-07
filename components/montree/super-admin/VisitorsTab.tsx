'use client';

/**
 * VisitorsTab — Super-admin dashboard tab showing site visitor analytics.
 * Displays real-time visitor data with geolocation (country, city, flags).
 * Designed for monitoring outreach email campaign effectiveness.
 */

import { Fragment, useState, useEffect, useCallback, useRef } from 'react';

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

interface FunnelRow {
  country: string; // 2-letter code or 'ZZ'
  source: string;
  visits: number;
  signups: number;
  trials: number;
}

interface FunnelData {
  rows: FunnelRow[];
  totals: { visits: number; signups: number; trials: number };
  days: number;
}

interface GeoMatchSchool {
  id: string;
  org_name: string;
  has_email: boolean;
  status: string;
  town_hot: boolean;
  warm: boolean;
}

interface GeoMatchLocation {
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  visits: number;
  unique_visitors: number;
  last_seen: string;
  matched_country_label: string | null;
  schools_in_reach: number;
  schools: GeoMatchSchool[];
  warm: boolean;
  town_hot: boolean;
}

interface GeoMatchData {
  days: number;
  locations: GeoMatchLocation[];
  country_summary: Array<{
    country: string; total: number; emailable: number;
    new: number; drafted: number; sent: number; replied: number;
    bounced: number; converted: number; dead: number;
  }>;
  country_options: string[];
  total_visits: number;
  location_count: number;
}

function statusChipClass(status: string): string {
  switch (status) {
    case 'sent': return 'bg-blue-600/30 text-blue-300';
    case 'replied': return 'bg-emerald-600/30 text-emerald-300';
    case 'converted': return 'bg-green-600/40 text-green-200';
    case 'meeting_booked': return 'bg-purple-600/30 text-purple-300';
    case 'drafted': return 'bg-amber-600/30 text-amber-300';
    case 'bounced': return 'bg-red-600/30 text-red-300';
    case 'dead': return 'bg-slate-600/40 text-slate-400';
    default: return 'bg-slate-700/60 text-slate-300'; // new / unknown
  }
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

function shortenUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') return '/';
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
  const [view, setView] = useState<'live' | 'countries' | 'pages' | 'cities' | 'funnel' | 'geo'>('live');
  const [error, setError] = useState<string | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const funnelAbortRef = useRef<AbortController | null>(null);

  // 🗺 Geo Match view state.
  const [geo, setGeo] = useState<GeoMatchData | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoCountry, setGeoCountry] = useState<string>('');
  const [geoOnlyWithSchools, setGeoOnlyWithSchools] = useState(false);
  const [geoExpanded, setGeoExpanded] = useState<Set<string>>(new Set());
  const geoAbortRef = useRef<AbortController | null>(null);

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

  // Ad-geo attribution funnel (country × source → visits / signups / trials).
  const fetchFunnel = useCallback(async () => {
    if (!saToken) return;
    funnelAbortRef.current?.abort();
    const ac = new AbortController();
    funnelAbortRef.current = ac;
    setFunnelLoading(true);
    setFunnelError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/traffic-funnel?days=${days}`, {
        headers: { 'x-super-admin-token': saToken },
        signal: ac.signal,
      });
      if (!res.ok) {
        setFunnelError(`Failed to load funnel (${res.status})`);
        return;
      }
      const data = await res.json();
      setFunnel(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFunnelError('Failed to load funnel');
    } finally {
      setFunnelLoading(false);
    }
  }, [saToken, days]);

  // Load the funnel lazily — only when the funnel view is open (or days change while open).
  useEffect(() => {
    if (view !== 'funnel') return;
    fetchFunnel();
    return () => funnelAbortRef.current?.abort();
  }, [view, fetchFunnel]);

  // 🗺 Geo Match — visitor locations cross-referenced with the outreach school list.
  const fetchGeo = useCallback(async () => {
    if (!saToken) return;
    geoAbortRef.current?.abort();
    const ac = new AbortController();
    geoAbortRef.current = ac;
    setGeoLoading(true);
    setGeoError(null);
    try {
      const params = new URLSearchParams({ days: String(days), min_visits: '1' });
      if (geoCountry) params.set('country', geoCountry);
      const res = await fetch(`/api/montree/super-admin/geo-match?${params}`, {
        headers: { 'x-super-admin-token': saToken },
        signal: ac.signal,
      });
      if (!res.ok) {
        // JSON-before-OK: surface the real server error when present.
        let detail = `(${res.status})`;
        try {
          const body = await res.json();
          if (body?.error) detail = `${body.error} (${res.status})`;
        } catch { /* non-JSON body */ }
        setGeoError(`Failed to load geo match ${detail}`);
        return;
      }
      const data = await res.json();
      setGeo(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[VisitorsTab] Geo error:', err);
      setGeoError('Failed to load geo match');
    } finally {
      setGeoLoading(false);
    }
  }, [saToken, days, geoCountry]);

  // Load geo match lazily — only when the geo view is open (or days/country change while open).
  useEffect(() => {
    if (view !== 'geo') return;
    fetchGeo();
    return () => geoAbortRef.current?.abort();
  }, [view, fetchGeo]);

  // Auto-refresh every 60s (skip when tab is hidden)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchVisitors();
    }, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') fetchVisitors();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
          {(['live', 'countries', 'cities', 'pages', 'funnel', 'geo'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize ${
                view === v
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {v === 'live' ? '\u{1F4E1} Live' : v === 'countries' ? '\u{1F30D} Countries' : v === 'cities' ? '\u{1F3D9} Cities' : v === 'pages' ? '\u{1F4C4} Pages' : v === 'funnel' ? '\u{1F3AF} Funnel' : '\u{1F5FA}\u{FE0F} Geo Match'}
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
                  {v.referrer && typeof v.referrer === 'string' && (
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

      {/* Funnel View — ad-geo attribution: country × source → visits / signups / trials */}
      {view === 'funnel' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            First-touch attribution over the last {days} day{days !== 1 ? 's' : ''}. Source = utm_source /
            referrer class for visits, and the school&apos;s stamped acquisition source for signups.
            Aggregates only — no personal data.
          </div>

          {funnelError && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center justify-between">
              <span>{funnelError}</span>
              <button
                onClick={fetchFunnel}
                className="ml-3 px-3 py-1 rounded text-xs font-medium bg-red-700/40 hover:bg-red-700/60 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {funnelLoading && !funnel && (
            <div className="text-center py-12 text-slate-500">Loading funnel...</div>
          )}

          {funnel && (
            <>
              {/* Totals */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{funnel.totals.visits}</div>
                  <div className="text-xs text-slate-400 mt-1">Visits</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{funnel.totals.signups}</div>
                  <div className="text-xs text-slate-400 mt-1">Signups</div>
                </div>
                <div className="bg-slate-800 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">{funnel.totals.trials}</div>
                  <div className="text-xs text-slate-400 mt-1">Trial schools</div>
                </div>
              </div>

              {funnel.rows.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No attribution data in the last {days} days
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700/60">
                        <th className="text-left font-medium py-2 px-2">Country</th>
                        <th className="text-left font-medium py-2 px-2">Source</th>
                        <th className="text-right font-medium py-2 px-2">Visits</th>
                        <th className="text-right font-medium py-2 px-2">Signups</th>
                        <th className="text-right font-medium py-2 px-2">Trials</th>
                        <th className="text-right font-medium py-2 px-2">Conv %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnel.rows.map((r, i) => {
                        const conv = r.visits > 0 ? (r.signups / r.visits) * 100 : null;
                        return (
                          <tr
                            key={`${r.country}-${r.source}-${i}`}
                            className="border-b border-slate-800/60 hover:bg-slate-800/40"
                          >
                            <td className="py-2 px-2 text-white">
                              <span className="mr-1.5">
                                {getCountryFlag(r.country === 'ZZ' ? null : r.country)}
                              </span>
                              {r.country}
                            </td>
                            <td className="py-2 px-2">
                              <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-200 text-xs">
                                {r.source}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right text-blue-300">{r.visits}</td>
                            <td className="py-2 px-2 text-right text-emerald-300 font-medium">{r.signups}</td>
                            <td className="py-2 px-2 text-right text-amber-300">{r.trials}</td>
                            <td className="py-2 px-2 text-right text-slate-400">
                              {conv === null ? '—' : `${conv.toFixed(1)}%`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 🗺 Geo Match View — visitor locations cross-referenced with the outreach school list */}
      {view === 'geo' && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">
            Visitor towns/regions over the last {days} day{days !== 1 ? 's' : ''}, matched to Montessori
            schools on the outreach list. Matching is at the <span className="text-slate-400">country</span> level
            (visitor city geolocation is imprecise); the town is shown as a hint only. 🔥 = a school we already
            emailed, visited afterwards. Aggregates only — no IP addresses.
          </div>

          {/* Geo filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={geoCountry}
              onChange={e => setGeoCountry(e.target.value)}
              className="px-3 py-1.5 rounded text-sm bg-slate-800 text-slate-200 border border-slate-700"
            >
              <option value="">All countries</option>
              {(geo?.country_options || []).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={geoOnlyWithSchools}
                onChange={e => setGeoOnlyWithSchools(e.target.checked)}
                className="accent-emerald-500"
              />
              Only locations with schools
            </label>
            <button
              onClick={fetchGeo}
              disabled={geoLoading}
              className="px-3 py-1.5 rounded text-sm font-medium bg-slate-800 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              {geoLoading ? '\u{23F3}' : '\u{1F504}'} Refresh
            </button>
          </div>

          {geoError && (
            <div className="bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-red-300 text-sm flex items-center justify-between">
              <span>{geoError}</span>
              <button
                onClick={fetchGeo}
                className="ml-3 px-3 py-1 rounded text-xs font-medium bg-red-700/40 hover:bg-red-700/60 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {geoLoading && !geo && (
            <div className="text-center py-12 text-slate-500">Loading geo match...</div>
          )}

          {geo && (
            <>
              {/* Country summary strip */}
              {geo.country_summary.length > 0 && (
                <div className="bg-slate-800/40 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-2">Schools on the outreach list for visitor countries</div>
                  <div className="flex flex-wrap gap-2">
                    {geo.country_summary.map(s => (
                      <div key={s.country} className="bg-slate-800 rounded px-3 py-1.5 text-xs">
                        <span className="text-white font-medium">{s.country}</span>
                        <span className="text-slate-400 ml-2">{s.total} schools</span>
                        <span className="text-emerald-400 ml-2">{s.emailable} ✉️</span>
                        {s.sent > 0 && <span className="text-blue-300 ml-2">{s.sent} sent</span>}
                        {s.replied > 0 && <span className="text-emerald-300 ml-2">{s.replied} replied</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(() => {
                const rows = geoOnlyWithSchools
                  ? geo.locations.filter(l => l.schools_in_reach > 0)
                  : geo.locations;
                if (rows.length === 0) {
                  return (
                    <div className="text-center py-8 text-slate-500">
                      No {geoOnlyWithSchools ? 'locations with schools' : 'visitor locations'} in the last {days} days
                    </div>
                  );
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 text-xs border-b border-slate-700/60">
                          <th className="text-left font-medium py-2 px-2">Town / Region / Country</th>
                          <th className="text-right font-medium py-2 px-2">Visits</th>
                          <th className="text-right font-medium py-2 px-2">Uniq</th>
                          <th className="text-right font-medium py-2 px-2">Last seen</th>
                          <th className="text-right font-medium py-2 px-2">Schools</th>
                          <th className="text-left font-medium py-2 px-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((loc, i) => {
                          const key = `${loc.country_code || ''}|${loc.country || ''}|${loc.city || ''}|${loc.region || ''}|${i}`;
                          const isOpen = geoExpanded.has(key);
                          const toggle = () => {
                            setGeoExpanded(prev => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key); else next.add(key);
                              return next;
                            });
                          };
                          return (
                            <Fragment key={key}>
                              <tr
                                className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer"
                                onClick={loc.schools_in_reach > 0 ? toggle : undefined}
                              >
                                <td className="py-2 px-2 text-white">
                                  <span className="mr-1.5">{getCountryFlag(loc.country_code)}</span>
                                  <span className="font-medium">{loc.city || loc.region || loc.country || 'Unknown'}</span>
                                  {loc.region && loc.city && (
                                    <span className="text-slate-500 text-xs ml-2">{loc.region}</span>
                                  )}
                                  {loc.country && (loc.city || loc.region) && (
                                    <span className="text-slate-600 text-xs ml-2">{loc.country}</span>
                                  )}
                                  {loc.warm && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-orange-600/30 text-orange-300 text-xs" title="A school we emailed, then visited">🔥 warm</span>
                                  )}
                                  {loc.town_hot && (
                                    <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-600/20 text-amber-300 text-xs" title="Visitor town appears in a matched school's region">📍 town</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-right text-blue-300">{loc.visits}</td>
                                <td className="py-2 px-2 text-right text-slate-400">{loc.unique_visitors}</td>
                                <td className="py-2 px-2 text-right text-slate-500 text-xs">{formatTimeAgo(loc.last_seen)}</td>
                                <td className="py-2 px-2 text-right text-emerald-300 font-medium">{loc.schools_in_reach}</td>
                                <td className="py-2 px-2 text-left text-slate-500 text-xs">
                                  {loc.schools_in_reach > 0 ? (isOpen ? '▲ hide' : '▼ show') : '—'}
                                </td>
                              </tr>
                              {isOpen && loc.schools.length > 0 && (
                                <tr className="border-b border-slate-800/60 bg-slate-900/40">
                                  <td colSpan={6} className="py-2 px-2">
                                    <div className="space-y-1">
                                      {loc.schools.map(sch => (
                                        <div key={sch.id} className="flex items-center gap-2 flex-wrap text-xs">
                                          <span className="text-slate-200">{sch.org_name}</span>
                                          <span className={`px-1.5 py-0.5 rounded ${statusChipClass(sch.status)}`}>{sch.status}</span>
                                          {sch.has_email
                                            ? <span className="text-emerald-400" title="Has email">✉️</span>
                                            : <span className="text-slate-600" title="No email on file">no email</span>}
                                          {sch.warm && <span className="text-orange-300" title="Emailed, then this location visited">🔥</span>}
                                          {sch.town_hot && <span className="text-amber-300" title="Town matches visitor city">📍</span>}
                                        </div>
                                      ))}
                                      {loc.schools_in_reach > loc.schools.length && (
                                        <div className="text-slate-600 text-xs pt-1">
                                          +{loc.schools_in_reach - loc.schools.length} more (capped at {loc.schools.length})
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
