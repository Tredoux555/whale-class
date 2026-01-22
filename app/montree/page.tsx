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
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🌳</span>
            <span className="text-2xl font-bold text-gray-900">Montree</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#security" className="text-gray-600 hover:text-gray-900 transition-colors">Security</a>
            <a href="#demo" className="text-gray-600 hover:text-gray-900 transition-colors">Demo</a>
            <Link 
              href="/montree/dashboard"
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-medium shadow-lg shadow-emerald-200"
            >
              Sign In
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600">How It Works</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600">Pricing</a>
            <a href="#security" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600">Security</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-gray-600">Demo</a>
            <Link href="/montree/dashboard" className="block w-full text-center px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-medium">
              Sign In
            </Link>
          </div>
        )}
      </nav>

      {/* HERO - Lead with emotion */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-amber-50" />
        
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-6">
              <span>🎬</span>
              <span>New: AI-powered weekly video reports</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Every Friday, parents
              <span className="text-emerald-600"> see their child&apos;s week</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Personalized videos with real photos of their work. 
              No more &quot;What did you do today?&quot; — they&apos;ll already know.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="#signup"
                className="px-8 py-4 bg-emerald-600 text-white text-lg font-semibold rounded-xl hover:bg-emerald-700 transition shadow-xl shadow-emerald-200"
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
          </div>

          {/* Video mockup - THE HOOK */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
              {/* Video player header */}
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-3">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center text-gray-400 text-sm">Emma&apos;s Week 3 • January 2026</div>
              </div>
              
              {/* Video content mockup */}
              <div className="relative aspect-video bg-gradient-to-br from-emerald-900 to-emerald-700 p-8 flex items-center">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 w-32 h-24 bg-white/30 rounded-lg" />
                  <div className="absolute top-4 right-4 w-32 h-24 bg-white/30 rounded-lg" />
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 h-32 bg-white/30 rounded-lg" />
                </div>
                
                <div className="relative z-10 w-full">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl shadow-lg">
                      👧
                    </div>
                    <div className="text-white">
                      <div className="text-2xl font-bold">This week, Emma...</div>
                      <div className="text-emerald-200">mastered 3 new works!</div>
                    </div>
                  </div>
                  
                  {/* Work photos strip */}
                  <div className="flex gap-3 overflow-hidden">
                    {['🧺 Spooning', '🔢 Number Rods', '✂️ Cutting'].map((work, i) => (
                      <div key={i} className="flex-shrink-0 bg-white/90 rounded-xl p-3 text-center min-w-[120px]">
                        <div className="text-3xl mb-1">{work.split(' ')[0]}</div>
                        <div className="text-xs text-gray-600 font-medium">{work.split(' ').slice(1).join(' ')}</div>
                        <div className="text-[10px] text-emerald-600 mt-1">✓ Mastered</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition">
                    <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-emerald-600 border-b-[12px] border-b-transparent ml-1" />
                  </div>
                </div>
              </div>
              
              {/* Video controls */}
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-4">
                <button className="text-white text-xl">▶</button>
                <div className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
                  <div className="w-1/3 h-full bg-emerald-500" />
                </div>
                <span className="text-gray-400 text-sm">0:45 / 2:15</span>
              </div>
            </div>
            
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">✓ Auto-generated weekly</span>
              <span className="flex items-center gap-1">✓ WeChat-ready</span>
              <span className="flex items-center gap-1">✓ Shareable with family</span>
            </div>
          </div>
        </div>
      </section>

      {/* THE PROBLEM - Pain points */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Sound familiar?</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { emoji: '😔', problem: '"What did you do at school today?"', answer: '"I don\'t know" / "Nothing"' },
              { emoji: '📝', problem: 'Hours spent on progress reports', answer: 'Every. Single. Term.' },
              { emoji: '📱', problem: 'Parents feel disconnected', answer: 'They want to see, not just read' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                <div className="text-4xl mb-4">{item.emoji}</div>
                <p className="font-semibold text-gray-900 mb-2">{item.problem}</p>
                <p className="text-gray-500 italic text-sm">{item.answer}</p>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-2xl font-semibold text-emerald-600">What if parents could see their child&apos;s progress — not just read about it?</p>
          </div>
        </div>
      </section>

      {/* THE SOLUTION - What we do */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Three things that change everything</h2>
            <p className="text-xl text-gray-600">Simple for teachers. Magical for parents.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Weekly Videos */}
            <div className="relative">
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 rounded-3xl p-8 h-full border border-rose-100">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl mb-6">
                  🎬
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Weekly Video Reports</h3>
                <p className="text-gray-600 mb-4">
                  Every Friday, parents receive a personalized video showing their child&apos;s actual work — 
                  what they practiced, what they mastered, with real photos and AI narration.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-rose-600">Auto-generated</span>
                  <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-rose-600">WeChat-ready</span>
                </div>
              </div>
              <div className="absolute -top-3 -right-3 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                ⭐ Most loved
              </div>
            </div>

            {/* Feature 2: Photo Documentation */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 h-full border border-blue-100">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl mb-6">
                📸
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Photo Documentation</h3>
              <p className="text-gray-600 mb-4">
                One tap to capture. Snap a photo of a child&apos;s work, and it&apos;s automatically 
                linked to their progress. Parents see the proof, not just checkboxes.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-blue-600">One-tap capture</span>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-blue-600">Auto-organized</span>
              </div>
            </div>

            {/* Feature 3: Curriculum Games */}
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-8 h-full border border-emerald-100">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl mb-6">
                🎮
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Curriculum Games</h3>
              <p className="text-gray-600 mb-4">
                Games that match what they&apos;re learning in class. Phonics, math, reading — 
                all aligned to Montessori progression. Learning continues at home.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-emerald-600">14 games</span>
                <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-emerald-600">Curriculum-aligned</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CURRICULUM SECTION */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                The complete Montessori curriculum.
                <span className="text-emerald-400"> Fully customizable.</span>
              </h2>
              <p className="text-xl text-gray-300 mb-8">
                195 works across all five areas. Every work has video demonstrations, 
                materials lists, and teaching guides. Customize it for your classroom.
              </p>
              
              <div className="space-y-4">
                {[
                  { area: 'Practical Life', count: 83, color: 'bg-green-500' },
                  { area: 'Sensorial', count: 32, color: 'bg-orange-500' },
                  { area: 'Mathematics', count: 45, color: 'bg-blue-500' },
                  { area: 'Language', count: 28, color: 'bg-pink-500' },
                  { area: 'Cultural', count: 7, color: 'bg-purple-500' },
                ].map((item) => (
                  <div key={item.area} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="flex-1">{item.area}</span>
                    <span className="text-gray-400">{item.count} works</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-white/10 rounded-xl">
                <p className="text-sm text-gray-300">
                  <span className="text-emerald-400 font-semibold">Real-time tracking:</span> Teachers tap to update, 
                  parents see it instantly. No end-of-term surprises.
                </p>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur">
              <div className="text-center text-6xl mb-4">🌳</div>
              <div className="text-center mb-6">
                <div className="text-5xl font-bold">195</div>
                <div className="text-gray-400">Montessori works</div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold">5</div>
                  <div className="text-xs text-gray-400">Curriculum areas</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-xs text-gray-400">Customizable</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold">📹</div>
                  <div className="text-xs text-gray-400">Video demos</div>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="text-2xl font-bold">🇨🇳</div>
                  <div className="text-xs text-gray-400">Chinese names</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-16 bg-emerald-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1,2,3,4,5].map(i => <span key={i} className="text-2xl">⭐</span>)}
          </div>
          <blockquote className="text-2xl md:text-3xl font-medium text-gray-900 mb-6">
            &quot;Parents used to ask what their child did every day. Now they show me the videos and ask how they can help at home.&quot;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center text-xl">👩‍🏫</div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">Lead Teacher</div>
              <div className="text-gray-500 text-sm">International Montessori School</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Simple pricing</h2>
            <p className="text-xl text-gray-600">Start free. No credit card required.</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-3xl p-8 md:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10">
              <div className="inline-block bg-white/20 rounded-full px-4 py-2 text-sm font-medium mb-6">
                14-day free trial
              </div>
              
              <div className="mb-6">
                <span className="text-6xl font-bold">$29</span>
                <span className="text-2xl text-emerald-100">/month</span>
              </div>
              
              <p className="text-xl text-emerald-100 mb-8">Per school. Unlimited everything.</p>
              
              <div className="grid sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8 text-left">
                {[
                  'Unlimited students',
                  'Unlimited teachers', 
                  'Weekly video reports',
                  'Photo documentation',
                  'Full curriculum access',
                  'Parent portal',
                  '14 learning games',
                  'WeChat integration',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="text-emerald-200">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              
              <a 
                href="#signup"
                className="inline-block px-8 py-4 bg-white text-emerald-600 text-lg font-bold rounded-xl hover:bg-emerald-50 transition shadow-xl"
              >
                Start Free Trial →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY SECTION */}
      <section id="security" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
              <span>🔒</span>
              <span>Enterprise-grade security</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Your data is protected</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Student privacy is our top priority. We use industry-standard security to keep your data safe.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { 
                icon: '🔐', 
                title: 'Encrypted Data', 
                desc: 'All data encrypted in transit (HTTPS) and at rest (AES-256)' 
              },
              { 
                icon: '👥', 
                title: 'Role-Based Access', 
                desc: 'Parents only see their own children. Teachers only see their classes.' 
              },
              { 
                icon: '🔑', 
                title: 'Secure Authentication', 
                desc: 'Passwords hashed with bcrypt. Secure session tokens.' 
              },
              { 
                icon: '🚫', 
                title: 'No Data Selling', 
                desc: 'Student data is never sold, shared, or used for advertising.' 
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center border border-gray-100">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Infrastructure badges */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-8 border border-slate-200">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="text-center md:text-left">
                <h3 className="font-bold text-gray-900 text-lg mb-2">Trusted Infrastructure</h3>
                <p className="text-gray-600 text-sm">
                  Hosted on Supabase &amp; AWS — the same infrastructure trusted by thousands of companies worldwide.
                </p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4">
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">🛡️ Supabase</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">☁️ AWS</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">🔒 Row Level Security</span>
                </div>
              </div>
              
              <div className="text-center md:text-right">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                  <span>✓</span>
                  <span>SOC 2 compliant infrastructure</span>
                </div>
              </div>
            </div>
          </div>

          {/* Photo security callout */}
          <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-200">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📸</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Photo &amp; Media Protection</h3>
                <p className="text-gray-600 text-sm">
                  Student photos are stored securely with access controls. They&apos;re never publicly accessible — 
                  parents only see photos of their own children, and photos are never shared with third parties.
                </p>
              </div>
            </div>
          </div>

          {/* Contact for security */}
          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Questions about security? Contact us at{' '}
              <span className="text-emerald-600 font-medium">security@teacherpotato.xyz</span>
            </p>
          </div>
        </div>
      </section>

      {/* DEMO SECTION */}
      <section id="demo" className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Try it yourself</h2>
          <p className="text-xl text-gray-600 mb-10">No signup required. See exactly what teachers and parents see.</p>
          
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link 
              href="/montree/dashboard"
              className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-emerald-400 transition-all hover:shadow-xl group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition">👩‍🏫</div>
              <div className="text-xl font-bold text-gray-900 mb-1">Teacher View</div>
              <div className="text-gray-500">Track progress, capture photos</div>
            </Link>
            
            <Link 
              href="/games"
              className="bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-emerald-400 transition-all hover:shadow-xl group"
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition">🎮</div>
              <div className="text-xl font-bold text-gray-900 mb-1">Learning Games</div>
              <div className="text-gray-500">14 curriculum-aligned games</div>
            </Link>
          </div>
        </div>
      </section>

      {/* SIGNUP FORM */}
      <section id="signup" className="py-20 bg-gradient-to-br from-emerald-600 to-cyan-600">
        <div className="max-w-xl mx-auto px-4">
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            {!submitted ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Start your free trial</h2>
                <p className="text-gray-500 text-center mb-8">14 days free. No credit card required.</p>
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
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                      ⚠️ {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition text-lg disabled:bg-emerald-400 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                  >
                    {loading ? 'Setting up...' : 'Start Free Trial →'}
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
                  href="/montree/dashboard"
                  className="inline-block px-8 py-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-semibold"
                >
                  Go to Dashboard →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
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
