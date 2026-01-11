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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          schoolName, 
          email, 
          plan: 'school' 
        }),
      });

      const data = await response.json();

      if (data.demo) {
        // Stripe not configured - redirect to welcome page in demo mode
        router.push(data.redirect);
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError(data.error || 'Something went wrong');
        setLoading(false);
      }
    } catch (err) {
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
          <div className="flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="#demo" className="text-gray-600 hover:text-gray-900">Demo</a>
            <Link 
              href="/teacher"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-emerald-50 via-white to-cyan-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
                Montessori Progress Tracking
                <span className="text-emerald-600"> Made Simple</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                The complete platform for Montessori schools to track student progress, 
                manage curriculum, and keep parents informed. Used by teachers worldwide.
              </p>
              <div className="flex gap-4">
                <a 
                  href="#pricing"
                  className="px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-200"
                >
                  Start Free Trial
                </a>
                <a 
                  href="#demo"
                  className="px-8 py-4 bg-white text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition border-2 border-gray-200"
                >
                  Watch Demo
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
                    <div className="font-bold text-gray-900">Emma's Progress</div>
                    <div className="text-sm text-gray-500">Age 4 • Primary Class</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-pink-600">Practical Life</span>
                      <span className="text-gray-500">18/24 works</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-pink-500 rounded-full" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-purple-600">Sensorial</span>
                      <span className="text-gray-500">12/20 works</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{width: '60%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-600">Mathematics</span>
                      <span className="text-gray-500">8/30 works</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{width: '27%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-green-600">Language</span>
                      <span className="text-gray-500">15/25 works</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{width: '60%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                ⭐ 342 Works
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100">
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
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything Your School Needs</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built by Montessori teachers, for Montessori teachers. Every feature designed to save you time.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-pink-50 to-white p-8 rounded-2xl border border-pink-100">
              <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                📊
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Progress Tracking</h3>
              <p className="text-gray-600">
                Track each child's journey through 342 Montessori works. Presented, practicing, mastered - all at a glance.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-purple-50 to-white p-8 rounded-2xl border border-purple-100">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                👩‍🏫
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Teacher Tools</h3>
              <p className="text-gray-600">
                Circle time planner, material generators, flashcard makers, and phonics guides. Everything in one place.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-blue-50 to-white p-8 rounded-2xl border border-blue-100">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                👨‍👩‍👧
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Parent Portal</h3>
              <p className="text-gray-600">
                Keep parents informed with beautiful progress reports, activity logs, and recommended home activities.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-green-50 to-white p-8 rounded-2xl border border-green-100">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                🎮
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Learning Games</h3>
              <p className="text-gray-600">
                13 interactive games for phonics, reading, and math. Children learn while having fun.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gradient-to-br from-orange-50 to-white p-8 rounded-2xl border border-orange-100">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                📚
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Full Curriculum</h3>
              <p className="text-gray-600">
                Complete Montessori curriculum with video demonstrations, materials lists, and teaching guides.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gradient-to-br from-cyan-50 to-white p-8 rounded-2xl border border-cyan-100">
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center text-3xl mb-6">
                📱
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Works Everywhere</h3>
              <p className="text-gray-600">
                Use on iPads in the classroom, phones for parents, or desktop for planning. Always in sync.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">
              Start with a 14-day free trial. No credit card required.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* School Plan */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-100 relative">
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
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-xl">✓</span>
                  <span>Unlimited teachers</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-xl">✓</span>
                  <span>Unlimited students</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-xl">✓</span>
                  <span>Parent portal access</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-xl">✓</span>
                  <span>All 342 curriculum works</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-xl">✓</span>
                  <span>13 learning games</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-500 text-xl">✓</span>
                  <span>Email support</span>
                </li>
              </ul>
              <button 
                onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition"
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
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 text-xl">✓</span>
                  <span>Up to 10 schools</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 text-xl">✓</span>
                  <span>District-wide reporting</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 text-xl">✓</span>
                  <span>Custom branding</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 text-xl">✓</span>
                  <span>Admin dashboard</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 text-xl">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-emerald-400 text-xl">✓</span>
                  <span>Training included</span>
                </li>
              </ul>
              <button 
                onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition"
              >
                Contact Sales
              </button>
            </div>
          </div>

          {/* Revenue projection */}
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>💡 100 schools + 10 districts = $58,680/year recurring revenue</p>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">See It In Action</h2>
          <p className="text-xl text-gray-600 mb-8">
            Try our live demo - no signup required
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <Link 
              href="/teacher"
              className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200 hover:border-amber-400 transition group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition">👩‍🏫</div>
              <div className="font-bold text-gray-900 mb-1">Teacher Portal</div>
              <div className="text-sm text-gray-500">Login: Any name / 123</div>
            </Link>
            <Link 
              href="/parent/home"
              className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border-2 border-blue-200 hover:border-blue-400 transition group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition">👨‍👩‍👧</div>
              <div className="font-bold text-gray-900 mb-1">Parent Portal</div>
              <div className="text-sm text-gray-500">Login: demo@test.com</div>
            </Link>
            <Link 
              href="/games"
              className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200 hover:border-green-400 transition group"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition">🎮</div>
              <div className="font-bold text-gray-900 mb-1">Learning Games</div>
              <div className="text-sm text-gray-500">No login needed</div>
            </Link>
          </div>
        </div>
      </section>

      {/* Signup Form */}
      <section id="signup" className="py-20 bg-gradient-to-br from-emerald-600 to-cyan-600">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white rounded-2xl p-8 shadow-2xl">
            {!submitted ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Start Your Free Trial</h2>
                <p className="text-gray-500 text-center mb-8">14 days free, no credit card required</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                      placeholder="Sunshine Montessori School"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100"
                      placeholder="principal@school.com"
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition text-lg disabled:bg-emerald-400 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin">⏳</span> Setting up...
                      </span>
                    ) : (
                      'Start Free Trial →'
                    )}
                  </button>
                </form>
                <p className="text-xs text-gray-400 text-center mt-4">
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
                  className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌳</span>
              <span className="text-xl font-bold text-white">Montree</span>
            </div>
            <div className="text-sm">
              © 2026 Montree. Built with ❤️ for Montessori educators.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
