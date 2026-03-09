// /app/montree/admin/billing/page.tsx
// Billing and subscription management
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';

interface School {
  id: string;
  name: string;
  subscription_plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  max_students: number;
}

interface BillingRecord {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string;
  invoice_pdf_url: string | null;
  created_at: string;
}

const getPLANS = (t: (key: string) => string) => [
  {
    id: 'classroom',
    nameKey: 'admin.billing.planClassroom',
    price: 499,
    period: 'month',
    students: 50,
    featureKeys: ['admin.billing.featureUpTo50', 'admin.billing.featureFullCurriculum', 'admin.billing.featureParentPortal', 'admin.billing.featureProgressTracking', 'admin.billing.featureEmailSupport']
  },
  {
    id: 'school',
    nameKey: 'admin.billing.planSchool',
    price: 999,
    period: 'month',
    students: 200,
    featureKeys: ['admin.billing.featureUpTo200', 'admin.billing.featureAllClassroom', 'admin.billing.featureMultiClassroom', 'admin.billing.featureAdvancedAnalytics', 'admin.billing.featurePrioritySupport']
  },
  {
    id: 'enterprise',
    nameKey: 'admin.billing.planEnterprise',
    price: 1999,
    period: 'month',
    students: 9999,
    featureKeys: ['admin.billing.featureUnlimited', 'admin.billing.featureAllSchool', 'admin.billing.featureCustomBranding', 'admin.billing.featureApiAccess', 'admin.billing.featureDedicatedManager', 'admin.billing.featurePhoneSupport']
  },
];

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const plans = getPLANS(t);
  const [school, setSchool] = useState<School | null>(null);
  const [history, setHistory] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    
    // Check for success/cancel from Stripe
    if (searchParams.get('success')) {
      toast.success(t('toast.paymentSuccessful'));
    } else if (searchParams.get('canceled')) {
      toast.info(t('toast.checkoutCanceled'));
    }
  }, [searchParams]);

  const checkAuth = () => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) {
      router.push('/montree/principal/login');
      return;
    }
    setSchool(JSON.parse(schoolData));
    fetchBilling();
  };

  const getSchoolId = () => {
    const schoolData = localStorage.getItem('montree_school');
    return schoolData ? JSON.parse(schoolData).id : null;
  };

  const fetchBilling = async () => {
    try {
      const schoolId = getSchoolId();
      const res = await fetch(`/api/montree/billing/status?school_id=${schoolId}`);
      const data = await res.json();
      if (data.success) {
        setSchool(data.school);
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Fetch billing error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan);
    try {
      const schoolId = getSchoolId();
      const res = await fetch('/api/montree/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, plan }),
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(t('toast.failedToStartCheckout'));
      }
    } catch {
      toast.error(t('toast.failedToStartCheckout'));
    } finally {
      setUpgrading(null);
    }
  };

  const getTrialDaysLeft = () => {
    if (!school?.trial_ends_at) return 0;
    const ends = new Date(school.trial_ends_at);
    const now = new Date();
    return Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-4xl animate-bounce">💳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6">
      <Toaster position="top-center" />
      
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <Link href="/montree/admin" className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-block">
          {t('admin.billing.backToAdmin')}
        </Link>
        <h1 className="text-3xl font-light text-white">
          💳 <span className="font-semibold">{t('admin.billing.title')}</span>
        </h1>
      </div>

      {/* Current Plan */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold text-lg">{t('admin.billing.currentPlan')}</h2>
              <p className="text-3xl font-bold text-emerald-400 capitalize mt-1">
                {school?.subscription_plan || 'Trial'}
              </p>
              {school?.subscription_status === 'trialing' && (
                <p className="text-amber-400 text-sm mt-2">
                  ⏰ {t('admin.billing.trialDaysLeft').replace('{days}', getTrialDaysLeft().toString())}
                </p>
              )}
              {school?.current_period_end && school.subscription_status === 'active' && (
                <p className="text-white/50 text-sm mt-2">
                  {t('admin.billing.renewsOn').replace('{date}', new Date(school.current_period_end).toLocaleDateString())}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-white/50 text-sm">{t('admin.billing.studentLimit')}</p>
              <p className="text-2xl font-bold text-white">{school?.max_students || 50}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">{t('admin.billing.choosePlan')}</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white/10 backdrop-blur rounded-2xl p-6 border-2 transition ${
                school?.subscription_plan === plan.id
                  ? 'border-emerald-500'
                  : 'border-transparent hover:border-white/20'
              }`}
            >
              <h3 className="text-xl font-bold text-white">{t(plan.nameKey)}</h3>
              <div className="mt-2 mb-4">
                <span className="text-4xl font-bold text-white">${plan.price.toLocaleString()}</span>
                <span className="text-white/50">{t('admin.billing.perPeriod').replace('{period}', plan.period)}</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.featureKeys.map(featureKey => (
                  <li key={featureKey} className="text-white/70 text-sm flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {t(featureKey)}
                  </li>
                ))}
              </ul>
              {school?.subscription_plan === plan.id ? (
                <button disabled className="w-full py-3 bg-emerald-500/30 text-emerald-300 rounded-xl">
                  {t('admin.billing.currentPlanBadge')}
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgrading === plan.id}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition disabled:opacity-50"
                >
                  {upgrading === plan.id ? t('admin.billing.loading') : t('admin.billing.upgrade')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      {history.length > 0 && (
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-4">{t('admin.billing.billingHistory')}</h2>
          <div className="bg-white/10 backdrop-blur rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left text-white/50 text-sm p-4">{t('admin.billing.date')}</th>
                  <th className="text-left text-white/50 text-sm p-4">{t('admin.billing.description')}</th>
                  <th className="text-left text-white/50 text-sm p-4">{t('admin.billing.amount')}</th>
                  <th className="text-left text-white/50 text-sm p-4">{t('admin.billing.status')}</th>
                  <th className="text-left text-white/50 text-sm p-4">{t('admin.billing.invoice')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map(record => (
                  <tr key={record.id} className="border-t border-white/10">
                    <td className="text-white p-4">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="text-white/70 p-4">{record.description}</td>
                    <td className="text-white p-4">
                      ${(record.amount_cents / 100).toFixed(2)} {record.currency.toUpperCase()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        record.status === 'paid' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-amber-500/30 text-amber-300'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {record.invoice_pdf_url && (
                        <a href={record.invoice_pdf_url} target="_blank" className="text-emerald-400 hover:underline text-sm">
                          {t('admin.billing.download')}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-4xl animate-bounce">💳</div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  );
}
