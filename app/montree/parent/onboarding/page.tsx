// app/montree/parent/onboarding/page.tsx
//
// The family's enrollment intake, on the parent's existing login. Mobile-first
// — parents fill this in on a phone, standing up, in a corridor. One accordion
// section at a time, save-draft at every point, submit only when it's complete.
//
// Field labels come from the SHARED CORE (lib/onboarding-core/strings EN) so
// Montree and PSS ask the same questions in the same words. Page chrome goes
// through Montree's i18n.
//
// Dark-forest register, matching /montree/parent/dashboard. Safe-area padding
// on the sticky bar — house rule for every parent surface.

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';
import {
  CONSENT_KEYS,
  EN,
  emptyAllergy,
  emptyEmergencyContact,
  emptyGuardian,
  emptyIntake,
  emptyPickupPerson,
  normalizeIntake,
  validateIntake,
  type ConsentKey,
  type IntakeForm,
  type IntakeStatus,
} from '@/lib/onboarding-core';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  red: '#f87171',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: 10,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(52,211,153,0.18)',
  color: T.textPrimary,
  fontSize: 15,
  fontFamily: T.sans,
  outline: 'none',
  boxSizing: 'border-box',
};

interface ChildOption {
  id: string;
  name: string;
}

interface IntakeEnvelope {
  id: string;
  child_id: string;
  status: IntakeStatus;
  data: IntakeForm;
}

type UploadKind = 'face' | 'pickup' | 'vaccination' | 'health_check' | 'medical';

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 5, letterSpacing: 0.2 }}>
      {text}
      {required && <span style={{ color: T.amber, marginLeft: 4 }}>*</span>}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <Label text={label} required={required} />
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: 1.45 }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={INPUT_STYLE}
        />
      )}
    </div>
  );
}

function Section({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string;
  hint: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: T.card,
        border: T.cardBorder,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '15px 16px',
          background: 'none',
          border: 'none',
          color: T.textPrimary,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span>
          <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600 }}>{title}</span>
          <span style={{ display: 'block', fontSize: 12, color: T.textMuted, marginTop: 3, lineHeight: 1.4 }}>
            {hint}
          </span>
        </span>
        <span style={{ color: T.emerald, fontSize: 18, flexShrink: 0 }}>{open ? '−' : '+'}</span>
      </button>
      {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
    </div>
  );
}

function RowCard({ title, onRemove, children }: { title: string; onRemove?: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid rgba(52,211,153,0.12)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: T.textMuted }}>
          {title}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: T.red, fontSize: 12, cursor: 'pointer', padding: 4 }}
          >
            {EN.remove}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        background: T.emeraldSoft,
        border: '1px dashed rgba(52,211,153,0.35)',
        color: T.emerald,
        fontSize: 14,
        cursor: 'pointer',
        marginBottom: 4,
      }}
    >
      + {label}
    </button>
  );
}

