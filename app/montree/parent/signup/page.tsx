'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function SignupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to parent portal with code if provided
    const code = searchParams.get('code');
    if (code) {
      router.push(`/montree/parent?code=${code}`);
    } else {
      router.push('/montree/parent');
    }
  }, [router, searchParams]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
      <div className="animate-pulse text-4xl mb-4">🌳</div>
      <p className="text-gray-500">Redirecting...</p>
    </div>
  );
}

export default function ParentSignupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
      <Suspense fallback={
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="animate-pulse text-4xl mb-4">🌳</div>
          <p className="text-gray-500">Loading...</p>
        </div>
      }>
        <SignupRedirect />
      </Suspense>
    </div>
  );
}
