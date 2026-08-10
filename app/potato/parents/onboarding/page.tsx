// app/potato/parents/onboarding/page.tsx — the family's enrollment form.
//
// One long, honest form on the parent's existing PSS login. They fill it in
// over as many sittings as they like (Save draft), then Submit. Nothing they
// write touches the class roster until their teacher has read it and pressed
// Accept — that promise is stated on the screen, because a parent handing over
// a vaccination booklet and an allergy plan deserves to know where it goes.
//
// The SHAPE, the wording and the validation all come from lib/onboarding-core
// (shared with Montree). This file is the PSS clothing: pt-* warm-scrapbook
// classes, mobile-first, hardcoded English like the rest of /potato.
//
// 🚨 No <style jsx> anywhere — the page-scoped CSS goes through a plain
// <style dangerouslySetInnerHTML>, the same rule every other PSS surface obeys.

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, IconBack, IconUpload, IconCheck, IconTrash, IconPlus } from '@/components/potato/PotatoBits';
import { getJson, postJson, postForm, messageFrom, PotatoApiError } from '@/lib/potato/client';
import {
  EN,
  CONSENT_KEYS,
  emptyIntake,
  emptyGuardian,
  emptyEmergencyContact,
  emptyPickupPerson,
  emptyAllergy,
  validateIntake,
  type ConsentKey,
  type IntakeForm,
  type IntakeStatus,
  type AllergySeverity,
  type ChildSex,
  type ToiletingStatus,
} from '@/lib/onboarding-core';

const S = EN;

interface IntakeResponse {
  child: { id: string; name: string } | null;
  className: string | null;
  status: IntakeStatus;
  form: IntakeForm;
  urls: Record<string, string>;
}

type UploadKind = 'face' | 'pickup' | 'vaccination' | 'health_check' | 'medical';

/* ─── little building blocks ──────────────────────────────────────────── */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ptob-sec">
      <div className="ptob-sec__h">
        <h2>{title}</h2>
        <p>{hint}</p>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="ptob-f">
      <span className="ptob-f__l">
        {label}
        {optional ? <i>{S.optional}</i> : null}
      </span>
      {children}
    </label>
  );
}

