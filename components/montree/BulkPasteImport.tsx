// components/montree/BulkPasteImport.tsx
// Paste-based bulk student import — two textareas (names + birthdays)
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useMemo, useCallback, CSSProperties } from 'react';
import {
  X, Users, Eye, ArrowLeft, AlertTriangle, AlertCircle, Check, Upload,
} from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { toast } from 'sonner';

interface BulkPasteImportProps {
  classroomId: string;
  existingCount: number;
  onImported: (children: Array<{ id: string; name: string }>) => void;
  onClose: () => void;
}

interface ParsedStudent {
  name: string;
  birthday: string | null;
  parsedDate: Date | null;
  age: number | null;
  warning: string | null;
  error: string | null;
}

// Dark forest tokens
const T = {
  scrim: 'rgba(2,8,5,0.72)',
  sheet: 'rgba(7,18,12,0.97)',
  sheetBorder: 'rgba(52,211,153,0.18)',
  card: 'rgba(255,255,255,0.06)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.25)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  mono: '"SF Mono", Menlo, Consolas, monospace',
};

const ctaPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '12px 18px',
  borderRadius: 12,
  background: 'linear-gradient(180deg, #34d399, #10b981)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: '#06281a',
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
};

const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  padding: '12px 18px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: T.textPrimary,
  fontFamily: T.sans,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

