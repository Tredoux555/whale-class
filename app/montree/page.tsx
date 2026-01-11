'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MontreeLandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, email, plan: 'school' }),
      });

      const data = await response.json();

      if (data.demo) {
        router.push(data.redirect);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong');
        setLoading(false);
      }
    } catch {
      setError('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🌳</span>
            <span className="text-2xl font-bold text-gray-900">Montree</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">Demo</a>
            <Link 
              href="/teacher"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium shadow-lg shadow-emerald-200"
            >
              Sign In
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600 hover:text-gray-900">Demo</a>
            <Link 
              href="/teacher"
              className="block w-full text-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium"
            >
              Sign In
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-6">
                <span>✨</span>
                <span>Trusted by Montessori Schools Worldwide</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
                Montessori Progress Tracking
                <span className="text-emerald-600"> Made Simple</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-8">
                The complete platform for Montessori schools to track student progress, 
                manage curriculum, and keep parents informed.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="#signup"
                  className="px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-200 text-center"
                >
                  Start Free Trial
                </a>
                <a 
                  href="#demo"
                  className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition border-2 border-gray-200 text-center"
                >
                  Try Demo
                </a>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span> 14-day free trial
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
                    👧
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Emma&apos;s Progress</div>
                    <div className="text-sm text-gray-500">Age 4 • Primary Class</div>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Practical Life', color: 'pink', percent: 75, count: '18/24' },
                    { name: 'Sensorial', color: 'purple', percent: 60, count: '12/20' },
                    { name: 'Mathematics', color: 'blue', percent: 27, count: '8/30' },
                    { name: 'Language', color: 'green', percent: 60, count: '15/25' },
                  ].map((area) => (
                    <div key={area.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`text-${area.color}-600 font-medium`}>{area.name}</span>
                        <span className="text-gray-500">{area.count} works</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full bg-${area.color}-500 rounded-full transition-all duration-500`} style={{width: `${area.percent}%`}}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                ⭐ 342 Works
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white px-5 py-3 rounded-xl shadow-xl border border-gray-100">
                <div className="text-2xl font-bold text-emerald-600">98%</div>
                <div className="text-xs text-gray-500">Teacher satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Everything Your School Needs</h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Built by Montessori teachers, for Montessori teachers. Every feature designed to save you time.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '📊', title: 'Progress Tracking', desc: 'Track each child\'s journey through 342 Montessori works. Presented, practicing, mastered - all at a glance.', color: 'pink' },
              { icon: '👩‍🏫', title: 'Teacher Tools', desc: 'Circle time planner, material generators, flashcard makers, and phonics guides. Everything in one place.', color: 'purple' },
              { icon: '👨‍👩‍👧', title: 'Parent Portal', desc: 'Keep parents informed with beautiful progress reports, activity logs, and recommended home activities.', color: 'blue' },
              { icon: '🎮', title: 'Learning Games', desc: '13 interactive games for phonics, reading, and math. Children learn while having fun.', color: 'green' },
              { icon: '📚', title: 'Full Curriculum', desc: 'Complete Montessori curriculum with video demonstrations, materials lists, and teaching guides.', color: 'orange' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Use on iPads in the classroom, phones for parents, or desktop for planning. Always in sync.', color: 'cyan' },
            ].map((feature) => (
              <div key={feature.title} className={`bg-gradient-to-br from-${feature.color}-50 to-white p-8 rounded-2xl border border-${feature.color}-100 hover:shadow-lg transition-shadow`}>
                <div className={`w-14 h-14 bg-${feature.color}-100 rounded-xl flex items-center justify-center text-3xl mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg md:text-xl text-gray-600">Start with a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* School Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-emerald-200 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                Most Popular
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">School</h3>
                <p className="text-gray-500">Perfect for individual schools</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-gray-900">$29</span>
                  <span className="text-gray-500">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {['Unlimited teachers', 'Unlimited students', 'Parent portal access', 'All 342 curriculum works', '13 learning games', 'Email support'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="text-emerald-500 text-xl">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
              >
                Start Free Trial
              </button>
            </div>

            {/* District Plan */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-xl text-white">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">District</h3>
                <p className="text-gray-400">For school districts & networks</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold">$199</span>
                  <span className="text-gray-400">/month</span>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {['Up to 10 schools', 'District-wide reporting', 'Custom branding', 'Admin dashboard', 'Priority support', 'Training included'].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="text-emerald-400 text-xl">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition"
              >
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">See It In Action</h2>
          <p className="text-lg md:text-xl text-gray-600 mb-10">Try our live demo - no signup required</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { href: '/teacher', emoji: '👩‍🏫', title: 'Teacher Portal', creds: 'Any name / 123', gradient: 'from-amber-50 to-orange-50', border: 'amber' },
              { href: '/parent/demo', emoji: '👨‍👩‍👧', title: 'Parent Portal', creds: 'Auto-login demo', gradient: 'from-blue-50 to-cyan-50', border: 'blue' },
              { href: '/games', emoji: '🎮', title: 'Learning Games', creds: 'No login needed', gradient: 'from-green-50 to-emerald-50', border: 'green' },
            ].map((demo) => (
              <Link 
                key={demo.href}
                href={demo.href}
                className={`bg-gradient-to-br ${demo.gradient} p-8 rounded-2xl border-2 border-${demo.border}-200 hover:border-${demo.border}-400 transition-all hover:shadow-lg group`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition">{demo.emoji}</div>
                <div className="font-bold text-gray-900 mb-1">{demo.title}</div>
                <div className="text-sm text-gray-500">{demo.creds}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section id="signup" className="py-20 bg-gradient-to-br from-emerald-600 to-cyan-600">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            {!submitted ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Start Your Free Trial</h2>
                <p className="text-gray-500 text-center mb-8">14 days free, no credit card required</p>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 transition"
                      placeholder="Sunshine Montessori School"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 transition"
                      placeholder="principal@school.com"
                    />
                  </div>
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition text-lg disabled:bg-emerald-400 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Setting up...</span>
                      </span>
                    ) : (
                      'Start Free Trial →'
                    )}
                  </button>
                </form>
                <p className="text-xs text-gray-400 text-center mt-6">
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </p>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Montree!</h2>
                <p className="text-gray-600 mb-6">
                  Check your email at <strong>{email}</strong> for login instructions.
                </p>
                <Link 
                  href="/teacher"
                  className="inline-block px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold"
                >
                  Go to Teacher Portal →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌳</span>
              <span className="text-xl font-bold text-white">Montree</span>
            </div>
            <div className="text-sm text-center md:text-right">
              © 2026 Montree. Built with ❤️ for Montessori educators.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