export default function ParentOnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [children, setChildren] = useState<ChildOption[]>([]);
  const [childId, setChildId] = useState('');
  const [status, setStatus] = useState<IntakeStatus>('draft');
  const [form, setForm] = useState<IntakeForm>(() => emptyIntake());
  const [open, setOpen] = useState<string>('identity');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const intakesRef = useRef<IntakeEnvelope[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUpload = useRef<{ kind: UploadKind; index?: number } | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/montree/parent/intake', { cache: 'no-store' });
        if (res.status === 401) {
          router.replace('/montree/parent');
          return;
        }
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 403 && data?.error === 'feature_disabled') {
          setDisabled(true);
          return;
        }
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

        const kids: ChildOption[] = Array.isArray(data.children) ? data.children : [];
        const intakes: IntakeEnvelope[] = Array.isArray(data.intakes) ? data.intakes : [];
        intakesRef.current = intakes;
        setChildren(kids);

        const first = kids[0]?.id || '';
        setChildId(first);
        const existing = intakes.find((i) => i.child_id === first);
        if (existing) {
          setForm(normalizeIntake(existing.data));
          setStatus(existing.status);
        } else {
          const blank = emptyIntake();
          // Pre-fill the child's known name so the family isn't retyping it.
          blank.identity.legalName = kids[0]?.name || '';
          setForm(blank);
          setStatus('draft');
        }
      } catch (err) {
        console.error('[parent-onboarding] load failed:', err);
        if (!cancelled) toast.error(t('childOnboarding.loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router, t]);

  // Switching child (multi-child families) swaps the whole working form.
  const switchChild = useCallback((id: string) => {
    setChildId(id);
    const existing = intakesRef.current.find((i) => i.child_id === id);
    if (existing) {
      setForm(normalizeIntake(existing.data));
      setStatus(existing.status);
    } else {
      const blank = emptyIntake();
      blank.identity.legalName = children.find((c) => c.id === id)?.name || '';
      setForm(blank);
      setStatus('draft');
    }
  }, [children]);

  // ── Immutable section patchers ──────────────────────────────────────────
  const patch = useCallback(<K extends keyof IntakeForm>(key: K, value: Partial<IntakeForm[K]>) => {
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], ...value } }));
  }, []);

  const setConsent = useCallback((key: ConsentKey, granted: boolean) => {
    setForm((prev) => ({
      ...prev,
      consents: {
        ...prev.consents,
        [key]: { granted, at: granted ? new Date().toISOString() : null },
      },
    }));
  }, []);

  // ── Save / submit ───────────────────────────────────────────────────────
  const persist = useCallback(async (nextStatus: 'draft' | 'submitted') => {
    if (!childId) return;
    const setBusy = nextStatus === 'draft' ? setSaving : setSubmitting;
    setBusy(true);
    try {
      const res = await fetch('/api/montree/parent/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, form, status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 400 && data?.error === 'validation_failed') {
        const first = Array.isArray(data.errors) && data.errors[0]?.message;
        toast.error(first || t('childOnboarding.incomplete'));
        return;
      }
      if (!res.ok || !data?.success) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);

      setStatus(nextStatus);
      // Keep the local cache honest so switching children and back doesn't
      // resurrect a stale copy.
      const idx = intakesRef.current.findIndex((i) => i.child_id === childId);
      const envelope: IntakeEnvelope = { id: data.id, child_id: childId, status: nextStatus, data: form };
      if (idx >= 0) intakesRef.current[idx] = envelope;
      else intakesRef.current.push(envelope);

      toast.success(nextStatus === 'draft' ? t('childOnboarding.savedToast') : t('childOnboarding.submittedToast'));
    } catch (err) {
      console.error('[parent-onboarding] save failed:', err);
      toast.error(t('childOnboarding.saveFailed'));
    } finally {
      setBusy(false);
    }
  }, [childId, form, t]);

  const submit = useCallback(() => {
    // Fail fast on the client with the same rules the server enforces.
    const result = validateIntake(form);
    if (!result.ok) {
      toast.error(result.errors[0].message);
      return;
    }
    void persist('submitted');
  }, [form, persist]);

  // ── Upload ──────────────────────────────────────────────────────────────
  const pickFile = useCallback((kind: UploadKind, index?: number) => {
    pendingUpload.current = { kind, index };
    fileInputRef.current?.click();
  }, []);

  const onFileChosen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const target = pendingUpload.current;
    pendingUpload.current = null;
    if (!file || !target || !childId) return;

    const busyKey = target.index !== undefined ? `${target.kind}-${target.index}` : target.kind;
    setUploading(busyKey);
    try {
      const fd = new FormData();
      fd.append('file', file, file.name || 'upload');
      fd.append('kind', target.kind);
      fd.append('childId', childId);
      if (target.index !== undefined) fd.append('index', String(target.index));

      const res = await fetch('/api/montree/parent/intake/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.path) throw new Error(data?.error || `HTTP ${res.status}`);

      const path: string = data.path;
      setForm((prev) => {
        if (target.kind === 'face') {
          return { ...prev, documents: { ...prev.documents, facePhotoPath: path } };
        }
        if (target.kind === 'vaccination') {
          return { ...prev, documents: { ...prev.documents, vaccinationBookletPath: path } };
        }
        if (target.kind === 'health_check') {
          return { ...prev, documents: { ...prev.documents, healthCheckPath: path } };
        }
        if (target.kind === 'medical') {
          const list = [...(prev.documents.medicalCertPaths || [])];
          if (target.index !== undefined && target.index < list.length) list[target.index] = path;
          else list.push(path);
          return { ...prev, documents: { ...prev.documents, medicalCertPaths: list } };
        }
        // pickup
        const persons = prev.pickup.persons.map((p, i) =>
          i === target.index ? { ...p, photoPath: path } : p
        );
        return { ...prev, pickup: { ...prev.pickup, persons } };
      });
      toast.success(EN.uploaded);
    } catch (err) {
      console.error('[parent-onboarding] upload failed:', err);
      toast.error(t('childOnboarding.uploadFailed'));
    } finally {
      setUploading(null);
    }
  }, [childId, t]);

  const statusLabel = useMemo(() => {
    if (status === 'committed') return t('childOnboarding.statusCommitted');
    if (status === 'submitted') return t('childOnboarding.statusSubmitted');
    return t('childOnboarding.statusDraft');
  }, [status, t]);

  // ── Render ──────────────────────────────────────────────────────────────
  const shell = (inner: React.ReactNode) => (
    <div style={{ minHeight: '100dvh', background: T.bg, backgroundImage: T.glow, color: T.textPrimary, fontFamily: T.sans }}>
      <Toaster position="top-center" />
      {inner}
    </div>
  );

  if (loading) {
    return shell(
      <div style={{ display: 'flex', minHeight: '100dvh', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.textMuted, fontSize: 14 }}>{t('common.loading')}</div>
      </div>
    );
  }

  if (disabled) {
    return shell(
      <div style={{ maxWidth: 512, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 34, marginBottom: 12 }}>🧾</div>
        <h1 style={{ fontFamily: T.serif, fontSize: 20, marginBottom: 8 }}>{t('childOnboarding.disabledTitle')}</h1>
        <p style={{ color: T.textSecondary, fontSize: 14 }}>{t('childOnboarding.disabledBody')}</p>
      </div>
    );
  }

  const toggle = (key: string) => setOpen((cur) => (cur === key ? '' : key));
  const readOnlyNote = status === 'committed' ? t('childOnboarding.committedNote') : null;

  return shell(
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={onFileChosen}
        style={{ display: 'none' }}
      />

      {/* Sticky bar — safe-area padding is mandatory on parent surfaces. */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: T.card,
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => router.push('/montree/parent/dashboard')}
            style={{ background: 'none', border: 'none', color: T.emerald, fontSize: 18, cursor: 'pointer', padding: 4 }}
            aria-label={t('common.back')}
          >
            ←
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600 }}>{t('childOnboarding.parentTitle')}</div>
            <div style={{ fontSize: 11, color: T.textMuted }}>{statusLabel}</div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: '0 auto', padding: '16px 18px 140px' }}>
        <p style={{ color: T.textSecondary, fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
          {t('childOnboarding.parentIntro')}
        </p>

        {readOnlyNote && (
          <div
            style={{
              padding: '11px 14px',
              borderRadius: 12,
              background: 'rgba(52,211,153,0.10)',
              border: '1px solid rgba(52,211,153,0.35)',
              fontSize: 13,
              color: T.textSecondary,
              marginBottom: 14,
            }}
          >
            {readOnlyNote}
          </div>
        )}

        {children.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <Label text={t('childOnboarding.whichChild')} />
            <select
              value={childId}
              onChange={(e) => switchChild(e.target.value)}
              style={{ ...INPUT_STYLE, appearance: 'none' }}
            >
              {children.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#0a1a0f' }}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Identity ── */}
        <Section title={EN.sectionIdentity} hint={EN.hintIdentity} open={open === 'identity'} onToggle={() => toggle('identity')}>
          <Field label={EN.legalName} required value={form.identity.legalName} onChange={(v) => patch('identity', { legalName: v })} />
          <Field label={EN.preferredName} value={form.identity.preferredName || ''} onChange={(v) => patch('identity', { preferredName: v })} />
          <Field label={EN.dob} required type="date" value={form.identity.dob} onChange={(v) => patch('identity', { dob: v })} />
          <div style={{ marginBottom: 12 }}>
            <Label text={EN.sex} />
            <select
              value={form.identity.sex}
              onChange={(e) => patch('identity', { sex: e.target.value as IntakeForm['identity']['sex'] })}
              style={{ ...INPUT_STYLE, appearance: 'none' }}
            >
              <option value="" style={{ background: '#0a1a0f' }}>{EN.sexUnspecified}</option>
              <option value="male" style={{ background: '#0a1a0f' }}>{EN.sexMale}</option>
              <option value="female" style={{ background: '#0a1a0f' }}>{EN.sexFemale}</option>
            </select>
          </div>
          <Field label={EN.nationality} value={form.identity.nationality || ''} onChange={(v) => patch('identity', { nationality: v })} />
          <Field
            label={EN.homeLanguages}
            placeholder={EN.homeLanguagesHint}
            value={(form.identity.homeLanguages || []).join(', ')}
            onChange={(v) => patch('identity', { homeLanguages: v.split(',').map((s) => s.trim()).filter(Boolean) })}
          />
        </Section>

        {/* ── Family ── */}
        <Section title={EN.sectionFamily} hint={EN.hintFamily} open={open === 'family'} onToggle={() => toggle('family')}>
          {form.family.guardians.map((g, i) => (
            <RowCard
              key={`g-${i}`}
              title={`${EN.guardian} ${i + 1}`}
              onRemove={form.family.guardians.length > 1
                ? () => patch('family', { guardians: form.family.guardians.filter((_, j) => j !== i) })
                : undefined}
            >
              {(['name', 'relation', 'phone', 'wechat', 'email'] as const).map((k) => (
                <Field
                  key={k}
                  label={EN[k]}
                  required={k === 'name' || k === 'phone'}
                  type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'}
                  value={g[k] || ''}
                  onChange={(v) => patch('family', {
                    guardians: form.family.guardians.map((row, j) => (j === i ? { ...row, [k]: v } : row)),
                  })}
                />
              ))}
            </RowCard>
          ))}
          <AddButton label={EN.addGuardian} onClick={() => patch('family', { guardians: [...form.family.guardians, emptyGuardian()] })} />
          <Field label={EN.homeAddress} multiline value={form.family.homeAddress || ''} onChange={(v) => patch('family', { homeAddress: v })} />
        </Section>

        {/* ── Emergency ── */}
        <Section title={EN.sectionEmergency} hint={EN.hintEmergency} open={open === 'emergency'} onToggle={() => toggle('emergency')}>
          {form.emergency.contacts.map((c, i) => (
            <RowCard
              key={`e-${i}`}
              title={`${EN.emergencyContact} ${i + 1}`}
              onRemove={form.emergency.contacts.length > 1
                ? () => patch('emergency', { contacts: form.emergency.contacts.filter((_, j) => j !== i) })
                : undefined}
            >
              {(['name', 'relation', 'phone'] as const).map((k) => (
                <Field
                  key={k}
                  label={EN[k]}
                  required={k === 'name' || k === 'phone'}
                  type={k === 'phone' ? 'tel' : 'text'}
                  value={c[k] || ''}
                  onChange={(v) => patch('emergency', {
                    contacts: form.emergency.contacts.map((row, j) => (j === i ? { ...row, [k]: v } : row)),
                  })}
                />
              ))}
            </RowCard>
          ))}
          <AddButton label={EN.addEmergencyContact} onClick={() => patch('emergency', { contacts: [...form.emergency.contacts, emptyEmergencyContact()] })} />
        </Section>

        {/* ── Pickup ── */}
        <Section title={EN.sectionPickup} hint={EN.hintPickup} open={open === 'pickup'} onToggle={() => toggle('pickup')}>
          {form.pickup.persons.map((p, i) => (
            <RowCard
              key={`p-${i}`}
              title={`${EN.pickupPerson} ${i + 1}`}
              onRemove={form.pickup.persons.length > 1
                ? () => patch('pickup', { persons: form.pickup.persons.filter((_, j) => j !== i) })
                : undefined}
            >
              {(['name', 'relation', 'phone'] as const).map((k) => (
                <Field
                  key={k}
                  label={EN[k]}
                  type={k === 'phone' ? 'tel' : 'text'}
                  value={p[k] || ''}
                  onChange={(v) => patch('pickup', {
                    persons: form.pickup.persons.map((row, j) => (j === i ? { ...row, [k]: v } : row)),
                  })}
                />
              ))}
              <Label text={EN.pickupPhoto} />
              <button
                type="button"
                onClick={() => pickFile('pickup', i)}
                disabled={uploading === `pickup-${i}`}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: p.photoPath ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  color: p.photoPath ? T.emerald : T.textSecondary,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {uploading === `pickup-${i}` ? EN.uploading : p.photoPath ? `✓ ${EN.uploaded} — ${EN.replace}` : EN.upload}
              </button>
            </RowCard>
          ))}
          <AddButton label={EN.addPickupPerson} onClick={() => patch('pickup', { persons: [...form.pickup.persons, emptyPickupPerson()] })} />
          <Field label={EN.pickupNotes} multiline value={form.pickup.notes || ''} onChange={(v) => patch('pickup', { notes: v })} />
        </Section>

        {/* ── Health ── */}
        <Section title={EN.sectionHealth} hint={EN.hintHealth} open={open === 'health'} onToggle={() => toggle('health')}>
          <Label text={EN.allergies} />
          {form.health.allergies.length === 0 && (
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 10 }}>{EN.noAllergies}</p>
          )}
          {form.health.allergies.map((a, i) => (
            <RowCard
              key={`a-${i}`}
              title={`${EN.allergen} ${i + 1}`}
              onRemove={() => patch('health', { allergies: form.health.allergies.filter((_, j) => j !== i) })}
            >
              <Field
                label={EN.allergen}
                value={a.allergen}
                onChange={(v) => patch('health', { allergies: form.health.allergies.map((row, j) => (j === i ? { ...row, allergen: v } : row)) })}
              />
              <div style={{ marginBottom: 12 }}>
                <Label text={EN.severity} />
                <select
                  value={a.severity}
                  onChange={(e) => patch('health', {
                    allergies: form.health.allergies.map((row, j) =>
                      j === i ? { ...row, severity: e.target.value as typeof row.severity } : row),
                  })}
                  style={{ ...INPUT_STYLE, appearance: 'none' }}
                >
                  <option value="mild" style={{ background: '#0a1a0f' }}>{EN.severityMild}</option>
                  <option value="moderate" style={{ background: '#0a1a0f' }}>{EN.severityModerate}</option>
                  <option value="severe" style={{ background: '#0a1a0f' }}>{EN.severitySevere}</option>
                </select>
              </div>
              <Field
                label={EN.allergyAction}
                multiline
                value={a.action || ''}
                onChange={(v) => patch('health', { allergies: form.health.allergies.map((row, j) => (j === i ? { ...row, action: v } : row)) })}
              />
            </RowCard>
          ))}
          <AddButton label={EN.addAllergy} onClick={() => patch('health', { allergies: [...form.health.allergies, emptyAllergy()] })} />

          <Field label={EN.dietaryRestrictions} multiline value={form.health.dietaryRestrictions || ''} onChange={(v) => patch('health', { dietaryRestrictions: v })} />
          <Field label={EN.conditions} multiline value={form.health.conditions || ''} onChange={(v) => patch('health', { conditions: v })} />
          <Field label={EN.medications} multiline value={form.health.medications || ''} onChange={(v) => patch('health', { medications: v })} />
          <Field label={EN.physicianName} value={form.health.physicianName || ''} onChange={(v) => patch('health', { physicianName: v })} />
          <Field label={EN.physicianPhone} type="tel" value={form.health.physicianPhone || ''} onChange={(v) => patch('health', { physicianPhone: v })} />
          <Field label={EN.bloodType} value={form.health.bloodType || ''} onChange={(v) => patch('health', { bloodType: v })} />
        </Section>

        {/* ── Documents ── */}
        <Section title={EN.sectionDocuments} hint={EN.hintDocuments} open={open === 'documents'} onToggle={() => toggle('documents')}>
          {([
            { kind: 'face' as const, label: EN.facePhoto, hint: EN.facePhotoHint, path: form.documents.facePhotoPath, required: true },
            { kind: 'vaccination' as const, label: EN.vaccinationBooklet, hint: '', path: form.documents.vaccinationBookletPath, required: false },
            { kind: 'health_check' as const, label: EN.healthCheck, hint: '', path: form.documents.healthCheckPath, required: false },
          ]).map((doc) => (
            <div key={doc.kind} style={{ marginBottom: 14 }}>
              <Label text={doc.label} required={doc.required} />
              {doc.hint && <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>{doc.hint}</p>}
              <button
                type="button"
                onClick={() => pickFile(doc.kind)}
                disabled={uploading === doc.kind}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 10,
                  background: doc.path ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(52,211,153,0.25)',
                  color: doc.path ? T.emerald : T.textSecondary,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {uploading === doc.kind ? EN.uploading : doc.path ? `✓ ${EN.uploaded} — ${EN.replace}` : EN.upload}
              </button>
            </div>
          ))}
          <div style={{ marginBottom: 6 }}>
            <Label text={EN.medicalCerts} />
            {(form.documents.medicalCertPaths || []).map((p, i) => (
              <div key={`m-${i}`} style={{ fontSize: 13, color: T.emerald, marginBottom: 6 }}>
                ✓ {EN.uploaded} {i + 1}
              </div>
            ))}
            <button
              type="button"
              onClick={() => pickFile('medical')}
              disabled={uploading === 'medical'}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                background: T.emeraldSoft,
                border: '1px dashed rgba(52,211,153,0.35)',
                color: T.emerald,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              {uploading === 'medical' ? EN.uploading : `+ ${EN.medicalCerts}`}
            </button>
          </div>
        </Section>

        {/* ── Consents — each one separate, PIPL-shaped ── */}
        <Section title={EN.sectionConsents} hint={EN.hintConsents} open={open === 'consents'} onToggle={() => toggle('consents')}>
          {CONSENT_KEYS.map((key) => {
            const text = {
              photo_internal: EN.consentPhotoInternal,
              photo_marketing: EN.consentPhotoMarketing,
              emergency_treatment: EN.consentEmergencyTreatment,
              sunscreen_medication: EN.consentSunscreenMedication,
              data_privacy: EN.consentDataPrivacy,
            }[key];
            const granted = form.consents[key]?.granted === true;
            return (
              <label
                key={key}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                  padding: '11px 12px',
                  marginBottom: 8,
                  borderRadius: 12,
                  border: granted ? '1px solid rgba(52,211,153,0.35)' : '1px solid rgba(255,255,255,0.08)',
                  background: granted ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={granted}
                  onChange={(e) => setConsent(key, e.target.checked)}
                  style={{ marginTop: 3, width: 18, height: 18, accentColor: T.emerald, flexShrink: 0 }}
                />
                <span style={{ fontSize: 13, lineHeight: 1.5, color: T.textSecondary }}>
                  {text}
                  {key === 'data_privacy' && (
                    <span style={{ display: 'block', color: T.amber, fontSize: 11, marginTop: 4 }}>
                      {EN.consentRequiredNote}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </Section>

        {/* ── Development — the section the teacher reads first ── */}
        <Section title={EN.sectionDevelopment} hint={EN.hintDevelopment} open={open === 'development'} onToggle={() => toggle('development')}>
          <Field label={EN.temperamentNotes} multiline value={form.development.temperamentNotes || ''} onChange={(v) => patch('development', { temperamentNotes: v })} />
          <Field label={EN.strengths} multiline value={form.development.strengths || ''} onChange={(v) => patch('development', { strengths: v })} />
          <Field label={EN.growthAreas} multiline value={form.development.growthAreas || ''} onChange={(v) => patch('development', { growthAreas: v })} />
          <Field label={EN.fears} multiline value={form.development.fears || ''} onChange={(v) => patch('development', { fears: v })} />
          <Field label={EN.comfortItems} value={form.development.comfortItems || ''} onChange={(v) => patch('development', { comfortItems: v })} />
          <div style={{ marginBottom: 12 }}>
            <Label text={EN.toileting} />
            <select
              value={form.development.toileting || ''}
              onChange={(e) => patch('development', { toileting: e.target.value as IntakeForm['development']['toileting'] })}
              style={{ ...INPUT_STYLE, appearance: 'none' }}
            >
              <option value="" style={{ background: '#0a1a0f' }}>{EN.toiletingUnspecified}</option>
              <option value="trained" style={{ background: '#0a1a0f' }}>{EN.toiletingTrained}</option>
              <option value="training" style={{ background: '#0a1a0f' }}>{EN.toiletingTraining}</option>
              <option value="diapers" style={{ background: '#0a1a0f' }}>{EN.toiletingDiapers}</option>
            </select>
          </div>
          <Field label={EN.napHabits} multiline value={form.development.napHabits || ''} onChange={(v) => patch('development', { napHabits: v })} />
          <Field label={EN.eatingHabits} multiline value={form.development.eatingHabits || ''} onChange={(v) => patch('development', { eatingHabits: v })} />
          <Field label={EN.separationHistory} multiline value={form.development.separationHistory || ''} onChange={(v) => patch('development', { separationHistory: v })} />
          <Field label={EN.priorCare} value={form.development.priorCare || ''} onChange={(v) => patch('development', { priorCare: v })} />
          <Field label={EN.otherNotes} multiline value={form.development.otherNotes || ''} onChange={(v) => patch('development', { otherNotes: v })} />
        </Section>
      </main>

      {/* Sticky actions */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(8,20,12,0.94)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderTop: '1px solid rgba(52,211,153,0.15)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '12px 18px', display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => void persist('draft')}
            disabled={saving || submitting || !childId}
            style={{
              flex: 1,
              padding: '13px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(52,211,153,0.22)',
              color: T.textPrimary,
              fontSize: 15,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving || submitting ? 0.6 : 1,
            }}
          >
            {saving ? EN.uploading : t('childOnboarding.saveDraft')}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || submitting || !childId}
            style={{
              flex: 1.4,
              padding: '13px',
              borderRadius: 12,
              background: '#1D5C41',
              border: '1px solid rgba(52,211,153,0.45)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              cursor: submitting ? 'default' : 'pointer',
              opacity: saving || submitting ? 0.6 : 1,
            }}
          >
            {submitting ? EN.uploading : t('childOnboarding.submit')}
          </button>
        </div>
      </div>
    </>
  );
}
