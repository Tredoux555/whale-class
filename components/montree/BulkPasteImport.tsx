// components/montree/BulkPasteImport.tsx
// Paste-based bulk student import — two textareas (names + birthdays)
'use client';

import { useState, useMemo, useCallback } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { toast } from 'sonner';

interface BulkPasteImportProps {
  classroomId: string;
  existingCount: number;
  onImported: () => void;
  onClose: () => void;
}

type DateFormat = 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY';

interface ParsedStudent {
  name: string;
  birthday: string | null;
  parsedDate: Date | null;
  age: number | null;
  warning: string | null;
  error: string | null;
}

function parseDateWithFormat(raw: string, format: DateFormat): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Normalize separators: accept - / . and spaces
  const parts = trimmed.split(/[\-\/\.\s]+/);
  if (parts.length < 3) return null;

  let year: number, month: number, day: number;

  if (format === 'YYYY-MM-DD') {
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    day = parseInt(parts[2], 10);
  } else if (format === 'DD/MM/YYYY') {
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // MM/DD/YYYY
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  // Handle 2-digit years
  if (year < 100) year += 2000;

  // Basic bounds check
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;

  const date = new Date(year, month - 1, day);
  // Verify the date is valid (catches things like Feb 30)
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  return date;
}

function calculateAge(dob: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function parseLines(text: string): string[] {
  // Handle tab-separated (Excel paste) — take first column only
  return text
    .split('\n')
    .map(line => {
      const tabParts = line.split('\t');
      return tabParts[0].trim();
    })
    .filter(line => line.length > 0);
}

export default function BulkPasteImport({ classroomId, existingCount, onImported, onClose }: BulkPasteImportProps) {
  const { t } = useI18n();
  const [namesText, setNamesText] = useState('');
  const [birthdaysText, setBirthdaysText] = useState('');
  const [dateFormat, setDateFormat] = useState<DateFormat>('YYYY-MM-DD');
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const parsed = useMemo((): ParsedStudent[] => {
    const names = parseLines(namesText);
    const birthdays = parseLines(birthdaysText);

    return names.map((name, i) => {
      const raw = birthdays[i] || '';
      const parsedDate = raw ? parseDateWithFormat(raw, dateFormat) : null;
      const age = parsedDate ? calculateAge(parsedDate) : null;

      // Check for duplicate names
      const isDuplicate = names.filter(n => n.toLowerCase() === name.toLowerCase()).length > 1;

      let warning: string | null = null;
      let error: string | null = null;

      if (!name.trim()) {
        error = t('bulkImport.emptyName');
      } else if (raw && !parsedDate) {
        warning = t('bulkImport.invalidDate');
      } else if (isDuplicate) {
        warning = t('bulkImport.duplicateName');
      } else if (age !== null && (age < 0 || age > 10)) {
        warning = t('bulkImport.unusualAge');
      }

      return {
        name,
        birthday: raw || null,
        parsedDate,
        age,
        warning,
        error,
      };
    });
  }, [namesText, birthdaysText, dateFormat, t]);

  const hasErrors = parsed.some(s => s.error);
  const validCount = parsed.filter(s => !s.error).length;

  const handlePreview = useCallback(() => {
    if (parsed.length === 0) {
      toast.error(t('bulkImport.pasteNamesFirst'));
      return;
    }
    setShowPreview(true);
  }, [parsed, t]);

  const handleImport = useCallback(async () => {
    if (hasErrors || validCount === 0) return;
    setImporting(true);

    try {
      const students = parsed
        .filter(s => !s.error)
        .map(s => ({
          name: s.name.trim(),
          date_of_birth: s.parsedDate ? s.parsedDate.toISOString().split('T')[0] : undefined,
          age: s.age ?? undefined,
        }));

      const res = await montreeApi('/api/montree/children/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId, students }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.errors?.[0] || t('common.error'));
        return;
      }

      toast.success(t('bulkImport.success').replace('{count}', data.created.toString()));
      onImported();
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setImporting(false);
    }
  }, [parsed, hasErrors, validCount, classroomId, onImported, t]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-emerald-900 rounded-2xl border border-emerald-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-emerald-700/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{t('bulkImport.title')}</h2>
              <p className="text-emerald-300 text-sm mt-1">{t('bulkImport.subtitle')}</p>
            </div>
            <button onClick={onClose} className="text-emerald-400 hover:text-white text-xl p-1">✕</button>
          </div>
          {existingCount > 0 && (
            <p className="text-amber-300 text-sm mt-2">
              {t('bulkImport.existingStudents').replace('{count}', existingCount.toString())}
            </p>
          )}
        </div>

        {!showPreview ? (
          /* Input Mode */
          <div className="p-5 space-y-4">
            {/* Date format selector */}
            <div className="flex items-center gap-3">
              <label className="text-emerald-300 text-sm whitespace-nowrap">{t('bulkImport.dateFormat')}:</label>
              <div className="flex gap-2">
                {(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'] as DateFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setDateFormat(fmt)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                      dateFormat === fmt
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/10 text-emerald-300 hover:bg-white/20'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Two textareas side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-emerald-300 text-sm mb-2 font-medium">
                  {t('bulkImport.namesLabel')}
                </label>
                <textarea
                  value={namesText}
                  onChange={e => { setNamesText(e.target.value); setShowPreview(false); }}
                  placeholder={t('bulkImport.namesPlaceholder')}
                  className="w-full h-48 p-3 bg-black/20 border border-emerald-600 rounded-lg text-white placeholder-emerald-400/40 text-sm font-mono focus:border-emerald-400 focus:outline-none resize-none"
                  spellCheck={false}
                />
                <p className="text-emerald-400/60 text-xs mt-1">
                  {parseLines(namesText).length} {t('bulkImport.names')}
                </p>
              </div>

              <div>
                <label className="block text-emerald-300 text-sm mb-2 font-medium">
                  {t('bulkImport.birthdaysLabel')}
                </label>
                <textarea
                  value={birthdaysText}
                  onChange={e => { setBirthdaysText(e.target.value); setShowPreview(false); }}
                  placeholder={t('bulkImport.birthdaysPlaceholder').replace('{format}', dateFormat === 'YYYY-MM-DD' ? '2020-03-15' : dateFormat === 'DD/MM/YYYY' ? '15/03/2020' : '03/15/2020')}
                  className="w-full h-48 p-3 bg-black/20 border border-emerald-600 rounded-lg text-white placeholder-emerald-400/40 text-sm font-mono focus:border-emerald-400 focus:outline-none resize-none"
                  spellCheck={false}
                />
                <p className="text-emerald-400/60 text-xs mt-1">
                  {parseLines(birthdaysText).length} {t('bulkImport.dates')}
                </p>
              </div>
            </div>

            {/* Preview button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handlePreview}
                disabled={parseLines(namesText).length === 0}
                className="px-6 py-2.5 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:bg-emerald-800 disabled:cursor-not-allowed transition-colors"
              >
                {t('bulkImport.preview')}
              </button>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold">
                {t('bulkImport.previewTitle').replace('{count}', validCount.toString())}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-emerald-300 text-sm hover:text-white"
              >
                ← {t('bulkImport.editList')}
              </button>
            </div>

            {/* Preview table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-emerald-300 text-left border-b border-emerald-700/50">
                    <th className="pb-2 pr-3 w-8">#</th>
                    <th className="pb-2 pr-3">{t('bulkImport.name')}</th>
                    <th className="pb-2 pr-3">{t('bulkImport.birthday')}</th>
                    <th className="pb-2 pr-3">{t('bulkImport.age')}</th>
                    <th className="pb-2">{t('bulkImport.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((s, i) => (
                    <tr key={i} className={`border-b border-emerald-800/30 ${s.error ? 'opacity-50' : ''}`}>
                      <td className="py-2 pr-3 text-emerald-400/60">{i + 1}</td>
                      <td className="py-2 pr-3 text-white font-medium">{s.name}</td>
                      <td className="py-2 pr-3 text-emerald-200 font-mono text-xs">
                        {s.parsedDate
                          ? s.parsedDate.toLocaleDateString('en-CA') // YYYY-MM-DD
                          : s.birthday
                            ? <span className="text-amber-400">{s.birthday}</span>
                            : <span className="text-emerald-400/40">—</span>
                        }
                      </td>
                      <td className="py-2 pr-3 text-emerald-200">
                        {s.age !== null ? `${s.age}` : '—'}
                      </td>
                      <td className="py-2">
                        {s.error ? (
                          <span className="text-red-400 text-xs">{s.error}</span>
                        ) : s.warning ? (
                          <span className="text-amber-400 text-xs">{s.warning}</span>
                        ) : (
                          <span className="text-emerald-400">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleImport}
                disabled={hasErrors || validCount === 0 || importing}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:bg-emerald-800 disabled:cursor-not-allowed transition-colors"
              >
                {importing
                  ? t('common.adding')
                  : t('bulkImport.importStudents').replace('{count}', validCount.toString())
                }
              </button>
            </div>

            {/* What's Next nudge — shown after successful import would go here,
                but we show it on the dashboard after the modal closes */}
          </div>
        )}
      </div>
    </div>
  );
}
