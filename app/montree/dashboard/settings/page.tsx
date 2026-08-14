// /montree/dashboard/settings/page.tsx
// Settings - Teacher profile, preferences
// Fixed: Removed admin features - teacher settings only
//
// ── SCHOOL BRAND KIT (added 2026-08) ────────────────────────────────────────
// The one screen where a school's logo enters the product. Pick a file → the
// browser reads its palette and solves print-safe tokens from it → save. From
// then on every class document themes itself (see lib/montree/brand-kit/*).
//
// 🚨 EXTRACTION RUNS HERE, ONCE, AND NEVER AT PRINT TIME. `extractBrandKit`
// needs a canvas, so it belongs in the browser of the person choosing the logo.
// What gets POSTed is the ANSWER; the server validates and stores it.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast, Toaster } from 'sonner';
import { getSession, clearSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import type { TranslationKey } from '@/lib/montree/i18n/en';
import DeleteAccountSection from '@/components/montree/DeleteAccountSection';
import { extractBrandKit, retuneBrandKit, type BrandPalette } from '@/lib/montree/brand-kit/extract';
import {
  BRAND_INTENSITIES,
  type BrandIntensity,
  type BrandKit,
} from '@/lib/montree/brand-kit/types';

const SETTINGS_ITEMS = [
  { emoji: '🖼️', key: 'settings.mediaGallery', descKey: 'settings.mediaGalleryDesc', href: '/montree/dashboard/media' },
  { emoji: '📊', key: 'settings.reports', descKey: 'settings.reportsDesc', href: '/montree/dashboard/weekly-wrap' },
  // Games tile REMOVED Jul 3 2026 — feature retired from teacher-facing nav.
];

/**
 * 🚨 THE COPY, AND WHY IT LIVES HERE.
 * Montree's i18n hook is strict across all twelve locales — a new key must
 * exist in en/zh/es/de/fr/pt/nl/it/ja/ko/uk/ru before it may be committed. So
 * this card ships its English in one place and asks `t()` for each key anyway
 * (see `tx` below): the moment the twelve locale files gain these keys, every
 * string here becomes translated with no further code change, and until then a
 * German teacher reads English rather than a raw `brandKit.title` token.
 * The key list is exactly this object — hand it to the i18n pass as-is.
 */
const BRAND_COPY: Record<string, string> = {
  'brandKit.title': 'School logo & document theme',
  'brandKit.subtitle':
    'Upload your logo once. Class lists, labels and health sheets take your school’s colours automatically.',
  'brandKit.choose': 'Choose a logo',
  'brandKit.replace': 'Replace logo',
  'brandKit.remove': 'Remove logo',
  'brandKit.removeConfirm': 'Remove this logo and the theme it created?',
  'brandKit.fileTypes': 'PNG, JPG, WebP or GIF · up to 4MB · a flat logo themes best',
  'brandKit.reading': 'Reading the logo…',
  'brandKit.readFrom': 'Read from the logo',
  'brandKit.dominant': 'Dominant',
  'brandKit.accent': 'Accent',
  'brandKit.tokens': 'What will print',
  'brandKit.token.ink': 'Titles, names, stamp',
  'brandKit.token.accent': 'Rules, headings, room line',
  'brandKit.token.border': 'Hairlines, label frame',
  'brandKit.token.wash': 'Table head, label fill',
  'brandKit.token.watermark': 'Ghosted crest behind the sheet',
  'brandKit.tokenNote':
    'Raw logo colours never reach the paper. Each one is re-solved for contrast against white, so a pale or neon mark still prints legibly.',
  'brandKit.intensity': 'Theme intensity',
  'brandKit.intensity.whisper': 'Whisper',
  'brandKit.intensity.classic': 'Classic',
  'brandKit.intensity.full': 'Full',
  'brandKit.intensity.whisperNote':
    'Crest and tinted rules. No wash, no watermark — for schools that print on a laser and mean it.',
  'brandKit.intensity.classicNote':
    'The default. Tinted rules, a faint wash behind table headings and labels, and the crest ghosted at 8%.',
  'brandKit.intensity.fullNote':
    'Adds corner marks to each label, a second hairline under the masthead and banded rows. Still under 6% ink coverage.',
  'brandKit.themeOn': 'Theme on',
  'brandKit.themeOff': 'Theme off',
  'brandKit.themeState.on': 'Documents print with your crest and colours.',
  'brandKit.themeState.off': 'Documents print plain, exactly as before.',
  'brandKit.preview': 'Preview',
  'brandKit.previewTitle': 'Class list',
  'brandKit.previewRoom': 'Whale Class',
  'brandKit.previewCol': 'Name',
  'brandKit.previewChild': 'Amara',
  'brandKit.save': 'Save theme',
  'brandKit.saving': 'Saving…',
  'brandKit.saved': 'Theme saved',
  'brandKit.saveFailed': 'Could not save the theme',
  'brandKit.readFailed': 'That image could not be read',
  'brandKit.tooBig': 'That image is larger than 4MB',
  'brandKit.wrongType': 'Use a PNG, JPG, WebP or GIF image',
  'brandKit.unavailable': 'Document theming is not available on this school yet.',
  'brandKit.empty': 'No logo yet — class documents print plain.',
};

const MAX_LOGO_BYTES = 4 * 1024 * 1024;
/** Mirrors the server's allow-list. SVG is deliberately absent — see the note
 *  in app/api/montree/brand-kit/route.ts. */
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [classroomName, setClassroomName] = useState('');
  const [classroomIcon, setClassroomIcon] = useState('🌳');

  // ── brand kit state ───────────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [palette, setPalette] = useState<BrandPalette | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  /** A local data URL for the file just picked, so the preview is instant and
   *  does not wait for an upload that has not happened yet. */
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [brandAvailable, setBrandAvailable] = useState(true);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  /** `t()` with an English fallback. Montree's translator returns the raw key
   *  when it has no entry, so `value === key` is exactly "not translated yet". */
  const tx = useCallback(
    (key: string, fallback?: string): string => {
      const value = t(key as TranslationKey);
      if (!value || value === key) return fallback ?? BRAND_COPY[key] ?? key;
      return value;
    },
    [t]
  );

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.push('/montree/login');
      return;
    }
    setTeacherName(session.teacher?.name || 'Teacher');
    setSchoolName(session.school?.name || '');
    setClassroomName(session.classroom?.name || 'My Classroom');
  }, [router]);

  // Load the stored kit. Every failure lands on "no theme yet", never an error
  // screen: this is a settings page, and the rest of it must still work.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await montreeApi('/api/montree/brand-kit');
        if (!res.ok) throw new Error(`brand-kit: ${res.status}`);
        const body = (await res.json()) as {
          brandKit: BrandKit | null;
          available?: boolean;
        };
        if (cancelled) return;
        setKit(body.brandKit);
        setBrandAvailable(body.available !== false);
      } catch (err) {
        console.error('[settings] brand kit load failed:', err);
        if (!cancelled) setBrandAvailable(false);
      } finally {
        if (!cancelled) setBrandLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = () => {
    clearSession();
    router.push('/montree/login');
  };

  // ── pick a logo → read it → derive the tokens ─────────────────────────────
  const onPickFile = async (file: File | null) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error(tx('brandKit.wrongType'));
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error(tx('brandKit.tooBig'));
      return;
    }

    setReading(true);
    try {
      const intensity = kit?.intensity ?? 'classic';
      const { kit: derived, palette: read } = await extractBrandKit(file, { intensity });
      // The data URL is preview-only. The FILE is what gets uploaded — a data
      // URL on the school row would be a megabyte of base64 in a JSONB column.
      const dataUrl = await readAsDataUrl(file);
      setPalette(read);
      setPendingFile(file);
      setPendingPreview(dataUrl);
      setKit({ ...derived, enabled: kit?.enabled ?? true });
      setDirty(true);
    } catch (err) {
      console.error('[settings] logo read failed:', err);
      toast.error(tx('brandKit.readFailed'));
    } finally {
      setReading(false);
      // Clear the input so picking the SAME file twice still fires a change.
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /** Intensity moves the wash and the watermark, and both are re-solved from
   *  the two source colours already on the kit — no re-upload, no canvas. */
  const onIntensity = (intensity: BrandIntensity) => {
    if (!kit || kit.intensity === intensity) return;
    setKit(retuneBrandKit(kit, intensity));
    setDirty(true);
  };

  const onToggleEnabled = (enabled: boolean) => {
    if (!kit || kit.enabled === enabled) return;
    setKit({ ...kit, enabled });
    setDirty(true);
  };

  const onSave = async () => {
    if (!kit || saving) return;
    setSaving(true);
    try {
      let res: Response;
      if (pendingFile) {
        const form = new FormData();
        form.append('logo', pendingFile);
        form.append('kit', JSON.stringify(kit));
        res = await montreeApi('/api/montree/brand-kit', { method: 'POST', body: form });
      } else {
        res = await montreeApi('/api/montree/brand-kit', {
          method: 'POST',
          body: JSON.stringify({ kit }),
        });
      }
      if (!res.ok) {
        // The route names its own failures; surface the real one (the Jun-14
        // rule: never swallow a server error into "something went wrong").
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error || `brand-kit: ${res.status}`);
      }
      const body = (await res.json()) as { brandKit: BrandKit | null };
      setKit(body.brandKit);
      setPendingFile(null);
      setPendingPreview(null);
      setDirty(false);
      toast.success(tx('brandKit.saved'));
    } catch (err) {
      console.error('[settings] brand kit save failed:', err);
      toast.error(err instanceof Error ? err.message : tx('brandKit.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    if (saving) return;
    if (!window.confirm(tx('brandKit.removeConfirm'))) return;
    setSaving(true);
    try {
      const res = await montreeApi('/api/montree/brand-kit?purge=1', { method: 'DELETE' });
      if (!res.ok) throw new Error(`brand-kit: ${res.status}`);
      setKit(null);
      setPalette(null);
      setPendingFile(null);
      setPendingPreview(null);
      setDirty(false);
    } catch (err) {
      console.error('[settings] brand kit remove failed:', err);
      toast.error(tx('brandKit.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const logoSrc = pendingPreview || kit?.logoUrl || null;
  const tokens = kit?.tokens ?? null;
  const contrast = kit?.meta?.contrast ?? null;

  return (
    <div className="min-h-screen relative" style={{ background: '#0a1a0f', color: '#fff' }}>
      <Toaster position="top-center" />
      {/* Fixed off-centre emerald glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.32), rgba(39,129,90,0.12) 30%, transparent 60%)',
      }} />
      <div className="relative" style={{ zIndex: 1 }}>
      {/* Sub-header */}
      <div className="border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(8,20,12,0.90)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <span className="text-xl">⚙️</span>
        <h1 className="font-bold text-white/95" style={{ fontFamily: 'var(--font-lora), Georgia, serif', fontWeight: 500 }}>{t('settings.title')}</h1>
      </div>

      <main className="p-4 max-w-lg mx-auto space-y-6">
        {/* Profile Section */}
        <div className="bg-white/[0.06] rounded-2xl p-5 border border-[rgba(52,211,153,0.15)]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(16,185,129,0.15)' }}>
              {classroomIcon}
            </div>
            <div className="flex-1">
              <div className="text-white/95 font-bold text-lg">{teacherName || 'Teacher'}</div>
              <div className="text-white/50 text-sm">{classroomName}</div>
              <div className="text-[#34d399] text-xs mt-1">✓ {t('settings.active')}</div>
            </div>
          </div>
        </div>

        {/* Settings List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide px-1">{t('settings.quickAccess')}</h3>
          {SETTINGS_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 bg-white/[0.06] hover:bg-white/[0.10] border border-[rgba(52,211,153,0.15)] hover:border-[rgba(52,211,153,0.35)] rounded-xl p-4 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors" style={{ background: 'rgba(16,185,129,0.12)' }}>
                <span className="text-2xl">{item.emoji}</span>
              </div>
              <div className="flex-1">
                <div className="text-white/90 font-medium">{t(item.key)}</div>
                <div className="text-white/50 text-sm">{t(item.descKey)}</div>
              </div>
              <span className="text-white/30 group-hover:text-[#34d399] transition-colors">→</span>
            </Link>
          ))}
        </div>

        {/* ── School logo & document theme ─────────────────────────────── */}
        <section className="bg-white/[0.06] rounded-2xl p-5 border border-[rgba(52,211,153,0.15)] space-y-4">
          <div>
            <h3 className="text-white/95 font-semibold" style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}>
              🏫 {tx('brandKit.title')}
            </h3>
            <p className="text-white/50 text-[13px] mt-1 leading-relaxed">{tx('brandKit.subtitle')}</p>
          </div>

          {brandLoading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : !brandAvailable ? (
            <p className="text-white/40 text-[12.5px]">{tx('brandKit.unavailable')}</p>
          ) : (
            <>
              {/* logo well + picker */}
              <div className="flex items-center gap-4">
                <div
                  className="w-[86px] h-16 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                  style={{ background: '#ffffff' }}
                >
                  {logoSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoSrc}
                      alt=""
                      style={{ maxWidth: '74px', maxHeight: '52px', objectFit: 'contain' }}
                    />
                  ) : (
                    <span className="text-black/25 text-xl">🏫</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={reading || saving}
                      className="btn btn-secondary btn-sm"
                    >
                      {reading
                        ? tx('brandKit.reading')
                        : kit?.logoUrl || pendingPreview
                          ? tx('brandKit.replace')
                          : tx('brandKit.choose')}
                    </button>
                    {(kit?.logoUrl || pendingPreview) && (
                      <button
                        type="button"
                        onClick={onRemove}
                        disabled={saving}
                        className="btn btn-danger btn-soft btn-sm"
                      >
                        {tx('brandKit.remove')}
                      </button>
                    )}
                  </div>
                  <p className="text-white/35 text-[11.5px] mt-2 leading-snug">
                    {tx('brandKit.fileTypes')}
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  className="hidden"
                  onChange={(e) => void onPickFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {!kit && <p className="text-white/40 text-[12.5px]">{tx('brandKit.empty')}</p>}

              {kit && tokens && (
                <>
                  {/* what we read */}
                  <div>
                    <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45 mb-2">
                      {tx('brandKit.readFrom')}
                    </h4>
                    <div className="flex gap-2">
                      <SourceSwatch label={tx('brandKit.dominant')} hex={kit.dominant} />
                      <SourceSwatch
                        label={tx('brandKit.accent')}
                        hex={kit.accent}
                        derived={kit.meta?.accentDerived}
                      />
                    </div>
                    {(palette?.note || kit.meta?.note || kit.meta?.paleAccentFallback) && (
                      <p className="text-[11.5px] leading-relaxed mt-2 rounded-lg px-2.5 py-2 text-[#E8C96A] bg-[rgba(232,201,106,0.08)] border border-[rgba(232,201,106,0.22)]">
                        {[
                          palette?.note || kit.meta?.note || '',
                          kit.meta?.paleAccentFallback
                            ? 'The second colour is too pale to draw a rule with — the sheet is structured in the dominant hue and stays one family.'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      </p>
                    )}
                  </div>

                  {/* what will print */}
                  <div>
                    <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45 mb-2">
                      {tx('brandKit.tokens')}
                    </h4>
                    <div className="rounded-xl overflow-hidden border border-white/10 divide-y divide-white/5">
                      <TokenRow
                        name="--doc-ink"
                        use={tx('brandKit.token.ink')}
                        value={tokens.ink}
                        meta={contrast ? `${contrast.ink.toFixed(1)}:1` : ''}
                      />
                      <TokenRow
                        name="--doc-accent"
                        use={tx('brandKit.token.accent')}
                        value={tokens.accent}
                        meta={contrast ? `${contrast.accent.toFixed(1)}:1` : ''}
                      />
                      <TokenRow
                        name="--doc-border"
                        use={tx('brandKit.token.border')}
                        value={tokens.border}
                        meta={contrast ? `${contrast.border.toFixed(1)}:1` : ''}
                      />
                      <TokenRow
                        name="--doc-wash"
                        use={tx('brandKit.token.wash')}
                        value={tokens.wash}
                        meta={tokens.wash === 'transparent' ? 'none' : 'tint'}
                      />
                      <TokenRow
                        name="--doc-watermark"
                        use={tx('brandKit.token.watermark')}
                        value={tokens.wash === 'transparent' ? 'transparent' : tokens.accent}
                        meta={
                          tokens.watermarkOpacity
                            ? `${Math.round(tokens.watermarkOpacity * 100)}%`
                            : 'off'
                        }
                      />
                    </div>
                    <p className="text-white/35 text-[11.5px] mt-2 leading-relaxed">
                      {tx('brandKit.tokenNote')}
                    </p>
                  </div>

                  {/* intensity */}
                  <div>
                    <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45 mb-2">
                      {tx('brandKit.intensity')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {BRAND_INTENSITIES.map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={kit.intensity === option}
                          onClick={() => onIntensity(option)}
                          className={
                            kit.intensity === option
                              ? 'btn btn-primary btn-sm btn-pill'
                              : 'btn btn-secondary btn-sm btn-pill'
                          }
                        >
                          {tx(`brandKit.intensity.${option}`)}
                        </button>
                      ))}
                    </div>
                    <p className="text-white/40 text-[11.5px] mt-2 leading-relaxed">
                      {tx(`brandKit.intensity.${kit.intensity}Note`)}
                    </p>
                  </div>

                  {/* on / off */}
                  <div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        aria-pressed={kit.enabled}
                        onClick={() => onToggleEnabled(true)}
                        className={
                          kit.enabled
                            ? 'btn btn-primary btn-sm btn-pill'
                            : 'btn btn-secondary btn-sm btn-pill'
                        }
                      >
                        {tx('brandKit.themeOn')}
                      </button>
                      <button
                        type="button"
                        aria-pressed={!kit.enabled}
                        onClick={() => onToggleEnabled(false)}
                        className={
                          !kit.enabled
                            ? 'btn btn-primary btn-sm btn-pill'
                            : 'btn btn-secondary btn-sm btn-pill'
                        }
                      >
                        {tx('brandKit.themeOff')}
                      </button>
                    </div>
                    <p className="text-white/40 text-[11.5px] mt-2 leading-relaxed">
                      {kit.enabled ? tx('brandKit.themeState.on') : tx('brandKit.themeState.off')}
                    </p>
                  </div>

                  {/* preview — a scrap of the real sheet, in the real tokens */}
                  <div>
                    <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45 mb-2">
                      {tx('brandKit.preview')}
                    </h4>
                    <PaperPreview
                      logoSrc={kit.enabled ? logoSrc : null}
                      tokens={kit.enabled ? tokens : null}
                      // The masthead prints the SCHOOL and the stamp prints the
                      // ROOM — the preview shows the same two, or a teacher
                      // checks their crest against the wrong line. The room
                      // falls back to the sample copy until the session lands.
                      schoolName={schoolName}
                      title={tx('brandKit.previewTitle')}
                      room={classroomName || tx('brandKit.previewRoom')}
                      column={tx('brandKit.previewCol')}
                      child={tx('brandKit.previewChild')}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={onSave}
                    disabled={!dirty || saving || reading}
                    className="btn btn-primary btn-md btn-full"
                  >
                    {saving ? tx('brandKit.saving') : tx('brandKit.save')}
                  </button>
                </>
              )}
            </>
          )}
        </section>

        {/* Delete Account (Apple App Store Guideline 5.1.1(v)) */}
        <DeleteAccountSection redirectTo="/montree/login" onDeleted={clearSession} dark />

        {/* Sign Out */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="btn btn-danger btn-soft btn-lg btn-full"
          >
            🚪 {t('settings.signOut')}
          </button>
        </div>

        {/* Version */}
        <div className="text-center text-white/40 text-xs pt-4">
          {t('settings.version')} 🌳
        </div>
      </main>
      </div>
    </div>
  );
}

// ── small presentational pieces ─────────────────────────────────────────────
// Colour here is DATA — it is the school's own palette being reported back —
// which is the documented exception to the inline-style rule in the design
// lock-in. No button below is hand-styled; every one uses the `.btn` API.

function SourceSwatch({
  label,
  hex,
  derived,
}: {
  label: string;
  hex: string;
  derived?: boolean;
}) {
  return (
    <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-white/[0.03]">
      <div style={{ height: 30, background: hex }} />
      <div className="px-2.5 py-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/45">
          {label}
        </div>
        <div className="text-[11.5px] text-white/85 tabular-nums">
          {hex.toUpperCase()}
          {derived ? ' *' : ''}
        </div>
      </div>
    </div>
  );
}

function TokenRow({
  name,
  use,
  value,
  meta,
}: {
  name: string;
  use: string;
  value: string;
  meta: string;
}) {
  const transparent = value === 'transparent';
  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 bg-white/[0.02]">
      <span
        className="w-6 h-6 rounded-md shrink-0 border border-white/15"
        style={{
          background: transparent
            ? 'repeating-linear-gradient(45deg,#1c2a20,#1c2a20 4px,#243328 4px,#243328 8px)'
            : value,
        }}
      />
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-semibold text-white/85">{name}</span>
        <span className="block text-[9.5px] text-white/45 truncate">{use}</span>
      </span>
      <span className="text-right shrink-0">
        <span className="block text-[10.5px] text-white/60 tabular-nums">
          {transparent ? '—' : value.toUpperCase()}
        </span>
        {meta ? <span className="block text-[9px] text-white/35">{meta}</span> : null}
      </span>
    </div>
  );
}

/**
 * A scrap of the real sheet, in the real tokens: masthead rule, a table-heading
 * band and one label card. Not a screenshot of the document — the point is that
 * a teacher can see what "Full" does to a label before printing twelve of them.
 * `tokens === null` renders the plain sheet, which is what "Theme off" prints.
 */
function PaperPreview({
  logoSrc,
  tokens,
  schoolName,
  title,
  room,
  column,
  child,
}: {
  logoSrc: string | null;
  tokens: BrandKit['tokens'] | null;
  schoolName: string;
  title: string;
  room: string;
  column: string;
  child: string;
}) {
  const ink = tokens?.ink ?? '#101820';
  const accent = tokens?.accent ?? '#101820';
  const border = tokens?.border ?? '#c9d3df';
  const wash = tokens?.wash && tokens.wash !== 'transparent' ? tokens.wash : 'transparent';

  return (
    <div
      className="rounded-xl overflow-hidden border border-white/10"
      style={{ background: '#ffffff', color: '#101820', padding: '12px 12px 14px' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingBottom: 6,
          borderBottom: `2px solid ${accent}`,
        }}
      >
        {logoSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" style={{ height: 26, width: 'auto', objectFit: 'contain' }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: ink, lineHeight: 1.1, fontFamily: 'var(--font-lora), Georgia, serif' }}>
            {title}
          </div>
          <div style={{ fontSize: 9, color: '#4a5867', marginTop: 2 }}>{schoolName}</div>
        </div>
        <div style={{ fontSize: 9, color: '#4a5867', textAlign: 'right' }}>
          <b style={{ display: 'block', fontSize: 10, color: ink }}>{room}</b>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 8,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: accent,
              background: wash,
              borderBottom: `1px solid ${accent}`,
              padding: '3px 4px',
            }}
          >
            {column}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: ink, borderBottom: `1px solid ${border}`, padding: '4px' }}>
            {child}
          </div>
          <div style={{ fontSize: 11, color: '#101820', borderBottom: `1px solid ${border}`, padding: '4px' }}>
            &nbsp;
          </div>
        </div>

        <div
          style={{
            width: 96,
            border: `1px dashed ${border}`,
            padding: 3,
          }}
        >
          <div
            style={{
              border: `1px solid ${border}`,
              borderRadius: 3,
              background: wash,
              padding: '8px 4px 6px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: ink, fontFamily: 'var(--font-lora), Georgia, serif' }}>
              {child}
            </div>
            <div
              style={{
                fontSize: 6,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: accent,
                borderTop: `1px solid ${border}`,
                marginTop: 5,
                paddingTop: 4,
                width: '60%',
                marginInline: 'auto',
              }}
            >
              {room}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** FileReader → data URL, for the preview only. */
function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}
