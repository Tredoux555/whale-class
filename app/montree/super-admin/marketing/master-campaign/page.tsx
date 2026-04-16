'use client';
// @ts-nocheck
// Super-Admin — Master Campaign Dashboard
// The single source of truth for the Montree cold-email outreach list.
// 1,136 schools (786 global + 350 China), with deliverability audit columns baked in.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

export default function MasterCampaignPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setAuthenticated(true);
        sessionStorage.setItem('sa_pwd', password);
      } else {
        alert('Wrong password');
      }
    } catch { alert('Auth failed'); }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem('sa_pwd');
    if (saved) { setPassword(saved); setAuthenticated(true); }
  }, []);

  const fetchSummary = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    try {
      const pwd = sessionStorage.getItem('sa_pwd') || password;
      const res = await fetch('/api/montree/super-admin/master-outreach/summary', {
        headers: { 'x-super-admin-password': pwd },
      });
      if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`);
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authenticated, password]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const pwd = sessionStorage.getItem('sa_pwd') || password;
      const res = await fetch('/api/montree/super-admin/master-outreach/download', {
        headers: { 'x-super-admin-password': pwd },
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Montree_Master_Outreach_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-lg p-8 max-w-sm w-full">
          <h1 className="text-xl font-bold mb-4 text-white">🎯 Master Campaign</h1>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Super admin password"
            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg mb-4 text-white placeholder-slate-500"
            autoFocus
          />
          <button onClick={handleLogin} className="w-full bg-emerald-600 text-white py-3 rounded-lg font-semibold hover:bg-emerald-500">
            Access Campaign
          </button>
        </div>
      </div>
    );
  }

  const g = summary?.global;
  const c = summary?.china;
  const cam = summary?.campaigns;
  const deliverablePct = g ? Math.round((g.deliverable / g.with_email) * 100) : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/montree/super-admin/marketing" className="text-slate-400 hover:text-white transition-colors text-sm">
          ← Back to Marketing Hub
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>🎯</span> Master Campaign
        </h1>
        <p className="text-slate-400 mt-2">
          Single source of truth for the Montree cold-email outreach list.
          Deliverability-audited {summary?.generated_at ? `(${summary.generated_at})` : ''}.
        </p>
      </div>

      {loading && <div className="text-slate-400">Loading summary…</div>}
      {error && <div className="text-red-400">Error: {error}</div>}

      {summary && (
        <>
          {/* Hero — totals + download */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                <div className="text-emerald-400 text-sm font-semibold uppercase tracking-wider mb-2">
                  Master List
                </div>
                <div className="text-5xl font-bold text-white mb-1">
                  {summary.totals.combined.toLocaleString()}
                </div>
                <div className="text-slate-300">
                  {summary.totals.global_schools} global · {summary.totals.china_schools} China
                </div>
              </div>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg"
              >
                {downloading ? '⏳ Downloading…' : '⬇ Download Master.xlsx'}
              </button>
            </div>
          </div>

          {/* Deliverability breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Deliverable emails" value={g.deliverable} total={g.with_email}
                      tone="emerald" sub={`${deliverablePct}% of ${g.with_email}`} />
            <StatCard label="Dead domains" value={g.dead_domain} tone="red"
                      sub="NXDOMAIN — remove" />
            <StatCard label="No mail server" value={g.no_mail_server} tone="amber"
                      sub="Domain alive, no MX" />
            <StatCard label="No email on file" value={g.no_email} tone="slate"
                      sub="Phone/website only" />
          </div>

          {/* Campaign status */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🚀 Campaign Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CampaignCard
                title="Campaign D — Correction"
                status={cam.campaign_d_correction.status}
                subject={cam.campaign_d_correction.subject}
                detail={`${cam.campaign_d_correction.throttle} · ends ${cam.campaign_d_correction.expected_end}`}
                note={cam.campaign_d_correction.note}
              />
              <CampaignCard
                title="Campaign A — Montree Pitch"
                status={cam.campaign_a_montree_pitch.status}
                subject={cam.campaign_a_montree_pitch.subject}
                detail={`Scheduled: ${cam.campaign_a_montree_pitch.scheduled_for}`}
                note={cam.campaign_a_montree_pitch.note}
              />
              <CampaignCard
                title="Campaign C — Dead"
                status={cam.campaign_c_job_application.status}
                subject="(blank-email disaster)"
                detail={`ID ${cam.campaign_c_job_application.campaign_id}`}
                note={cam.campaign_c_job_application.note}
              />
            </div>
          </div>

          {/* Batches + Countries side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                📦 Batches
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {g.batches.slice(0, 10).map((b, i) => (
                  <div key={b.batch} className={`flex justify-between p-3 text-sm ${i > 0 ? 'border-t border-slate-800' : ''}`}>
                    <span className="text-slate-300">{b.batch}</span>
                    <span className="text-white font-semibold">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                🌍 Top Countries (Global)
              </h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {g.top_countries.slice(0, 10).map((ct, i) => (
                  <div key={ct.country} className={`flex justify-between p-3 text-sm ${i > 0 ? 'border-t border-slate-800' : ''}`}>
                    <span className="text-slate-300">{ct.country}</span>
                    <span className="text-white font-semibold">{ct.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* China summary */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🇨🇳 China Montessori ({c.total})
            </h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Stat label="With phone" value={c.with_phone} />
                <Stat label="With email" value={c.with_email} />
                <Stat label="Deliverable" value={c.deliverable} />
              </div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 mt-4">Top Cities</div>
              <div className="flex flex-wrap gap-2">
                {c.top_cities.slice(0, 12).map(ct => (
                  <span key={ct.city} className="bg-slate-800 text-slate-200 text-xs px-3 py-1 rounded-full">
                    {ct.city} <span className="text-slate-400 ml-1">({ct.count})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Tab legend */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 text-sm text-slate-300">
            <div className="font-semibold text-white mb-3">📑 What's in the xlsx</div>
            <ul className="space-y-2">
              <li><span className="text-emerald-400">Global Outreach ({g.total})</span> — full school list with Email_Status, Web_Status, Last_Verified columns</li>
              <li><span className="text-emerald-400">China Montessori ({c.total})</span> — separate schema (City, Province, Phone) with same audit columns</li>
              <li><span className="text-emerald-400">Deliverable_Global ({g.deliverable})</span> — pre-filtered view of only MX-verified global schools, GMass-ready</li>
              <li><span className="text-emerald-400">Summary</span> — campaign change-log and audit counters</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, total, tone, sub }) {
  const tones = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    red:     'bg-red-500/10 border-red-500/30 text-red-400',
    amber:   'bg-amber-500/10 border-amber-500/30 text-amber-400',
    slate:   'bg-slate-500/10 border-slate-500/30 text-slate-400',
  };
  return (
    <div className={`rounded-xl p-5 border ${tones[tone] || tones.slate}`}>
      <div className="text-xs uppercase tracking-wider opacity-80 mb-1">{label}</div>
      <div className="text-3xl font-bold text-white">{value?.toLocaleString() ?? '—'}</div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value?.toLocaleString() ?? '—'}</div>
    </div>
  );
}

function CampaignCard({ title, status, subject, detail, note }) {
  const statusStyle = {
    in_progress: 'bg-emerald-500/20 text-emerald-300',
    scheduled:   'bg-blue-500/20 text-blue-300',
    dead:        'bg-red-500/20 text-red-300',
  }[status] || 'bg-slate-700 text-slate-300';
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-white text-sm">{title}</div>
        <span className={`text-xs px-2 py-1 rounded ${statusStyle}`}>{status}</span>
      </div>
      <div className="text-slate-300 text-sm mb-1">{subject}</div>
      <div className="text-slate-400 text-xs mb-2">{detail}</div>
      <div className="text-slate-500 text-xs italic">{note}</div>
    </div>
  );
}
