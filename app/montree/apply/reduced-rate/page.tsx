'use client';

import { useState } from 'react';
import Link from 'next/link';

type ReasonType = 'developing_country' | 'small_school' | 'startup' | 'hardship' | 'other';
type TierType = 'tier_a_500' | 'tier_b_250' | 'tier_c_100' | 'custom';

export default function ReducedRateApplicationPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Step 1: School Information
  const [schoolName, setSchoolName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [estimatedStudents, setEstimatedStudents] = useState('');

  // Step 2: Financial Situation
  const [reason, setReason] = useState<ReasonType | ''>('');
  const [reasonDescription, setReasonDescription] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [requestedTier, setRequestedTier] = useState<TierType | ''>('');
  const [customAmount, setCustomAmount] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!schoolName.trim() || !country.trim() || !city.trim() || !contactName.trim() || !contactEmail.trim() || !estimatedStudents) {
      setError('Please complete all fields in Step 1');
      return;
    }

    if (!reason || !reasonDescription.trim() || !monthlyBudget || !requestedTier) {
      setError('Please complete all fields in Step 2');
      return;
    }

    if (requestedTier === 'custom' && !customAmount) {
      setError('Please enter a custom amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/apply/reduced-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          country,
          city,
          contactName,
          contactEmail,
          estimatedStudents: parseInt(estimatedStudents),
          reason,
          reasonDescription,
          monthlyBudget: parseInt(monthlyBudget),
          requestedTier: requestedTier === 'custom' ? `custom_${customAmount}` : requestedTier,
          documentationUrl: documentationUrl || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Application submission failed');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Application submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-3xl font-light text-white mb-2">
              Application <span className="font-semibold">Submitted</span>
            </h1>
            <p className="text-emerald-300/70 text-sm mb-8">
              Thank you for applying for reduced pricing!
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-emerald-300 mb-4">What's Next?</h2>
              <ul className="space-y-3 text-sm text-white/70">
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">1.</span>
                  <span>Our team will review your application within 2-3 business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">2.</span>
                  <span>You'll receive an email with our decision and next steps</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald-400 font-bold">3.</span>
                  <span>If approved, we'll set up your account with the approved pricing</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t border-white/10">
              <p className="text-white/50 text-xs">
                Application ID: <span className="text-emerald-400 font-mono">{Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Link
              href="/montree"
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all text-center block"
            >
              Return to Montree
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center">
          <p className="text-slate-500 text-xs">
            🌳 Montree • teacherpotato.xyz
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo & Progress */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">🌱</span>
          </div>
          <h1 className="text-3xl font-light text-white mb-2">
            Reduced Rate <span className="font-semibold">Application</span>
          </h1>
          <p className="text-emerald-300/70 text-sm mb-6">
            Making Montessori education software accessible to all
          </p>

          {/* Info Banner */}
          <div className="bg-white/5 backdrop-blur border border-emerald-400/30 rounded-xl p-4 mb-6">
            <p className="text-white/70 text-xs">
              Standard pricing is <span className="font-semibold">$1,000/month</span>. We offer reduced rates to ensure cost isn't a barrier to quality education.
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-emerald-400' : 'bg-white/20'}`} />
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: School Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Sunshine Montessori"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Costa Rica"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. San José"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Contact Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Maria García"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Contact Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@school.com"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Estimated Number of Students</label>
                <input
                  type="number"
                  value={estimatedStudents}
                  onChange={(e) => setEstimatedStudents(e.target.value)}
                  placeholder="e.g. 25"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  min="1"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!schoolName.trim() || !country.trim() || !city.trim() || !contactName.trim() || !contactEmail.trim() || !estimatedStudents}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-6"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Financial Situation */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Reason for Reduced Rate</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReasonType)}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all appearance-none"
                  required
                >
                  <option value="">Select a reason...</option>
                  <option value="developing_country">Developing country</option>
                  <option value="small_school">Small school (under 30 students)</option>
                  <option value="startup">New/startup school</option>
                  <option value="hardship">Financial hardship</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Please explain your situation</label>
                <textarea
                  value={reasonDescription}
                  onChange={(e) => setReasonDescription(e.target.value)}
                  placeholder="Tell us more about your school's circumstances..."
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all resize-none"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">What can you afford per month (USD)?</label>
                <input
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="e.g. 300"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Requested Rate Tier</label>
                <select
                  value={requestedTier}
                  onChange={(e) => setRequestedTier(e.target.value as TierType)}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all appearance-none"
                  required
                >
                  <option value="">Select a tier...</option>
                  <option value="tier_a_500">Tier A - $500/month (50% off)</option>
                  <option value="tier_b_250">Tier B - $250/month (75% off)</option>
                  <option value="tier_c_100">Tier C - $100/month (90% off)</option>
                  <option value="custom">Custom - Request specific amount</option>
                </select>
              </div>

              {requestedTier === 'custom' && (
                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Custom Monthly Amount (USD)</label>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Documentation URL (optional)</label>
                <input
                  type="url"
                  value={documentationUrl}
                  onChange={(e) => setDocumentationUrl(e.target.value)}
                  placeholder="https://example.com/documentation"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading || !reason || !reasonDescription.trim() || !monthlyBudget || !requestedTier || (requestedTier === 'custom' && !customAmount)}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Links */}
        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm">
            Questions?{' '}
            <Link href="/montree" className="text-emerald-400 hover:text-emerald-300">
              Back to Montree
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-slate-500 text-xs">
          🌳 Montree • teacherpotato.xyz
        </p>
      </div>
    </div>
  );
}