function tryBuildDate(year: number, month: number, day: number): Date | null {
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

// Smart date parser
function smartParseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(/[-\/.\s]+/);
  if (parts.length < 3) return null;

  const nums = parts.slice(0, 3).map(p => parseInt(p, 10));
  if (nums.some(isNaN)) return null;

  const [a, b, c] = nums;

  const candidates: { year: number; month: number; day: number }[] = [];

  if (parts[0].length === 4) {
    candidates.push({ year: a, month: b, day: c });
  } else if (parts[2].length === 4 || c > 31) {
    const year = c < 100 ? c + 2000 : c;
    if (a > 12) {
      candidates.push({ year, month: b, day: a });
    } else if (b > 12) {
      candidates.push({ year, month: a, day: b });
    } else {
      candidates.push({ year, month: b, day: a });
      candidates.push({ year, month: a, day: b });
    }
  } else {
    const year = c < 100 ? c + 2000 : c;
    candidates.push({ year, month: b, day: a });
    candidates.push({ year, month: a, day: b });
    if (a > 31) candidates.push({ year: a + 2000, month: b, day: c });
  }

  const now = new Date();
  for (const { year, month, day } of candidates) {
    const date = tryBuildDate(year, month, day);
    if (!date) continue;
    const age = now.getFullYear() - date.getFullYear();
    if (age >= 0 && age <= 15) return date;
  }

  for (const { year, month, day } of candidates) {
    const date = tryBuildDate(year, month, day);
    if (date) return date;
  }

  return null;
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
  const [importing, setImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const parsed = useMemo((): ParsedStudent[] => {
    const names = parseLines(namesText);
    const birthdays = parseLines(birthdaysText);

    return names.map((name, i) => {
      const raw = birthdays[i] || '';
      const parsedDate = raw ? smartParseDate(raw) : null;
      const age = parsedDate ? calculateAge(parsedDate) : null;

      const isDuplicate = names.filter(n => n.toLowerCase() === name.toLowerCase()).length > 1;

      let warning: string | null = null;
      let error: string | null = null;

      if (!name.trim()) {
        error = t('bulkImport.emptyName');
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
  }, [namesText, birthdaysText, t]);

  const hasErrors = parsed.some(s => s.error);
  const validCount = parsed.filter(s => !s.error).length;

  const MAX_STUDENTS = 200;

  const handlePreview = useCallback(() => {
    if (parsed.length === 0) {
      toast.error(t('bulkImport.pasteNamesFirst'));
      return;
    }
    if (parsed.length > MAX_STUDENTS) {
      toast.error(t('bulkImport.tooMany'));
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
      onImported(data.children || []);
    } catch {
      toast.error(t('common.networkError'));
    } finally {
      setImporting(false);
    }
  }, [parsed, hasErrors, validCount, classroomId, onImported, t]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: T.scrim,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: T.sans,
      }}
    >
      <style>{`
        .bp-scroll::-webkit-scrollbar { width: 8px; }
        .bp-scroll::-webkit-scrollbar-thumb { background: rgba(52,211,153,0.22); border-radius: 4px; }
        .bp-textarea::placeholder { color: rgba(255,255,255,0.30); }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        className="bp-scroll"
        style={{
          width: '100%',
          maxWidth: 720,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: T.sheet,
          border: `1px solid ${T.sheetBorder}`,
          borderRadius: 22,
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          color: T.textPrimary,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px',
          borderBottom: `1px solid ${T.sheetBorder}`,
          background: 'linear-gradient(135deg, rgba(52,211,153,0.14), rgba(52,211,153,0.04))',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: T.emeraldStrong,
                border: '1px solid rgba(52,211,153,0.40)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.emerald,
                flexShrink: 0,
              }}>
                <Users size={17} strokeWidth={1.75} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{
                  margin: 0,
                  fontFamily: T.serif,
                  fontSize: 20,
                  fontWeight: 500,
                  color: T.textPrimary,
                  letterSpacing: -0.2,
                  lineHeight: 1.2,
                }}>
                  {t('bulkImport.title')}
                </h2>
                <p style={{
                  margin: '3px 0 0',
                  fontFamily: T.sans,
                  fontSize: 12,
                  color: T.textSecondary,
                }}>
                  {t('bulkImport.subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: T.textSecondary,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
          {existingCount > 0 && (
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 10,
              background: T.amberSoft,
              border: `1px solid ${T.amberBorder}`,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <AlertTriangle size={13} strokeWidth={1.75} color={T.amber} />
              <span style={{
                fontFamily: T.sans,
                fontSize: 12,
                color: T.amber,
              }}>
                {t('bulkImport.existingStudents').replace('{count}', existingCount.toString())}
              </span>
            </div>
          )}
        </div>

        {!showPreview ? (
          /* Input Mode */
          <div style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <p style={{
              margin: 0,
              fontFamily: T.sans,
              fontSize: 12,
              color: T.textMuted,
              fontStyle: 'italic',
            }}>
              {t('bulkImport.dateHint')}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
            }}>
              {/* Names */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  fontFamily: T.sans,
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textSecondary,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}>
                  {t('bulkImport.namesLabel')}
                </label>
                <textarea
                  className="bp-textarea"
                  value={namesText}
                  onChange={e => { setNamesText(e.target.value); setShowPreview(false); }}
                  placeholder={t('bulkImport.namesPlaceholder')}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    height: 200,
                    padding: 12,
                    background: T.inputBg,
                    border: `1px solid ${T.inputBorder}`,
                    borderRadius: 12,
                    color: T.textPrimary,
                    fontFamily: T.mono,
                    fontSize: 13,
                    lineHeight: 1.55,
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{
                  margin: '4px 0 0',
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: T.textMuted,
                }}>
                  {parseLines(namesText).length} {t('bulkImport.names')}
                </p>
              </div>

              {/* Birthdays */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: 6,
                  fontFamily: T.sans,
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.textSecondary,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                }}>
                  {t('bulkImport.birthdaysLabel')}
                </label>
                <textarea
                  className="bp-textarea"
                  value={birthdaysText}
                  onChange={e => { setBirthdaysText(e.target.value); setShowPreview(false); }}
                  placeholder={`2020-03-15\n15/03/2020\n03/15/2020\n${t('bulkImport.anyFormat')}`}
                  spellCheck={false}
                  style={{
                    width: '100%',
                    height: 200,
                    padding: 12,
                    background: T.inputBg,
                    border: `1px solid ${T.inputBorder}`,
                    borderRadius: 12,
                    color: T.textPrimary,
                    fontFamily: T.mono,
                    fontSize: 13,
                    lineHeight: 1.55,
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{
                  margin: '4px 0 0',
                  fontFamily: T.sans,
                  fontSize: 11,
                  color: T.textMuted,
                }}>
                  {parseLines(birthdaysText).length} {t('bulkImport.dates')}
                </p>
              </div>
            </div>

            {/* Preview button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                onClick={handlePreview}
                disabled={parseLines(namesText).length === 0}
                style={{
                  ...ctaPrimary,
                  opacity: parseLines(namesText).length === 0 ? 0.45 : 1,
                  cursor: parseLines(namesText).length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                <Eye size={14} strokeWidth={1.75} />
                {t('bulkImport.preview')}
              </button>
            </div>
          </div>
        ) : (
          /* Preview Mode */
          <div style={{
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <h3 style={{
                margin: 0,
                fontFamily: T.serif,
                fontSize: 18,
                fontWeight: 500,
                color: T.textPrimary,
                letterSpacing: -0.2,
              }}>
                {t('bulkImport.previewTitle').replace('{count}', validCount.toString())}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  color: T.emerald,
                  fontFamily: T.sans,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft size={12} strokeWidth={1.75} />
                {t('bulkImport.editList')}
              </button>
            </div>

            {/* Preview table */}
            <div style={{
              overflowX: 'auto',
              borderRadius: 14,
              background: T.card,
              border: '1px solid rgba(52,211,153,0.15)',
            }}>
              <table style={{
                width: '100%',
                fontFamily: T.sans,
                fontSize: 13,
                borderCollapse: 'collapse',
              }}>
                <thead>
                  <tr style={{
                    textAlign: 'left',
                    color: T.textSecondary,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: 'uppercase',
                  }}>
                    <th style={{ padding: '12px 8px 12px 14px', width: 36 }}>#</th>
                    <th style={{ padding: '12px 12px' }}>{t('bulkImport.name')}</th>
                    <th style={{ padding: '12px 12px' }}>{t('bulkImport.birthday')}</th>
                    <th style={{ padding: '12px 12px' }}>{t('bulkImport.age')}</th>
                    <th style={{ padding: '12px 14px 12px 12px' }}>{t('bulkImport.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((s, i) => (
                    <tr
                      key={i}
                      style={{
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        opacity: s.error ? 0.5 : 1,
                      }}
                    >
                      <td style={{ padding: '10px 8px 10px 14px', color: T.textMuted, fontFamily: T.mono }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '10px 12px', color: T.textPrimary, fontWeight: 500 }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '10px 12px', color: T.textSecondary, fontFamily: T.mono, fontSize: 12 }}>
                        {s.parsedDate
                          ? s.parsedDate.toLocaleDateString('en-CA')
                          : s.birthday
                            ? <span style={{ color: T.amber }}>{s.birthday}</span>
                            : <span style={{ color: T.textMuted }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '10px 12px', color: T.textSecondary }}>
                        {s.age !== null ? s.age : '—'}
                      </td>
                      <td style={{ padding: '10px 14px 10px 12px' }}>
                        {s.error ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: T.redSoft,
                            border: `1px solid ${T.redBorder}`,
                            color: T.red,
                            fontSize: 10,
                            fontWeight: 600,
                          }}>
                            <AlertCircle size={10} strokeWidth={1.75} />
                            {s.error}
                          </span>
                        ) : s.warning ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '2px 8px',
                            borderRadius: 999,
                            background: T.amberSoft,
                            border: `1px solid ${T.amberBorder}`,
                            color: T.amber,
                            fontSize: 10,
                            fontWeight: 600,
                          }}>
                            <AlertTriangle size={10} strokeWidth={1.75} />
                            {s.warning}
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: T.emeraldStrong,
                            border: '1px solid rgba(52,211,153,0.40)',
                            color: T.emerald,
                          }}>
                            <Check size={11} strokeWidth={2.5} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  ...ghostBtn,
                  flex: 1,
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleImport}
                disabled={hasErrors || validCount === 0 || importing}
                style={{
                  ...ctaPrimary,
                  flex: 1,
                  opacity: (hasErrors || validCount === 0 || importing) ? 0.45 : 1,
                  cursor: (hasErrors || validCount === 0 || importing) ? 'not-allowed' : 'pointer',
                }}
              >
                <Upload size={14} strokeWidth={1.75} />
                {importing
                  ? t('common.adding')
                  : t('bulkImport.importStudents').replace('{count}', validCount.toString())
                }
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
