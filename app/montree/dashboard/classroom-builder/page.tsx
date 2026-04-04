// /montree/dashboard/classroom-builder
// Paste-based classroom setup: names + birthdays from Excel → preview → create children
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, recoverSession, type MontreeSession } from '@/lib/montree/auth';
import { useI18n } from '@/lib/montree/i18n';
import { toast } from 'sonner';

type Step = 'paste' | 'preview' | 'done';

interface ParsedStudent {
  name: string;
  birthday: string | null; // YYYY-MM-DD or null
  birthdayRaw: string;     // original pasted text
  valid: boolean;
  error?: string;
}

/**
 * Try to parse a birthday string into YYYY-MM-DD.
 * Accepts: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, M/D/YY, etc.
 * Returns null if unparseable.
 */
function parseBirthday(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  // Try native Date parse first (handles YYYY-MM-DD, ISO, etc.)
  const directParse = new Date(s);
  if (!isNaN(directParse.getTime()) && s.includes('-')) {
    // Only trust direct parse for explicit YYYY-MM-DD formats
    const y = directParse.getFullYear();
    if (y > 1900 && y < 2100) {
      return directParse.toISOString().split('T')[0];
    }
  }

  // Try MM/DD/YYYY or M/D/YYYY
  const slashParts = s.split(/[\/\-\.]/);
  if (slashParts.length === 3) {
    let [a, b, c] = slashParts.map(p => parseInt(p, 10));
    if (isNaN(a) || isNaN(b) || isNaN(c)) return null;

    // Handle 2-digit year
    if (c < 100) c += c > 50 ? 1900 : 2000;
    if (a < 100 && a > 31) { // a looks like a year: YYYY/MM/DD
      const [year, month, day] = [a < 100 ? a + 2000 : a, b, c];
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    // MM/DD/YYYY (US format — default assumption for school context)
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31 && c > 1900) {
      return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
    }

    // DD/MM/YYYY (if a > 12 it must be a day)
    if (a > 12 && b >= 1 && b <= 12 && c > 1900) {
      return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
    }

    // Fallback: MM/DD/YY
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) {
      const year = c < 100 ? (c > 50 ? 1900 + c : 2000 + c) : c;
      if (year > 1900 && year < 2100) {
        return `${year}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function ClassroomBuilderPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [step, setStep] = useState<Step>('paste');

  // Paste state
  const [namesText, setNamesText] = useState('');
  const [birthdaysText, setBirthdaysText] = useState('');

  // Preview state
  const [students, setStudents] = useState<ParsedStudent[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);

  // Auth
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let sess = getSession();
      if (!sess) sess = await recoverSession();
      if (!sess && !cancelled) {
        router.replace('/montree/login');
        return;
      }
      if (!cancelled) setSession(sess);
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Parse pasted text into student rows
  const handlePreview = useCallback(() => {
    const nameLines = namesText.split('\n').map(l => l.trim()).filter(Boolean);
    const bdayLines = birthdaysText.split('\n').map(l => l.trim());

    if (nameLines.length === 0) {
      toast.error('Please paste at least one name');
      return;
    }

    const parsed: ParsedStudent[] = nameLines.map((name, i) => {
      const bdayRaw = bdayLines[i] || '';
      const bdayParsed = parseBirthday(bdayRaw);

      // Validate name
      if (name.length > 200) {
        return { name, birthday: null, birthdayRaw: bdayRaw, valid: false, error: 'Name too long' };
      }

      // Validate birthday if provided
      if (bdayRaw && !bdayParsed) {
        return { name, birthday: null, birthdayRaw: bdayRaw, valid: false, error: `Could not parse "${bdayRaw}"` };
      }

      // Validate age if birthday parsed (should be 1-18 for school context)
      if (bdayParsed) {
        const age = calculateAge(bdayParsed);
        if (age < 0 || age > 18) {
          return { name, birthday: bdayParsed, birthdayRaw: bdayRaw, valid: false, error: `Age ${age} seems wrong` };
        }
      }

      return { name, birthday: bdayParsed, birthdayRaw: bdayRaw, valid: true };
    });

    setStudents(parsed);
    setStep('preview');
  }, [namesText, birthdaysText]);

  // Submit to API
  const handleSubmit = useCallback(async () => {
    if (!session?.classroom?.id) {
      toast.error('No classroom selected');
      return;
    }

    const validStudents = students.filter(s => s.valid);
    if (validStudents.length === 0) {
      toast.error('No valid students to create');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/montree/children/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroomId: session.classroom.id,
          students: validStudents.map(s => ({
            name: s.name,
            date_of_birth: s.birthday || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errors?.[0] || 'Import failed');
      }

      const data = await res.json();
      setCreatedCount(data.created || 0);
      setStep('done');
      toast.success(`${data.created} students added!`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create students');
    } finally {
      setSubmitting(false);
    }
  }, [session, students]);

  // Stats for preview
  const stats = useMemo(() => {
    const valid = students.filter(s => s.valid).length;
    const withBirthday = students.filter(s => s.valid && s.birthday).length;
    const errors = students.filter(s => !s.valid).length;
    return { valid, withBirthday, errors, total: students.length };
  }, [students]);

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/montree/dashboard')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ←
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Classroom Builder</h1>
          </div>
          {step === 'paste' && (
            <span className="text-xs text-gray-400">Step 1 of 2</span>
          )}
          {step === 'preview' && (
            <span className="text-xs text-gray-400">Step 2 of 2</span>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* ─── STEP 1: Paste ─── */}
        {step === 'paste' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 mb-1">How it works</h2>
              <p className="text-xs text-gray-500">
                Copy the names column from your spreadsheet and paste it in the left box.
                Then copy the birthdays column and paste it in the right box.
                The rows should be in the same order so each name matches its birthday.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Names box */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Names <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={namesText}
                  onChange={e => setNamesText(e.target.value)}
                  placeholder={"Amy\nAustin\nEric\nHayden\nJoey"}
                  className="w-full h-64 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 placeholder:text-gray-300"
                  spellCheck={false}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  One name per line · {namesText.split('\n').filter(l => l.trim()).length} names
                </p>
              </div>

              {/* Birthdays box */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Birthdays <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <textarea
                  value={birthdaysText}
                  onChange={e => setBirthdaysText(e.target.value)}
                  placeholder={"03/15/2020\n07/22/2019\n11/01/2020\n05/30/2019\n09/14/2020"}
                  className="w-full h-64 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 placeholder:text-gray-300"
                  spellCheck={false}
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Same order as names · MM/DD/YYYY or YYYY-MM-DD
                </p>
              </div>
            </div>

            <button
              onClick={handlePreview}
              disabled={!namesText.trim()}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Preview →
            </button>
          </div>
        )}

        {/* ─── STEP 2: Preview ─── */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex items-center gap-3 bg-white rounded-xl border p-3 shadow-sm">
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-emerald-600">{stats.valid}</p>
                <p className="text-[10px] text-gray-500">Ready</p>
              </div>
              <div className="w-px h-8 bg-gray-200" />
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-blue-600">{stats.withBirthday}</p>
                <p className="text-[10px] text-gray-500">With birthday</p>
              </div>
              {stats.errors > 0 && (
                <>
                  <div className="w-px h-8 bg-gray-200" />
                  <div className="flex-1 text-center">
                    <p className="text-lg font-bold text-red-500">{stats.errors}</p>
                    <p className="text-[10px] text-gray-500">Errors</p>
                  </div>
                </>
              )}
            </div>

            {/* Student table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-8">#</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Name</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Birthday</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 w-16">Age</th>
                    <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 w-12">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr
                      key={i}
                      className={`border-b last:border-0 ${!s.valid ? 'bg-red-50' : ''}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{s.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {s.birthday ? (
                          <span>{s.birthday}</span>
                        ) : s.birthdayRaw ? (
                          <span className="text-red-500 text-xs">{s.birthdayRaw}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">
                        {s.birthday ? calculateAge(s.birthday) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {s.valid ? (
                          <span className="text-emerald-500">✓</span>
                        ) : (
                          <span className="text-red-500 text-xs" title={s.error}>✕</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Error details */}
            {stats.errors > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-medium text-red-700 mb-1">
                  {stats.errors} student{stats.errors > 1 ? 's' : ''} with issues (will be skipped):
                </p>
                {students.filter(s => !s.valid).map((s, i) => (
                  <p key={i} className="text-xs text-red-600">• {s.name}: {s.error}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep('paste')}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
              >
                ← Back to edit
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || stats.valid === 0}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors text-sm"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Creating...
                  </span>
                ) : (
                  `Create ${stats.valid} student${stats.valid !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: Done ─── */}
        {step === 'done' && (
          <div className="text-center py-16">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              {createdCount} student{createdCount !== 1 ? 's' : ''} added!
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              Your classroom is ready. The students will appear on your dashboard.
            </p>
            <div className="flex gap-3 max-w-xs mx-auto">
              <button
                onClick={() => {
                  setStep('paste');
                  setNamesText('');
                  setBirthdaysText('');
                  setStudents([]);
                  setCreatedCount(0);
                }}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors text-sm"
              >
                Add more
              </button>
              <button
                onClick={() => router.push('/montree/dashboard')}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors text-sm"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
