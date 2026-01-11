'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function WelcomeContent() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true';
  const schoolName = searchParams.get('school') || 'Your School';
  const [loading, setLoading] = useState(!isDemo);

  useEffect(() => {
    // If we have a session_id, verify the payment was successful
    const sessionId = searchParams.get('session_id');
    if (sessionId && !isDemo) {
      // In production, verify the session with Stripe
      // For now, just show success
      setLoading(false);
    }
  }, [searchParams, isDemo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up your school...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Montree!
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {isDemo ? (
              <>Your demo account for <strong>{schoolName}</strong> is ready!</>
            ) : (
              <>Your 14-day free trial has started!</>
            )}
          </p>

          {isDemo && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>Demo Mode:</strong> Stripe is not configured yet. 
                When you're ready to accept payments, add your Stripe keys to the environment variables.
              </p>
            </div>
          )}

          <div className="bg-emerald-50 rounded-xl p-6 mb-8">
            <h2 className="font-bold text-emerald-800 mb-3">Your School Details</h2>
            <div className="text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">School:</span>
                <span className="font-medium">{schoolName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">School ($29/month)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Trial ends:</span>
                <span className="font-medium">
                  {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">Get Started in 3 Steps</h2>
          
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Add Your Teachers</h3>
                <p className="text-gray-600 text-sm">
                  Teachers can log in with any name and the password "123" to start tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Add Students</h3>
                <p className="text-gray-600 text-sm">
                  Add students in the classroom view and assign them to teachers.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Start Tracking Progress</h3>
                <p className="text-gray-600 text-sm">
                  Use the 342 Montessori works to track each child's learning journey.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/teacher"
            className="bg-emerald-600 text-white text-center py-4 px-6 rounded-xl font-semibold hover:bg-emerald-700 transition"
          >
            👩‍🏫 Open Teacher Portal
          </Link>
          <Link
            href="/admin/teacher-students"
            className="bg-white text-gray-700 text-center py-4 px-6 rounded-xl font-semibold hover:bg-gray-50 transition border-2 border-gray-200"
          >
            ⚙️ Admin Setup
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Need help? Email us at <a href="mailto:support@teacherpotato.xyz" className="text-emerald-600 hover:underline">support@teacherpotato.xyz</a></p>
        </div>
      </div>
    </div>
  );
}

// Wrapper with Suspense for useSearchParams
export default function WelcomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <WelcomeContent />
    </Suspense>
  );
}