function Text({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      className="pt-input"
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Area({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea className="pt-input ptob-area" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

/** A repeating block (guardian / contact / adult / allergy) with its own
 *  remove control. Never removable down to zero — an empty list reads as a
 *  broken screen; a single blank row reads as "fill me in". */
function Repeat({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: (() => void) | null;
  children: React.ReactNode;
}) {
  return (
    <div className="ptob-rep">
      <div className="ptob-rep__h">
        <span>{title}</span>
        {onRemove ? (
          <button type="button" className="ptob-x" onClick={onRemove} aria-label={S.remove}>
            <IconTrash size={14} />
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** One upload slot: shows what is already there, replaces it in place. */
function Upload({
  label,
  hint,
  url,
  accept,
  busy,
  onPick,
}: {
  label: string;
  hint?: string;
  url: string | null;
  accept: string;
  busy: boolean;
  onPick: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isImage = !!url && !url.toLowerCase().endsWith('.pdf');
  return (
    <div className="ptob-up">
      <div className="ptob-up__box">
        {url && isImage ? (
          // Storage objects have no intrinsic dimensions here and next/image
          // cannot proxy a private authenticated stream — a plain img is right.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} />
        ) : url ? (
          <span className="ptob-up__doc">PDF</span>
        ) : (
          <span className="ptob-up__none">—</span>
        )}
      </div>
      <div className="ptob-up__t">
        <b>{label}</b>
        <small>{busy ? S.uploading : url ? S.uploaded : hint || S.optional}</small>
      </div>
      <button
        type="button"
        className="pt-btn pt-btn--ghost pt-btn--sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <IconUpload size={14} /> {url ? S.replace : S.upload}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Reset first: picking the same file twice must still fire.
          e.target.value = '';
          if (file) onPick(file);
        }}
      />
    </div>
  );
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const DOC_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

/* ─── the page ────────────────────────────────────────────────────────── */

export default function ParentOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState<IntakeForm>(() => emptyIntake());
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [childName, setChildName] = useState('your child');
  const [childId, setChildId] = useState<string>('');
  const [className, setClassName] = useState<string | null>(null);
  const [status, setStatus] = useState<IntakeStatus>('draft');
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [saving, setSaving] = useState<'draft' | 'submitted' | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await getJson<IntakeResponse>('/api/potato/intake');
        if (!alive) return;
        setForm(data.form);
        setUrls(data.urls ?? {});
        setChildName(data.child?.name ?? 'your child');
        setChildId(data.child?.id ?? '');
        setClassName(data.className ?? null);
        setStatus(data.status ?? 'draft');
        setFatal(null);
      } catch (err) {
        if (!alive) return;
        if (err instanceof PotatoApiError && err.status === 401) {
          router.replace('/potato/parents');
          return;
        }
        setFatal(messageFrom(err, 'Could not open the form.'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  /* section patchers — one shape, so nothing can be half-updated */
  function patch<K extends keyof IntakeForm>(key: K, value: Partial<IntakeForm[K]>) {
    setForm((f) => ({ ...f, [key]: { ...f[key], ...value } }));
  }

  const toggleConsent = useCallback((key: ConsentKey) => {
    setForm((f) => {
      const granted = !f.consents[key].granted;
      return {
        ...f,
        consents: {
          ...f.consents,
          [key]: { granted, at: granted ? new Date().toISOString() : null },
        },
      };
    });
  }, []);

  const upload = useCallback(
    async (slot: string, kind: UploadKind, file: File, index: number, apply: (path: string) => void) => {
      setBusyKey(slot);
      try {
        const body = new FormData();
        body.append('kind', kind);
        body.append('index', String(index));
        body.append('file', file);
        const res = await postForm<{ path: string; url: string | null }>(
          '/api/potato/intake/upload',
          body,
        );
        apply(res.path);
        if (res.url) setUrls((u) => ({ ...u, [res.path]: res.url as string }));
      } catch (err) {
        showToast(messageFrom(err, 'That didn’t upload.'), true);
      } finally {
        setBusyKey(null);
      }
    },
    [showToast],
  );

  const save = useCallback(
    async (next: 'draft' | 'submitted') => {
      if (saving) return;
      setProblems([]);

      if (next === 'submitted') {
        // Check here first so the family sees every gap at once, in their own
        // words. The server checks again — this is courtesy, not the gate.
        const result = validateIntake(form);
        if (!result.ok) {
          setProblems(result.errors.map((e) => e.message));
          showToast('A few things still need filling in.', true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      setSaving(next);
      try {
        await postJson('/api/potato/intake', { form, status: next });
        setStatus(next);
        showToast(next === 'submitted' ? 'Sent to your teacher. Thank you.' : S.saved);
      } catch (err) {
        showToast(messageFrom(err, 'That didn’t save.'), true);
      } finally {
        setSaving(null);
      }
    },
    [form, saving, showToast],
  );

  const urlFor = (path?: string) => (path ? urls[path] ?? null : null);

  if (loading) {
    return (
      <div className="pt-app">
        <div className="pt-scroll">
          <div className="pt-empty">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Link href="/potato/parents/home" className="pt-iconbtn" aria-label="Back">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">{`${childName}’s profile`}</h1>
        </div>
        <Avatar name={childName} seed={childId || childName} url={urlFor(form.documents.facePhotoPath)} size="xs" />
      </div>

      <div className="pt-scroll">
        {fatal ? <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div> : null}

        <div className="pt-greet">
          <h2>{`Tell us about ${childName}`}</h2>
          <p>
            {className ? `For ${className}. ` : ''}
            {'Save as you go — nothing is sent until you press Submit, and nothing reaches the classroom until your teacher has read it.'}
          </p>
        </div>

        {status === 'submitted' ? (
          <div className="ptob-banner">
            <IconCheck size={13} color="#23395B" weight={3.6} /> {S.submitted} — your teacher will read it soon. You
            can still make changes and send it again.
          </div>
        ) : null}
        {status === 'committed' ? (
          <div className="ptob-banner ptob-banner--done">
            <IconCheck size={13} color="#23395B" weight={3.6} /> {S.committed}. If anything changes, edit below and
            submit again.
          </div>
        ) : null}

        {problems.length > 0 ? (
          <div className="ptob-problems">
            <b>Before you submit</b>
            <ul>
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* ── 1. identity ── */}
        <Section title={S.sectionIdentity} hint={S.hintIdentity}>
          <Field label={S.legalName}>
            <Text value={form.identity.legalName} onChange={(v) => patch('identity', { legalName: v })} />
          </Field>
          <Field label={S.preferredName} optional>
            <Text
              value={form.identity.preferredName ?? ''}
              onChange={(v) => patch('identity', { preferredName: v })}
            />
          </Field>
          <Field label={S.dob}>
            <Text type="date" value={form.identity.dob} onChange={(v) => patch('identity', { dob: v })} />
          </Field>
          <Field label={S.sex} optional>
            <select
              className="pt-input"
              value={form.identity.sex}
              onChange={(e) => patch('identity', { sex: e.target.value as ChildSex })}
            >
              <option value="">{S.sexUnspecified}</option>
              <option value="female">{S.sexFemale}</option>
              <option value="male">{S.sexMale}</option>
            </select>
          </Field>
          <Field label={S.nationality} optional>
            <Text
              value={form.identity.nationality ?? ''}
              onChange={(v) => patch('identity', { nationality: v })}
            />
          </Field>
          <Field label={S.homeLanguages} optional>
            <Text
              value={(form.identity.homeLanguages ?? []).join(', ')}
              placeholder={S.homeLanguagesHint}
              onChange={(v) =>
                patch('identity', {
                  homeLanguages: v
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
        </Section>

        {/* ── 2. guardians ── */}
        <Section title={S.sectionFamily} hint={S.hintFamily}>
          {form.family.guardians.map((g, i) => (
            <Repeat
              key={`g-${i}`}
              title={`${S.guardian} ${i + 1}`}
              onRemove={
                form.family.guardians.length > 1
                  ? () => patch('family', { guardians: form.family.guardians.filter((_, j) => j !== i) })
                  : null
              }
            >
              {(
                [
                  ['name', S.name],
                  ['relation', S.relation],
                  ['phone', S.phone],
                  ['wechat', S.wechat],
                  ['email', S.email],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label} optional={key === 'wechat' || key === 'email'}>
                  <Text
                    value={g[key] ?? ''}
                    type={key === 'phone' ? 'tel' : key === 'email' ? 'email' : 'text'}
                    onChange={(v) =>
                      patch('family', {
                        guardians: form.family.guardians.map((row, j) =>
                          j === i ? { ...row, [key]: v } : row,
                        ),
                      })
                    }
                  />
                </Field>
              ))}
            </Repeat>
          ))}
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--sm ptob-add"
            onClick={() => patch('family', { guardians: [...form.family.guardians, emptyGuardian()] })}
          >
            <IconPlus size={14} /> {S.addGuardian}
          </button>
          <Field label={S.homeAddress} optional>
            <Area value={form.family.homeAddress ?? ''} onChange={(v) => patch('family', { homeAddress: v })} />
          </Field>
        </Section>

        {/* ── 3. emergency ── */}
        <Section title={S.sectionEmergency} hint={S.hintEmergency}>
          {form.emergency.contacts.map((c, i) => (
            <Repeat
              key={`e-${i}`}
              title={`${S.emergencyContact} ${i + 1}`}
              onRemove={
                form.emergency.contacts.length > 1
                  ? () => patch('emergency', { contacts: form.emergency.contacts.filter((_, j) => j !== i) })
                  : null
              }
            >
              {(
                [
                  ['name', S.name],
                  ['relation', S.relation],
                  ['phone', S.phone],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <Text
                    value={c[key] ?? ''}
                    type={key === 'phone' ? 'tel' : 'text'}
                    onChange={(v) =>
                      patch('emergency', {
                        contacts: form.emergency.contacts.map((row, j) =>
                          j === i ? { ...row, [key]: v } : row,
                        ),
                      })
                    }
                  />
                </Field>
              ))}
            </Repeat>
          ))}
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--sm ptob-add"
            onClick={() =>
              patch('emergency', { contacts: [...form.emergency.contacts, emptyEmergencyContact()] })
            }
          >
            <IconPlus size={14} /> {S.addEmergencyContact}
          </button>
        </Section>

        {/* ── 4. pickup ── */}
        <Section title={S.sectionPickup} hint={S.hintPickup}>
          {form.pickup.persons.map((p, i) => (
            <Repeat
              key={`p-${i}`}
              title={`${S.pickupPerson} ${i + 1}`}
              onRemove={
                form.pickup.persons.length > 1
                  ? () => patch('pickup', { persons: form.pickup.persons.filter((_, j) => j !== i) })
                  : null
              }
            >
              {(
                [
                  ['name', S.name],
                  ['relation', S.relation],
                  ['phone', S.phone],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <Text
                    value={p[key] ?? ''}
                    type={key === 'phone' ? 'tel' : 'text'}
                    onChange={(v) =>
                      patch('pickup', {
                        persons: form.pickup.persons.map((row, j) => (j === i ? { ...row, [key]: v } : row)),
                      })
                    }
                  />
                </Field>
              ))}
              <Upload
                label={S.pickupPhoto}
                hint="Staff match a face at the door."
                url={urlFor(p.photoPath)}
                accept={IMAGE_ACCEPT}
                busy={busyKey === `pickup-${i}`}
                onPick={(file) =>
                  upload(`pickup-${i}`, 'pickup', file, i, (path) =>
                    setForm((f) => ({
                      ...f,
                      pickup: {
                        ...f.pickup,
                        persons: f.pickup.persons.map((row, j) =>
                          j === i ? { ...row, photoPath: path } : row,
                        ),
                      },
                    })),
                  )
                }
              />
            </Repeat>
          ))}
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--sm ptob-add"
            disabled={form.pickup.persons.length >= 10}
            onClick={() => patch('pickup', { persons: [...form.pickup.persons, emptyPickupPerson()] })}
          >
            <IconPlus size={14} /> {S.addPickupPerson}
          </button>
          <Field label={S.pickupNotes} optional>
            <Area value={form.pickup.notes ?? ''} onChange={(v) => patch('pickup', { notes: v })} />
          </Field>
        </Section>

        {/* ── 5. health ── */}
        <Section title={S.sectionHealth} hint={S.hintHealth}>
          {form.health.allergies.length === 0 ? <p className="ptob-none">{S.noAllergies}</p> : null}
          {form.health.allergies.map((a, i) => (
            <Repeat
              key={`a-${i}`}
              title={`${S.allergen} ${i + 1}`}
              onRemove={() => patch('health', { allergies: form.health.allergies.filter((_, j) => j !== i) })}
            >
              <Field label={S.allergen}>
                <Text
                  value={a.allergen}
                  onChange={(v) =>
                    patch('health', {
                      allergies: form.health.allergies.map((row, j) =>
                        j === i ? { ...row, allergen: v } : row,
                      ),
                    })
                  }
                />
              </Field>
              <Field label={S.severity}>
                <select
                  className="pt-input"
                  value={a.severity}
                  onChange={(e) =>
                    patch('health', {
                      allergies: form.health.allergies.map((row, j) =>
                        j === i ? { ...row, severity: e.target.value as AllergySeverity } : row,
                      ),
                    })
                  }
                >
                  <option value="mild">{S.severityMild}</option>
                  <option value="moderate">{S.severityModerate}</option>
                  <option value="severe">{S.severitySevere}</option>
                </select>
              </Field>
              <Field label={S.allergyAction} optional>
                <Area
                  value={a.action ?? ''}
                  onChange={(v) =>
                    patch('health', {
                      allergies: form.health.allergies.map((row, j) =>
                        j === i ? { ...row, action: v } : row,
                      ),
                    })
                  }
                />
              </Field>
            </Repeat>
          ))}
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--sm ptob-add"
            onClick={() => patch('health', { allergies: [...form.health.allergies, emptyAllergy()] })}
          >
            <IconPlus size={14} /> {S.addAllergy}
          </button>

          <Field label={S.dietaryRestrictions} optional>
            <Area
              value={form.health.dietaryRestrictions ?? ''}
              onChange={(v) => patch('health', { dietaryRestrictions: v })}
            />
          </Field>
          <Field label={S.conditions} optional>
            <Area value={form.health.conditions ?? ''} onChange={(v) => patch('health', { conditions: v })} />
          </Field>
          <Field label={S.medications} optional>
            <Area value={form.health.medications ?? ''} onChange={(v) => patch('health', { medications: v })} />
          </Field>
          <Field label={S.physicianName} optional>
            <Text
              value={form.health.physicianName ?? ''}
              onChange={(v) => patch('health', { physicianName: v })}
            />
          </Field>
          <Field label={S.physicianPhone} optional>
            <Text
              type="tel"
              value={form.health.physicianPhone ?? ''}
              onChange={(v) => patch('health', { physicianPhone: v })}
            />
          </Field>
          <Field label={S.bloodType} optional>
            <Text value={form.health.bloodType ?? ''} onChange={(v) => patch('health', { bloodType: v })} />
          </Field>
        </Section>

        {/* ── 6. documents ── */}
        <Section title={S.sectionDocuments} hint={S.hintDocuments}>
          <Upload
            label={S.facePhoto}
            hint={S.facePhotoHint}
            url={urlFor(form.documents.facePhotoPath)}
            accept={IMAGE_ACCEPT}
            busy={busyKey === 'face'}
            onPick={(file) =>
              upload('face', 'face', file, 0, (path) =>
                setForm((f) => ({ ...f, documents: { ...f.documents, facePhotoPath: path } })),
              )
            }
          />
          <Upload
            label={S.vaccinationBooklet}
            url={urlFor(form.documents.vaccinationBookletPath)}
            accept={DOC_ACCEPT}
            busy={busyKey === 'vaccination'}
            onPick={(file) =>
              upload('vaccination', 'vaccination', file, 0, (path) =>
                setForm((f) => ({ ...f, documents: { ...f.documents, vaccinationBookletPath: path } })),
              )
            }
          />
          <Upload
            label={S.healthCheck}
            url={urlFor(form.documents.healthCheckPath)}
            accept={DOC_ACCEPT}
            busy={busyKey === 'health_check'}
            onPick={(file) =>
              upload('health_check', 'health_check', file, 0, (path) =>
                setForm((f) => ({ ...f, documents: { ...f.documents, healthCheckPath: path } })),
              )
            }
          />
          {[0, 1, 2].map((i) => {
            const existing = (form.documents.medicalCertPaths ?? [])[i];
            return (
              <Upload
                key={`m-${i}`}
                label={`${S.medicalCerts} ${i + 1}`}
                url={urlFor(existing)}
                accept={DOC_ACCEPT}
                busy={busyKey === `medical-${i}`}
                onPick={(file) =>
                  upload(`medical-${i}`, 'medical', file, i, (path) =>
                    setForm((f) => {
                      const list = [...(f.documents.medicalCertPaths ?? [])];
                      list[i] = path;
                      return {
                        ...f,
                        documents: { ...f.documents, medicalCertPaths: list.filter(Boolean) },
                      };
                    }),
                  )
                }
              />
            );
          })}
        </Section>

        {/* ── 7. consents ── one checkbox per purpose, never one blanket tick ── */}
        <Section title={S.sectionConsents} hint={S.hintConsents}>
          {(
            [
              ['photo_internal', S.consentPhotoInternal, false],
              ['photo_marketing', S.consentPhotoMarketing, false],
              ['emergency_treatment', S.consentEmergencyTreatment, false],
              ['sunscreen_medication', S.consentSunscreenMedication, false],
              ['data_privacy', S.consentDataPrivacy, true],
            ] as [ConsentKey, string, boolean][]
          ).map(([key, label, required]) => (
            <label key={key} className="ptob-consent">
              <input
                type="checkbox"
                checked={form.consents[key].granted}
                onChange={() => toggleConsent(key)}
              />
              <span>
                {label}
                {required ? <i>{S.consentRequiredNote}</i> : null}
              </span>
            </label>
          ))}
          <p className="ptob-none">
            {`${CONSENT_KEYS.length} permissions — tick only the ones you agree to.`}
          </p>
        </Section>

        {/* ── 8. development ── */}
        <Section title={S.sectionDevelopment} hint={S.hintDevelopment}>
          {(
            [
              ['temperamentNotes', S.temperamentNotes],
              ['strengths', S.strengths],
              ['growthAreas', S.growthAreas],
              ['fears', S.fears],
              ['comfortItems', S.comfortItems],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} optional>
              <Area value={form.development[key] ?? ''} onChange={(v) => patch('development', { [key]: v })} />
            </Field>
          ))}
          <Field label={S.toileting} optional>
            <select
              className="pt-input"
              value={form.development.toileting ?? ''}
              onChange={(e) => patch('development', { toileting: e.target.value as ToiletingStatus })}
            >
              <option value="">{S.toiletingUnspecified}</option>
              <option value="trained">{S.toiletingTrained}</option>
              <option value="training">{S.toiletingTraining}</option>
              <option value="diapers">{S.toiletingDiapers}</option>
            </select>
          </Field>
          {(
            [
              ['napHabits', S.napHabits],
              ['eatingHabits', S.eatingHabits],
              ['separationHistory', S.separationHistory],
              ['priorCare', S.priorCare],
              ['otherNotes', S.otherNotes],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label} optional>
              <Area value={form.development[key] ?? ''} onChange={(v) => patch('development', { [key]: v })} />
            </Field>
          ))}
        </Section>

        <div className="ptob-actions">
          <button
            type="button"
            className="pt-btn pt-btn--ghost pt-btn--md"
            disabled={saving !== null}
            onClick={() => save('draft')}
          >
            {saving === 'draft' ? '…' : S.saveDraft}
          </button>
          <button
            type="button"
            className="pt-btn pt-btn--primary pt-btn--lg"
            disabled={saving !== null}
            onClick={() => save('submitted')}
          >
            {saving === 'submitted' ? '…' : S.submit}
          </button>
          <p className="pt-foothint">
            {'Only your child’s teacher sees this. Nothing here is shared with other families.'}
          </p>
        </div>
      </div>

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}

      {/* Page-scoped CSS. Plain <style dangerouslySetInnerHTML>, never styled-jsx
          — the house rule that cost this repo twelve failed deploys. Everything
          below is built from the pt-* tokens, so it moves with the theme. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
.ptob-sec{margin:0 0 22px}
.ptob-sec__h{margin:22px 2px 12px}
.ptob-sec__h h2{font-family:var(--pt-disp);font-weight:800;font-size:18px;margin:0;letter-spacing:-.01em}
.ptob-sec__h p{margin:4px 0 0;font-size:12.5px;font-weight:700;color:var(--pt-ink-50);line-height:1.45}
.ptob-f{display:block;margin-bottom:12px}
.ptob-f__l{display:flex;align-items:baseline;gap:7px;margin:0 3px 6px;font-size:12.5px;font-weight:800;color:var(--pt-ink-70)}
.ptob-f__l i{font-style:normal;font-size:10.5px;font-weight:800;color:var(--pt-ink-35);letter-spacing:.03em}
.ptob-area{height:auto;min-height:82px;padding:12px 14px;line-height:1.45;resize:vertical}
.ptob-rep{background:var(--pt-paper);border:1.5px solid var(--pt-sand-line);border-radius:var(--pt-r-card);
  padding:13px;margin-bottom:11px;box-shadow:var(--pt-sh-card)}
.ptob-rep__h{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 2px 11px;
  font-family:var(--pt-disp);font-weight:800;font-size:14px;color:var(--pt-ink)}
.ptob-x{width:34px;height:34px;border-radius:12px;border:none;background:#FFF0ED;color:var(--pt-coral-deep);
  display:grid;place-items:center;cursor:pointer;flex:none}
.ptob-add{width:100%;margin-bottom:14px}
.ptob-none{font-size:12.5px;font-weight:700;color:var(--pt-ink-35);margin:0 3px 11px;line-height:1.45}
.ptob-up{display:flex;align-items:center;gap:11px;background:var(--pt-paper);border:1.5px solid var(--pt-sand-line);
  border-radius:20px;padding:10px 12px;margin-bottom:10px;box-shadow:var(--pt-sh-card)}
.ptob-up__box{width:52px;height:52px;border-radius:14px;overflow:hidden;flex:none;background:var(--pt-sky);
  display:grid;place-items:center;border:1.5px solid var(--pt-sand-line)}
.ptob-up__box img{width:100%;height:100%;object-fit:cover;display:block}
.ptob-up__doc{font-family:var(--pt-mono);font-weight:700;font-size:11px;color:var(--pt-blue-deep)}
.ptob-up__none{color:var(--pt-ink-35);font-weight:800}
.ptob-up__t{flex:1;min-width:0}
.ptob-up__t b{display:block;font-family:var(--pt-disp);font-weight:800;font-size:14px;line-height:1.2}
.ptob-up__t small{display:block;font-size:11.5px;font-weight:700;color:var(--pt-ink-50);margin-top:3px;line-height:1.35}
.ptob-consent{display:flex;align-items:flex-start;gap:11px;background:var(--pt-paper);
  border:1.5px solid var(--pt-sand-line);border-radius:18px;padding:12px 13px;margin-bottom:9px;
  box-shadow:var(--pt-sh-card);cursor:pointer}
.ptob-consent input{width:22px;height:22px;flex:none;margin:1px 0 0;accent-color:var(--pt-honey);cursor:pointer}
.ptob-consent span{font-size:13px;font-weight:700;color:var(--pt-ink);line-height:1.45}
.ptob-consent span i{display:block;font-style:normal;font-size:11.5px;font-weight:800;
  color:var(--pt-honey-deep);margin-top:5px}
.ptob-banner{display:flex;align-items:center;gap:8px;background:var(--pt-sky);border:1.5px solid #DAEBF7;
  border-radius:16px;padding:11px 13px;margin-bottom:14px;font-size:12.5px;font-weight:700;
  color:var(--pt-ink);line-height:1.4}
.ptob-banner--done{background:var(--pt-butter-soft);border-color:#F3E2B6}
.ptob-problems{background:#FFF0ED;border:1.5px solid rgba(214,80,63,.28);border-radius:18px;
  padding:12px 14px;margin-bottom:16px}
.ptob-problems b{display:block;font-family:var(--pt-disp);font-weight:800;font-size:14px;
  color:var(--pt-coral-deep);margin-bottom:7px}
.ptob-problems ul{margin:0;padding-left:18px}
.ptob-problems li{font-size:12.5px;font-weight:700;color:var(--pt-ink-70);line-height:1.5;margin-bottom:4px}
.ptob-actions{display:grid;gap:10px;margin:26px 0 8px}
`,
        }}
      />
    </div>
  );
}
