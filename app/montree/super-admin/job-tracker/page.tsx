// /montree/super-admin/job-tracker/page.tsx
// Job Search Campaign Tracker — copy-paste emails + follow-up checkboxes
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface SchoolEntry {
  id: string;
  schoolName: string;
  city: string;
  email: string;
  contactPerson: string;
  ageRange: string;
  familyFit: string;
  wave: number;
  subject: string;
  emailBody: string;
  // Checkboxes
  emailCopied: boolean;
  resumeAttached: boolean;
  sent: boolean;
  responded: boolean;
  followUp1: boolean;
  followUp2: boolean;
  interview: boolean;
  offer: boolean;
  rejected: boolean;
  // Dates
  dateSent: string;
  dateFollowUp1: string;
  dateFollowUp2: string;
  dateInterview: string;
  // Notes
  notes: string;
}

const SUBJECT = 'Montessori Teacher Application — AMS Early Childhood Certified';

function makeEmail(schoolName: string, familyFit: string): string {
  return `Dear ${schoolName} Team,

I'm writing to express my interest in a teaching position at ${schoolName}. I'm an AMS-certified Montessori educator with 12+ years of international teaching experience, currently leading a mixed-age (3–6) Montessori classroom in Beijing where I deliver the full AMI English language curriculum across all five areas.

Beyond teaching, I've built Montree (montree.xyz) — a classroom management platform born from my daily practice that tracks child progress across a 329-work AMI curriculum, generates parent reports, and includes an AI-powered Montessori advisor. It's live and serving real classrooms.

${familyFit}

I've attached my resume for your review. I'd welcome the opportunity to discuss how my experience — in the classroom and in EdTech — could contribute to ${schoolName}.

Warm regards,
Tredoux Willemse
tredoux555@gmail.com
+86 18548922404
montree.xyz`;
}

