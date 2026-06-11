// /montree/admin/settings/page.tsx
// School Settings — for principals.
// Dark forest theme. Logout removed (sidebar provides it). Back arrow removed (sidebar provides nav).
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';
import { Building2, KeyRound, UserRound, CreditCard, ArrowRight, Activity, BarChart3, Sliders, Upload } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';
import DeleteAccountSection from '@/components/montree/DeleteAccountSection';

interface School {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  plan_type: string;
}

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<School | null>(null);

  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    if (!schoolData || !principalData) {
      router.replace('/montree/login-select');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const s = schoolData ? JSON.parse(schoolData) : null;
    const p = principalData ? JSON.parse(principalData) : null;
    return {
      'Content-Type': 'application/json',
      'x-school-id': s?.id || '',
      'x-principal-id': p?.id || '',
    };
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/montree/admin/overview', { headers: getHeaders() });
      if (res.status === 401) {
        router.replace('/montree/login-select');
        return;
      }
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSchool(data.school);
      if (data.school) setSchoolName(data.school.name);
      if (data.principal) {
        setPrincipalName(data.principal.name);
        setPrincipalEmail(data.principal.email);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
      toast.error(t('admin.errors.failedToLoadSettings'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error(t('admin.errors.passwordsMismatch'));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        school_name: schoolName,
        principal_name: principalName,
        principal_email: principalEmail,
      };
      if (newPassword) payload.new_password = newPassword;

      const res = await fetch('/api/montree/admin/settings', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const sd = localStorage.getItem('montree_school');
        if (sd) {
          const sObj = JSON.parse(sd);
          sObj.name = schoolName;
          localStorage.setItem('montree_school', JSON.stringify(sObj));
        }
        const pd = localStorage.getItem('montree_principal');
        if (pd) {
          const pObj = JSON.parse(pd);
          pObj.name = principalName;
          pObj.email = principalEmail;
          localStorage.setItem('montree_principal', JSON.stringify(pObj));
        }
        toast.success(t('admin.messages.settingsSaved'));
        setNewPassword('');
        setConfirmPassword('');
        fetchData();
      } else {
        toast.error(t('admin.errors.failedToSaveSettings'));
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(t('admin.errors.failedToSaveSettings'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: T.textSecondary, fontFamily: T.sans }}>
        {t('admin.states.loadingSettings')}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary, maxWidth: 720 }}>
      <Toaster position="top-center" theme="dark" />

      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: 500,
            letterSpacing: -0.4,
            margin: 0,
          }}
        >
          {t('admin.sections.schoolSettings')}
        </h1>
        <p style={{ color: T.textSecondary, fontSize: 14, marginTop: 8, margin: '8px 0 0 0' }}>
          {t('admin.messages.manageSchoolProfile')}
        </p>
      </div>

      <div
        style={{
          background: T.cardBg,
          backdropFilter: 'blur(18px)',
          border: T.cardBorder,
          borderRadius: 18,
          padding: '26px 28px',
        }}
      >
        <SectionHeader icon={<Building2 size={18} strokeWidth={1.75} color={T.emerald} />}>
          {t('admin.labels.schoolInformation')}
        </SectionHeader>
        <Field label={t('admin.form.schoolName')}>
          <Input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder={t('admin.placeholders.schoolName') || 'e.g., Beijing International School'}
          />
        </Field>
        {school?.slug && (
          <div style={{ color: T.emeraldDim, fontSize: 12, marginTop: 6 }}>
            {t('admin.labels.schoolUrl')}: montree.app/{school.slug}
          </div>
        )}

        <Divider />

        <SectionHeader icon={<UserRound size={18} strokeWidth={1.75} color={T.emerald} />}>
          {t('admin.labels.principalAccount')}
        </SectionHeader>
        <Field label={t('admin.form.name')}>
          <Input
            value={principalName}
            onChange={(e) => setPrincipalName(e.target.value)}
            placeholder={t('admin.placeholders.yourName') || 'Your name'}
          />
        </Field>
        <Field label={t('admin.form.email')}>
          <Input
            type="email"
            value={principalEmail}
            onChange={(e) => setPrincipalEmail(e.target.value)}
            placeholder={
              t('admin.placeholders.principalEmail') || 'principal@school.com'
            }
          />
        </Field>

        <Divider />

        <SectionHeader icon={<KeyRound size={18} strokeWidth={1.75} color={T.emerald} />}>
          {t('admin.labels.changePassword')}
        </SectionHeader>
        <Field label={t('admin.form.newPassword')}>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={
              t('admin.placeholders.leaveBlank') || 'Leave blank to keep current'
            }
          />
        </Field>
        <Field label={t('admin.form.confirmPassword')}>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={
              t('admin.placeholders.confirmPassword') || 'Confirm password'
            }
          />
        </Field>

        {school && (
          <>
            <Divider />
            <SectionHeader icon={<CreditCard size={18} strokeWidth={1.75} color={T.emerald} />}>
              {t('admin.labels.subscription')}
            </SectionHeader>
            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                borderRadius: 12,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <Row label={t('admin.labels.status')}>
                <Badge
                  status={
                    school.subscription_status === 'active'
                      ? 'good'
                      : school.subscription_status === 'trial'
                        ? 'warn'
                        : 'bad'
                  }
                >
                  {school.subscription_status === 'active'
                    ? t('admin.states.active')
                    : school.subscription_status === 'trial'
                      ? t('admin.states.trial')
                      : t('admin.states.inactive')}
                </Badge>
              </Row>
              <Row label={t('admin.labels.plan')}>
                <span style={{ color: T.textPrimary, fontSize: 14 }}>
                  {school.plan_type || t('admin.states.free')}
                </span>
              </Row>
            </div>
            <Link
              href="/montree/admin/billing"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(52,211,153,0.10)',
                border: '1px solid rgba(52,211,153,0.25)',
                borderRadius: 12,
                color: T.emerald,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                marginTop: 8,
              }}
            >
              {t('admin.actions.manageSubscription')}
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </>
        )}

        <Divider />

        <SectionHeader icon={<Sliders size={18} strokeWidth={1.75} color={T.emerald} />}>
          Advanced &amp; reporting
        </SectionHeader>
        <p style={{ color: T.textMuted, fontSize: 12, marginTop: -8, marginBottom: 14 }}>
          Optional surfaces. The dashboard hides them by default — open from here when you want to dig in.
        </p>
        <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
          <ManageLink href="/montree/admin/pulse" icon={<Activity size={14} strokeWidth={1.75} />} label="Pulse" />
          <ManageLink href="/montree/admin/activity" icon={<Activity size={14} strokeWidth={1.75} />} label="Activity" />
          <ManageLink href="/montree/admin/reports" icon={<BarChart3 size={14} strokeWidth={1.75} />} label="Reports" />
          <ManageLink href="/montree/admin/features" icon={<Sliders size={14} strokeWidth={1.75} />} label="Feature flags" />
          <ManageLink href="/montree/admin/import" icon={<Upload size={14} strokeWidth={1.75} />} label="Bulk import" />
        </div>

        <Divider />

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px 22px',
            background: T.emerald,
            color: '#0a1a0f',
            border: 'none',
            borderRadius: 999,
            fontFamily: T.sans,
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.5 : 1,
            marginTop: 6,
          }}
        >
          {saving ? t('admin.states.saving') : t('admin.actions.saveChanges')}
        </button>
      </div>

      {/* Delete Account (Apple App Store Guideline 5.1.1(v)) */}
      <div style={{ marginTop: 24 }}>
        <DeleteAccountSection redirectTo="/montree/login" />
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
      }}
    >
      {icon}
      <h2
        style={{
          fontFamily: T.serif,
          fontSize: 16,
          fontWeight: 500,
          color: T.textPrimary,
          margin: 0,
          letterSpacing: -0.2,
        }}
      >
        {children}
      </h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 600,
          color: T.emeraldDim,
          textTransform: 'uppercase',
          letterSpacing: 1.2,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        padding: '12px 14px',
        background: T.inputBg,
        border: T.inputBorder,
        borderRadius: 10,
        color: T.textPrimary,
        fontFamily: T.sans,
        fontSize: 14,
        outline: 'none',
      }}
    />
  );
}

function Divider() {
  return (
    <div
      style={{
        borderTop: '1px solid rgba(52,211,153,0.10)',
        margin: '20px 0',
      }}
    />
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 0',
      }}
    >
      <span style={{ color: T.textSecondary, fontSize: 13 }}>{label}</span>
      {children}
    </div>
  );
}

function ManageLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'rgba(8,20,12,0.45)',
        border: '1px solid rgba(52,211,153,0.12)',
        borderRadius: 10,
        color: T.textSecondary,
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: T.emeraldDim }}>{icon}</span>
        {label}
      </span>
      <ArrowRight size={14} strokeWidth={2} color={T.emeraldDim} />
    </Link>
  );
}

function Badge({
  status,
  children,
}: {
  status: 'good' | 'warn' | 'bad';
  children: React.ReactNode;
}) {
  const palette = {
    good: { bg: 'rgba(52,211,153,0.18)', fg: T.emerald },
    warn: { bg: 'rgba(232,201,106,0.18)', fg: T.gold },
    bad: { bg: 'rgba(248,113,113,0.18)', fg: '#f87171' },
  }[status];
  return (
    <span
      style={{
        padding: '4px 10px',
        background: palette.bg,
        color: palette.fg,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}
