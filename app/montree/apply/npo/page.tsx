'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NPOApplicationPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Step 1: Organization Info
  const [organizationName, setOrganizationName] = useState('');
  const [organizationType, setOrganizationType] = useState('NPO');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  // Step 2: Mission & Community
  const [missionStatement, setMissionStatement] = useState('');
  const [communityServed, setCommunityServed] = useState('');
  const [estimatedStudents, setEstimatedStudents] = useState('');
  const [tuitionModel, setTuitionModel] = useState('Free');

  // Step 3: Contact & Submit
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia',
    'Austria', 'Bangladesh', 'Belgium', 'Brazil', 'Canada',
    'China', 'Colombia', 'Costa Rica', 'Croatia', 'Cyprus',
    'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador', 'Egypt',
    'El Salvador', 'Estonia', 'Ethiopia', 'Finland', 'France',
    'Germany', 'Ghana', 'Greece', 'Guatemala', 'Haiti',
    'Honduras', 'Hong Kong', 'Hungary', 'India', 'Indonesia',
    'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
    'Jordan', 'Kenya', 'Latvia', 'Lebanon', 'Lithuania',
    'Luxembourg', 'Malaysia', 'Mexico', 'Morocco', 'Nepal',
    'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan',
    'Panama', 'Paraguay', 'Peru', 'Philippines', 'Poland',
    'Portugal', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia',
    'Singapore', 'Slovakia', 'Slovenia', 'South Africa', 'South Korea',
    'Spain', 'Sri Lanka', 'Sweden', 'Switzerland', 'Taiwan',
    'Thailand', 'Tunisia', 'Turkey', 'Uganda', 'Ukraine',
    'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Venezuela',
    'Vietnam', 'Yemen', 'Zimbabwe'
  ];

  const organizationTypes = ['NPO', 'NGO', 'Charity', 'Foundation', 'Community Org'];
  const tuitionModels = ['Free', 'Sliding Scale', 'Subsidized', 'Low Cost'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!organizationName.trim()) {
      setError('Organization name is required');
      return;
    }
    if (!country) {
      setError('Country is required');
      return;
    }
    if (!contactName.trim()) {
      setError('Contact name is required');
      return;
    }
    if (!contactEmail.trim()) {
      setError('Contact email is required');
      return;
    }
    if (!missionStatement.trim()) {
      setError('Mission statement is required');
      return;
    }
    if (!communityServed.trim()) {
      setError('Community description is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/montree/apply/npo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_name: organizationName,
          organization_type: organizationType,
          registration_number: registrationNumber,
          country,
          city,
          mission_statement: missionStatement,
          community_served: communityServed,
          estimated_students: estimatedStudents ? parseInt(estimatedStudents) : null,
          tuition_model: tuitionModel,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          documentation_url: documentationUrl,
          additional_notes: additionalNotes,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Application submission failed');
      }

      setSubmittedEmail(contactEmail);
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
        <div className="relative z-10 w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">✓</span>
          </div>

          <h1 className="text-3xl font-semibold text-white mb-2">Application Submitted</h1>
          <p className="text-emerald-300/70 mb-6">Thank you for applying to the Community Impact Program</p>

          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-6 mb-6 space-y-4">
            <div>
              <p className="text-white/70 text-sm mb-1">We'll review your application</p>
              <p className="text-emerald-300 font-semibold">within 5-7 business days</p>
            </div>

            <div className="h-px bg-white/10" />

            <div>
              <p className="text-white/70 text-sm mb-2">Decision notification sent to:</p>
              <p className="text-white font-semibold break-all">{submittedEmail}</p>
            </div>
          </div>

          <p className="text-white/60 text-sm mb-8">
            In the meantime, explore our platform at{' '}
            <Link href="/montree" className="text-emerald-400 hover:text-emerald-300">
              montree.app
            </Link>
          </p>

          <Link
            href="/montree"
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            Return to Montree
          </Link>
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
      <div className="relative z-10 w-full max-w-2xl">
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-6">
            <span className="text-4xl">🌍</span>
          </div>
          <h1 className="text-4xl font-light text-white mb-2">
            Community <span className="font-semibold">Impact Program</span>
          </h1>
          <p className="text-emerald-300/70 text-lg mb-6">
            Free Montessori software for schools serving underprivileged communities
          </p>

          {/* Banner */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-400/30 rounded-xl p-6 mb-8">
            <p className="text-white/90 leading-relaxed">
              We believe every child deserves quality Montessori education. If your organization serves underprivileged communities, you may qualify for <span className="text-emerald-300 font-semibold">free lifetime access</span> to Montree.
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-all ${step >= 1 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full transition-all ${step >= 2 ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className={`w-3 h-3 rounded-full transition-all ${step >= 3 ? 'bg-emerald-400' : 'bg-white/20'}`} />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Organization Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Organization Name *</label>
                <input
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="e.g. Hope Education Foundation"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Organization Type *</label>
                  <select
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value)}
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  >
                    {organizationTypes.map((type) => (
                      <option key={type} value={type} className="bg-slate-900">
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Registration Number</label>
                  <input
                    type="text"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    placeholder="e.g. EIN, Charity Number"
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Country *</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                    required
                  >
                    <option value="" className="bg-slate-900">
                      Select country
                    </option>
                    {countries.map((c) => (
                      <option key={c} value={c} className="bg-slate-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Lagos"
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all mt-6"
              >
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Mission & Community */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Mission Statement *</label>
                <textarea
                  value={missionStatement}
                  onChange={(e) => setMissionStatement(e.target.value)}
                  placeholder="Describe your organization's mission and approach to education..."
                  rows={4}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Community Served *</label>
                <p className="text-white/60 text-xs mb-2">Describe the underprivileged community you serve</p>
                <textarea
                  value={communityServed}
                  onChange={(e) => setCommunityServed(e.target.value)}
                  placeholder="Tell us about the communities, challenges they face, and how Montree can help..."
                  rows={4}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Estimated Students</label>
                  <input
                    type="number"
                    value={estimatedStudents}
                    onChange={(e) => setEstimatedStudents(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Tuition Model *</label>
                  <select
                    value={tuitionModel}
                    onChange={(e) => setTuitionModel(e.target.value)}
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                  >
                    {tuitionModels.map((model) => (
                      <option key={model} value={model} className="bg-slate-900">
                        {model}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact & Submit */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Contact Name *</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-emerald-300/80 text-sm mb-2">Contact Email *</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@organization.com"
                    className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Contact Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Documentation URL</label>
                <p className="text-white/60 text-xs mb-2">Link to NPO registration or mission documents (optional)</p>
                <input
                  type="url"
                  value={documentationUrl}
                  onChange={(e) => setDocumentationUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-emerald-300/80 text-sm mb-2">Additional Notes</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Any additional information you'd like us to know..."
                  rows={3}
                  className="w-full p-4 bg-white/10 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 outline-none transition-all resize-none"
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
                  onClick={() => setStep(2)}
                  className="px-6 py-4 bg-white/10 backdrop-blur border border-white/20 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>

              <p className="text-white/50 text-xs text-center mt-4">
                * Required fields • We take your privacy seriously
              </p>
            </div>
          )}
        </form>

        {/* Navigation Links */}
        <div className="mt-8 text-center">
          <p className="text-white/50 text-sm">
            Looking for something else?{' '}
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