const INITIAL_SCHOOLS: SchoolEntry[] = [
  {
    id: '1',
    schoolName: 'QAIS — Qingdao Amerasia International School',
    city: 'Qingdao',
    email: 'chowe@qingdaoamerasia.org',
    contactPerson: 'Comine Howe (Dir. Marketing & Comms)',
    ageRange: 'K–12',
    familyFit: "I'm reaching out to QAIS specifically because your K–12 program would be an ideal fit for my family — I have a 3-year-old daughter and a 10-year-old son, and I'm looking for a school community that can welcome all of us. The quality of your Montessori program and your international environment are exactly what I'm looking for, both as an educator and as a parent.",
    wave: 1,
    subject: SUBJECT,
    emailBody: '',
    emailCopied: false, resumeAttached: false, sent: true, responded: false,
    followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: new Date().toISOString().split('T')[0],
    dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Top pick — FREE tuition for staff children. AMS program. Qingdao = beach city, lower cost than Beijing.',
  },
  {
    id: '2',
    schoolName: 'MSB — The International Montessori School of Beijing',
    city: 'Beijing',
    email: 'hr@msb.edu.cn',
    contactPerson: 'HR Department',
    ageRange: '6mo – Grade 8',
    familyFit: "I'm reaching out to MSB specifically because your reputation as the longest-running Montessori school in China speaks volumes about your commitment to authentic Montessori education. As a parent of a 3-year-old daughter and a 10-year-old son, your program range (6 months through Grade 8) is also a wonderful fit for my family — I'm looking for a school community where we can all grow together.",
    wave: 1,
    subject: SUBJECT,
    emailBody: '',
    emailCopied: false, resumeAttached: false, sent: true, responded: false,
    followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: new Date().toISOString().split('T')[0],
    dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'AMI school (not AMS). Longest-running Montessori in China. Stay in Beijing — no relocation.',
  },
  {
    id: '3',
    schoolName: 'Beijing Kidtopia Montessori',
    city: 'Beijing',
    email: 'chen84690@126.com',
    contactPerson: 'Chen (Recruitment)',
    ageRange: '0–18',
    familyFit: "I'm reaching out to Kidtopia specifically because your 0–18 age range and commitment to authentic Montessori education make you a rare find in Beijing. As a parent of a 3-year-old daughter and a 10-year-old son, I'm looking for a school community that can welcome my whole family — and Kidtopia's breadth of programming is exactly that.",
    wave: 1,
    subject: SUBJECT,
    emailBody: '',
    emailCopied: false, resumeAttached: false, sent: true, responded: false,
    followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: new Date().toISOString().split('T')[0],
    dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'AMI-founded. 0–18 covers both kids. 126.com email = Chinese-run. Found via AMI job board.',
  },
  // ——— Wave 2 ———
  {
    id: '4',
    schoolName: 'Etonkids International Kindergarten',
    city: 'Beijing (60+ campuses)',
    email: 'hq@etonkids.com',
    contactPerson: 'HR / Vivien Wang (CEO)',
    ageRange: '1.5–6',
    familyFit: "I'm reaching out to Etonkids because your scale across China — 60+ campuses — and your deep commitment to Montessori education are impressive. As a parent of a 3-year-old daughter who would thrive in your program, I'm looking for a school community where I can contribute meaningfully as both a teacher and a parent.",
    wave: 2,
    subject: SUBJECT,
    emailBody: '',
    emailCopied: false, resumeAttached: false, sent: false, responded: false,
    followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Only covers daughter (3). Son (10) needs separate school. Biggest chain = most openings.',
  },
  {
    id: '5',
    schoolName: 'HD Qingdao Montessori Academy',
    city: 'Qingdao',
    email: 'info@hdmontessori.com',
    contactPerson: 'Admissions',
    ageRange: '2–6',
    familyFit: "I'm reaching out to HD Montessori because your reputation for high-quality Montessori education in Qingdao aligns perfectly with my teaching philosophy and experience. As a parent of a 3-year-old daughter, your program is an ideal fit for our family's move to Qingdao.",
    wave: 2,
    subject: SUBJECT,
    emailBody: '',
    emailCopied: false, resumeAttached: false, sent: false, responded: false,
    followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Only covers daughter. Backup Qingdao option if QAIS doesn\'t work.',
  },
  {
    id: '6',
    schoolName: 'Hongwen School Qingdao',
    city: 'Qingdao',
    email: 'info@hongwenschool.com.cn',
    contactPerson: 'HR',
    ageRange: 'K–12',
    familyFit: "I'm reaching out to Hongwen specifically because your K–12 program is ideal for my family — I have a 3-year-old daughter and a 10-year-old son, and I'm looking for a school that can welcome both. Your international education environment in Qingdao is exactly what we're looking for.",
    wave: 2,
    subject: SUBJECT,
    emailBody: '',
    emailCopied: false, resumeAttached: false, sent: false, responded: false,
    followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Not pure Montessori — international K-12. Backup option, covers both kids.',
  },
  {
    id: '7',
    schoolName: 'Nebula Academy Shanghai',
    city: 'Shanghai',
    email: 'info@nebulaacademy.cn',
    contactPerson: 'Admissions',
    ageRange: '2–12',
    familyFit: "I'm reaching out to Nebula Academy because your 2–12 age range means both my 3-year-old daughter and 10-year-old son could join the community. Your progressive approach to Montessori education in Shanghai is very appealing to us as a family.",
    wave: 2,
    subject: SUBJECT,
    emailBody: '',
    emailCopied: false, resumeAttached: false, sent: false, responded: false,
    followUp1: false, followUp2: false, interview: false, offer: false, rejected: false,
    dateSent: '', dateFollowUp1: '', dateFollowUp2: '', dateInterview: '',
    notes: 'Shanghai. Covers both kids (2-12). Would require relocation from Beijing.',
  },
];

// Initialize email bodies
INITIAL_SCHOOLS.forEach(s => {
  s.emailBody = makeEmail(s.schoolName, s.familyFit);
});

const SESSION_TIMEOUT_MS = 15 * 60 * 1000;
const STORAGE_KEY = 'montree_job_tracker_v2';

export default function JobTrackerPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [schools, setSchools] = useState<SchoolEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState('');
  const [showWave, setShowWave] = useState<'all' | 1 | 2>('all');

  useEffect(() => {
    try {
      const savedToken = sessionStorage.getItem('sa_session');
      const savedTs = sessionStorage.getItem('sa_session_ts');
      if (savedToken && savedTs) {
        const elapsed = Date.now() - parseInt(savedTs, 10);
        if (elapsed < SESSION_TIMEOUT_MS) setAuthenticated(true);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSchools(JSON.parse(saved));
      } else {
        setSchools(INITIAL_SCHOOLS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_SCHOOLS));
      }
    } catch {
      setSchools(INITIAL_SCHOOLS);
    }
  }, [authenticated]);

  const save = useCallback((updated: SchoolEntry[]) => {
    setSchools(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch { /* */ }
  }, []);

  const update = (id: string, changes: Partial<SchoolEntry>) => {
    save(schools.map(s => s.id === id ? { ...s, ...changes } : s));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(''), 2000);
    } catch { /* */ }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('sa_session', data.token || 'ok');
        sessionStorage.setItem('sa_session_ts', Date.now().toString());
        setAuthenticated(true);
      } else {
        setError('Wrong password');
      }
    } catch { setError('Connection error'); }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 rounded-xl p-8 w-full max-w-sm border border-gray-800">
          <h1 className="text-xl font-bold text-white mb-1">🎯 Job Tracker</h1>
          <p className="text-gray-400 text-sm mb-6">Super-admin access required</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Password" className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white mb-3 focus:outline-none focus:border-emerald-500" />
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button onClick={handleLogin} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium">Unlock</button>
        </div>
      </div>
    );
  }

  const displayed = showWave === 'all' ? schools : schools.filter(s => s.wave === showWave);
  const sentCount = schools.filter(s => s.sent).length;
  const respondedCount = schools.filter(s => s.responded).length;
  const interviewCount = schools.filter(s => s.interview).length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/montree/super-admin" className="text-gray-400 hover:text-white text-sm">← Back</Link>
            <h1 className="text-lg font-bold">🎯 Job Search Campaign</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{sentCount}/{schools.length} sent</span>
            <span className="text-emerald-500">{respondedCount} replied</span>
            <span className="text-amber-400">{interviewCount} interviews</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {/* Wave Filter */}
        <div className="flex gap-2 mb-5">
          {[
            { key: 'all' as const, label: `All (${schools.length})` },
            { key: 1 as const, label: `Wave 1 — Priority (${schools.filter(s => s.wave === 1).length})` },
            { key: 2 as const, label: `Wave 2 — Next (${schools.filter(s => s.wave === 2).length})` },
          ].map(tab => (
            <button key={String(tab.key)} onClick={() => setShowWave(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showWave === tab.key ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}>{tab.label}</button>
          ))}
        </div>

        {/* School Cards */}
        <div className="space-y-3">
          {displayed.map(school => {
            const isOpen = expandedId === school.id;

            return (
              <div key={school.id} className={`bg-gray-900 border rounded-xl overflow-hidden transition-all ${
                school.interview ? 'border-emerald-700' : school.sent && !school.responded ? 'border-amber-800/50' : 'border-gray-800'
              }`}>
                {/* Summary Row */}
                <div className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                  onClick={() => setExpandedId(isOpen ? null : school.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold">{school.schoolName}</span>
                        <span className="text-gray-500 text-xs">📍 {school.city}</span>
                        <span className="text-gray-600 text-xs">Wave {school.wave}</span>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{school.ageRange} · {school.contactPerson}</div>
                    </div>

                    {/* Status Checkboxes - Inline */}
                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                      {([
                        { key: 'sent' as const, label: 'Sent', color: 'accent-blue-500' },
                        { key: 'responded' as const, label: 'Replied', color: 'accent-emerald-500' },
                        { key: 'followUp1' as const, label: 'F/U 1', color: 'accent-amber-500' },
                        { key: 'followUp2' as const, label: 'F/U 2', color: 'accent-orange-500' },
                        { key: 'interview' as const, label: 'Interview', color: 'accent-green-400' },
                        { key: 'rejected' as const, label: '❌', color: 'accent-red-500' },
                      ]).map(cb => (
                        <label key={cb.key} className="flex flex-col items-center gap-0.5 cursor-pointer">
                          <input type="checkbox" checked={school[cb.key]}
                            onChange={e => {
                              const changes: Partial<SchoolEntry> = { [cb.key]: e.target.checked };
                              if (cb.key === 'sent' && e.target.checked && !school.dateSent) {
                                changes.dateSent = new Date().toISOString().split('T')[0];
                              }
                              if (cb.key === 'followUp1' && e.target.checked && !school.dateFollowUp1) {
                                changes.dateFollowUp1 = new Date().toISOString().split('T')[0];
                              }
                              if (cb.key === 'followUp2' && e.target.checked && !school.dateFollowUp2) {
                                changes.dateFollowUp2 = new Date().toISOString().split('T')[0];
                              }
                              if (cb.key === 'interview' && e.target.checked && !school.dateInterview) {
                                changes.dateInterview = new Date().toISOString().split('T')[0];
                              }
                              update(school.id, changes);
                            }}
                            className={`w-4 h-4 rounded ${cb.color}`} />
                          <span className="text-[10px] text-gray-500">{cb.label}</span>
                        </label>
                      ))}
                    </div>

                    <span className="text-gray-500 text-sm ml-2">{isOpen ? '▲' : '▼'}</span>
                  </div>

                  {/* Date tags */}
                  {(school.dateSent || school.dateFollowUp1 || school.dateInterview) && (
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      {school.dateSent && <span>📤 {school.dateSent}</span>}
                      {school.dateFollowUp1 && <span>📞 F/U1: {school.dateFollowUp1}</span>}
                      {school.dateFollowUp2 && <span>📞 F/U2: {school.dateFollowUp2}</span>}
                      {school.dateInterview && <span>🎉 Interview: {school.dateInterview}</span>}
                    </div>
                  )}
                </div>

                {/* Expanded: Copy-Paste Email + Notes */}
                {isOpen && (
                  <div className="border-t border-gray-800 p-4 space-y-4">
                    {/* Copy-Paste Fields */}
                    <div className="space-y-3">
                      {/* Email Address */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500 font-medium">TO: Email Address</label>
                          <button onClick={() => copyToClipboard(school.email, `email-${school.id}`)}
                            className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                            {copiedField === `email-${school.id}` ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-emerald-400 select-all">
                          {school.email}
                        </div>
                      </div>

                      {/* Subject */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500 font-medium">Subject Line</label>
                          <button onClick={() => copyToClipboard(school.subject, `subject-${school.id}`)}
                            className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                            {copiedField === `subject-${school.id}` ? '✓ Copied!' : '📋 Copy'}
                          </button>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 select-all">
                          {school.subject}
                        </div>
                      </div>

                      {/* Email Body */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500 font-medium">Email Body (personalized for {school.schoolName})</label>
                          <button onClick={() => copyToClipboard(school.emailBody, `body-${school.id}`)}
                            className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded transition-colors">
                            {copiedField === `body-${school.id}` ? '✓ Copied!' : '📋 Copy Email'}
                          </button>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-sm text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto select-all leading-relaxed">
                          {school.emailBody}
                        </div>
                      </div>

                      {/* Quick Copy All Button */}
                      <button onClick={() => copyToClipboard(
                        `TO: ${school.email}\nSUBJECT: ${school.subject}\n\n${school.emailBody}`,
                        `all-${school.id}`
                      )} className="w-full py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
                        {copiedField === `all-${school.id}` ? '✓ Everything Copied!' : '📋 Copy Everything (Email + Subject + Body)'}
                      </button>
                    </div>

                    {/* Family Fit & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Family Fit</label>
                        <p className="text-sm text-gray-400 bg-gray-800/50 rounded-lg p-3">{school.familyFit}</p>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                        <textarea value={school.notes}
                          onChange={e => update(school.id, { notes: e.target.value })}
                          className="w-full bg-gray-800 text-sm text-gray-300 rounded-lg p-3 border border-gray-700 focus:border-emerald-500 focus:outline-none resize-none" rows={3} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 text-xs text-gray-600 text-center">
          Checkboxes auto-save. Dates auto-fill when you check a box. Expand any card to copy the email.
        </div>
      </div>
    </div>
  );
}
